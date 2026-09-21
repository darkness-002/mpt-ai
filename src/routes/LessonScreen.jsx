import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  CheckCircleIcon,
  CloseIcon,
  LightbulbIcon,
  NotesIcon,
  SlashIcon,
  StarIcon,
  XCircleIcon,
} from '../components/icons.jsx'
import QuestionTTS from '../components/QuestionTTS.jsx'
import NoteModal from '../components/NoteModal.jsx'
import { useContent } from '../content/contentContext.js'
import { calculateScore, explainQuestion, keyNoteQuestion } from '../data/curriculum.js'
import { feedbackService } from '../lib/feedback.js'
import { shuffle } from '../lib/shuffle.js'
import { bookmarksStore } from '../storage/bookmarksStore.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { notesStore } from '../storage/notesStore.js'
import { streakStore } from '../storage/streakStore.js'
import { useProgress } from '../storage/progressContext.js'
import './LessonScreen.css'

const CHOICE_KEYS = ['1', '2', '3', '4', 'a', 'b', 'c', 'd', 'A', 'B', 'C', 'D']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** Mounted with key={lessonId}, so every lesson starts from clean state. */
export default function LessonScreen({ lessonId }) {
  const navigate = useNavigate()
  const progress = useProgress()
  const { getLesson, getNextLesson, getTrack } = useContent()
  const lesson = getLesson(lessonId)
  const track = lesson ? getTrack(lesson.trackId) : null
  const negativeMarking = track?.blueprint?.negativeMarking ?? 0

  // Questions are re-ordered per attempt so a repeat run is not recall of position.
  const [questions, setQuestions] = useState(() => (lesson ? shuffle(lesson.questions) : []))

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [eliminated, setEliminated] = useState({})
  const [checked, setChecked] = useState(false)
  const [answers, setAnswers] = useState([])
  const [finished, setFinished] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [hasNote, setHasNote] = useState(false)
  const headingRef = useRef(null)

  const question = questions[index]
  const isLast = index === questions.length - 1
  const scoreDetails = calculateScore(answers, negativeMarking)
  const score = scoreDetails.netScore

  useEffect(() => {
    if (!question) return
    let active = true
    bookmarksStore.isBookmarked(question.id).then((is) => {
      if (active) setBookmarked(is)
    })
    notesStore.getNote(question.id).then((text) => {
      if (active) setHasNote(Boolean(text))
    })
    return () => {
      active = false
    }
  }, [question])

  const toggleBookmark = async () => {
    if (!question) return
    const newState = await bookmarksStore.toggleBookmark(question, {
      trackId: lesson?.trackId,
      unitId: lesson?.unitId,
    })
    setBookmarked(newState)
  }

  const toggleEliminate = (choiceIndex) => {
    setEliminated((prev) => ({
      ...prev,
      [choiceIndex]: !prev[choiceIndex],
    }))
  }

  const check = () => {
    if (selected === null || checked || !question) return
    const isCorrect = selected === question.answer
    setChecked(true)
    setAnswers((prev) => [...prev, { question, choice: selected, correct: isCorrect }])

    // Coordinated feedback
    if (isCorrect) {
      feedbackService.onCorrect()
      mistakesStore.recordReviewResult(question.id, true)
    } else {
      feedbackService.onWrong()
      mistakesStore.recordMistake(question, { trackId: lesson?.trackId, unitId: lesson?.unitId })
    }
  }

  const advance = () => {
    if (!checked) return
    if (isLast) {
      // Record attempt and update daily streak
      const finalScoreDetails = calculateScore(answers, negativeMarking)
      progress.recordAttempt(lesson.id, {
        score: Math.round(finalScoreDetails.netScore),
        total: questions.length,
      })
      streakStore.recordAnswers(questions.length)
      setFinished(true)

      // Celebrate if high score / mastery
      if (finalScoreDetails.netScore >= questions.length * 0.8) {
        feedbackService.celebrate()
      }
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setEliminated({})
    setChecked(false)
  }

  const restart = () => {
    setQuestions(shuffle(lesson.questions))
    setIndex(0)
    setSelected(null)
    setEliminated({})
    setChecked(false)
    setAnswers([])
    setFinished(false)
  }

  const handlersRef = useRef({ check, advance, checked, question, eliminated })

  useEffect(() => {
    handlersRef.current = { check, advance, checked, question, eliminated }
  })

  useEffect(() => {
    if (finished) return undefined
    const onKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return
      const {
        check: doCheck,
        advance: doAdvance,
        checked: isChecked,
        question: q,
        eliminated: elim,
      } = handlersRef.current
      if (CHOICE_KEYS.includes(event.key) && !isChecked) {
        let i = -1
        if (['1', '2', '3', '4'].includes(event.key)) {
          i = Number(event.key) - 1
        } else {
          i = ['a', 'b', 'c', 'd'].indexOf(event.key.toLowerCase())
        }
        if (i >= 0 && i < (q?.choices.length ?? 0) && !elim[i]) {
          setSelected(i)
        }
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (isChecked) doAdvance()
        else doCheck()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [finished])

  if (!lesson) return <Navigate to="/" replace />
  if (!progress.ready) return <div className="lesson lesson--loading">Loading…</div>
  if (!progress.isUnlocked(lesson.id)) return <Navigate to="/" replace />

  const BACK = `/track/${lesson.trackId}`

  if (finished) {
    const missed = answers.filter((a) => !a.correct)
    const next = getNextLesson(lesson.id)
    return (
      <div className="lesson" style={{ '--hue': lesson.hue }}>
        <div className="results">
          <ScoreRing score={score} total={questions.length} />
          <h1>
            {score === questions.length
              ? 'Flawless — lesson mastered.'
              : score >= questions.length * 0.6
                ? 'Lesson complete.'
                : 'Lesson complete — worth another run.'}
          </h1>
          <p className="results__score">
            {score} of {questions.length} marks
            {negativeMarking > 0 && (
              <small style={{ display: 'block', marginTop: '0.25rem', opacity: 0.8 }}>
                ({scoreDetails.correct} correct, {scoreDetails.wrong} wrong · -{scoreDetails.marksDeducted} negative marking)
              </small>
            )}
          </p>

          {missed.length > 0 && (
            <section className="review">
              <h2>Review what you missed</h2>
              <ul>
                {missed.map(({ question: q, choice }) => (
                  <li key={q.id}>
                    <p className={`review__prompt${lesson.rtl ? ' urdu' : ''}`} dir={lesson.rtl ? 'rtl' : 'ltr'}>
                      {q.prompt}
                    </p>
                    <p className={`review__wrong${lesson.rtl ? ' urdu' : ''}`} dir={lesson.rtl ? 'rtl' : 'ltr'}>
                      You chose: {q.choices[choice]}
                    </p>
                    <p className={`review__right${lesson.rtl ? ' urdu' : ''}`} dir={lesson.rtl ? 'rtl' : 'ltr'}>
                      Correct: {q.choices[q.answer]}
                    </p>
                    {explainQuestion(q) && <p className="review__why">{explainQuestion(q)}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="results__actions">
            <button className="btn" type="button" onClick={() => navigate(BACK)}>
              Back to the path
            </button>
            <button className="btn btn--ghost" type="button" onClick={restart}>
              Practise again
            </button>
            {next && progress.isUnlocked(next.id) && (
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => navigate(`/lesson/${next.id}`)}
              >
                Next lesson: {next.title}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const answeredCorrectly = checked && selected === question.answer
  const explanation = explainQuestion(question)
  const provenance = keyNoteQuestion(question)

  return (
    <div className="lesson" style={{ '--hue': lesson.hue }}>
      <header className="lesson__bar">
        <Link className="lesson__close" to={`/track/${lesson.trackId}`} aria-label="Leave lesson">
          <CloseIcon width="22" height="22" />
        </Link>
        <div className="lesson__progress" role="img" aria-label={`Question ${index + 1} of ${questions.length}`}>
          <span style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
        <button
          type="button"
          className={`icon-btn${bookmarked ? ' is-bookmarked' : ''}`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          onClick={toggleBookmark}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
        >
          <StarIcon width="20" height="20" />
        </button>
        <span className="lesson__count">
          {index + 1}/{questions.length}
        </span>
      </header>

      <main className="lesson__body">
        <div className="lesson__unit-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <p className="lesson__unit" style={{ margin: 0 }}>
            {lesson.trackTitle} · {lesson.unitTitle}
          </p>
          <div className="q-action-bar" style={{ margin: 0 }}>
            <QuestionTTS question={question} />
            <button
              type="button"
              className={`note-btn ${hasNote ? 'has-note' : ''}`}
              onClick={() => setShowNoteModal(true)}
              title="Add or view question study note"
            >
              <NotesIcon width="14" height="14" />
              <span>{hasNote ? 'Note' : '+Note'}</span>
            </button>
          </div>
        </div>
        {question.directive && <p className="lesson__directive">{question.directive}</p>}
        <h1
          className={`lesson__prompt${lesson.rtl ? ' urdu' : ''}`}
          dir={lesson.rtl ? 'rtl' : 'ltr'}
          tabIndex={-1}
          ref={headingRef}
        >
          {question.prompt}
        </h1>

        {/* UPSC/CSS-style items: stem, statement list, closing ask */}
        {question.statements && question.statements.length > 0 && (
          <ol className="statements">
            {question.statements.map((statement, i) => (
              <li key={statement}>
                <span className="statements__mark">{ROMAN[i] ?? i + 1}</span>
                <span>{statement}</span>
              </li>
            ))}
          </ol>
        )}
        {question.closing && <p className="lesson__closing">{question.closing}</p>}

        <ul className="choices">
          {question.choices.map((choice, i) => {
            const isSelected = selected === i
            const isAnswer = i === question.answer
            const isStruck = Boolean(eliminated[i])
            let tone = ''
            if (checked && isAnswer) tone = ' choice--correct'
            else if (checked && isSelected && !isAnswer) tone = ' choice--wrong'
            else if (isSelected) tone = ' choice--selected'
            if (isStruck) tone += ' choice--eliminated'

            const letter = LETTERS[i] ?? `${i + 1}`

            return (
              <li key={choice} className="choice-row">
                <button
                  type="button"
                  className={`choice${tone}${lesson.rtl ? ' urdu' : ''}`}
                  dir={lesson.rtl ? 'rtl' : 'ltr'}
                  onClick={() => !checked && !isStruck && setSelected(i)}
                  aria-pressed={isSelected}
                  disabled={checked || isStruck}
                >
                  <span className="choice__key">{letter}</span>
                  <span className="choice__text">{choice}</span>
                  {checked && isAnswer && (
                    <span className="choice__status-icon choice__status-icon--correct">
                      <CheckCircleIcon width="20" height="20" />
                    </span>
                  )}
                  {checked && isSelected && !isAnswer && (
                    <span className="choice__status-icon choice__status-icon--wrong">
                      <XCircleIcon width="20" height="20" />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`strike-toggle${isStruck ? ' is-struck' : ''}`}
                  aria-label={isStruck ? 'Restore option' : 'Eliminate option'}
                  title={isStruck ? 'Restore option' : 'Eliminate option'}
                  onClick={() => toggleEliminate(i)}
                  disabled={checked}
                >
                  <SlashIcon width="16" height="16" />
                </button>
              </li>
            )
          })}
        </ul>
      </main>

      <footer className={`lesson__footer${checked ? (answeredCorrectly ? ' is-correct' : ' is-wrong') : ''}`}>
        {checked && (
          <div className="feedback-drawer">
            <div className="feedback-drawer__status">
              {answeredCorrectly ? (
                <div className="status-badge status-badge--correct">
                  <CheckCircleIcon width="24" height="24" />
                  <span>Correct! Excellent.</span>
                </div>
              ) : (
                <div className="status-badge status-badge--wrong">
                  <XCircleIcon width="24" height="24" />
                  <span>Incorrect Answer</span>
                </div>
              )}
            </div>

            {!answeredCorrectly && (
              <div className="answer-comparison">
                <div className="comparison-box comparison-box--wrong">
                  <span className="comparison-label">You Picked</span>
                  <span className={`comparison-text${lesson.rtl ? ' urdu' : ''}`} dir={lesson.rtl ? 'rtl' : 'ltr'}>
                    {question.choices[selected]}
                  </span>
                </div>
                <div className="comparison-box comparison-box--correct">
                  <span className="comparison-label">Correct Answer</span>
                  <span className={`comparison-text${lesson.rtl ? ' urdu' : ''}`} dir={lesson.rtl ? 'rtl' : 'ltr'}>
                    {question.choices[question.answer]}
                  </span>
                </div>
              </div>
            )}

            {explanation && (
              <div className="explanation-card">
                <div className="explanation-card__header">
                  <LightbulbIcon width="18" height="18" />
                  <span>Explanation & Context</span>
                </div>
                <p
                  className={`explanation-card__text${lesson.rtl ? ' urdu' : ''}`}
                  dir={lesson.rtl ? 'rtl' : 'ltr'}
                >
                  {explanation}
                </p>
                {provenance && (
                  <span className="explanation-card__provenance">
                    {provenance}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <button
          className={`btn btn--wide ${checked && !answeredCorrectly ? 'btn--continue-wrong' : ''}`}
          type="button"
          onClick={checked ? advance : check}
          disabled={selected === null}
        >
          {checked ? (isLast ? 'Finish Lesson' : 'Continue') : 'Check Answer'}
        </button>
      </footer>

      {showNoteModal && (
        <NoteModal
          isOpen={showNoteModal}
          onClose={() => {
            setShowNoteModal(false)
            if (question) {
              notesStore.getNote(question.id).then((text) => setHasNote(Boolean(text)))
            }
          }}
          question={question}
        />
      )}
    </div>
  )
}

function ScoreRing({ score, total }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const pct = total === 0 ? 0 : Math.max(0, Math.min(1, score / total))
  return (
    <svg className="ring" viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <circle className="ring__track" cx="60" cy="60" r={radius} />
      <circle
        className="ring__value"
        cx="60"
        cy="60"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
      />
      <text x="60" y="68" textAnchor="middle" className="ring__label">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}
