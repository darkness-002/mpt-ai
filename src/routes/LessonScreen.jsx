import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  CloseIcon,
  BookmarkStarIcon,
  CheckCircleIcon,
  SparklesIcon,
  RotateCcwIcon,
  ZapIcon,
} from '../components/icons.jsx'
import MCQCard from '../components/MCQCard.jsx'
import NoteModal from '../components/NoteModal.jsx'
import { useContent } from '../content/contentContext.js'
import { calculateScore, explainQuestion, keyNoteQuestion } from '../data/curriculum.js'
import { feedbackService } from '../lib/feedback.js'
import { shuffle } from '../lib/shuffle.js'
import { bookmarksStore } from '../storage/bookmarksStore.js'
import { notesStore } from '../storage/notesStore.js'
import { useProgress } from '../storage/progressContext.js'
import { streakStore } from '../storage/streakStore.js'
import './LessonScreen.css'

const CHOICE_KEYS = ['1', '2', '3', '4', 'a', 'b', 'c', 'd', 'A', 'B', 'C', 'D']

export default function LessonScreen() {
  const { lessonId } = useParams()
  const { getLesson, getNextLesson } = useContent()
  const lesson = getLesson(lessonId)
  const next = getNextLesson(lessonId)
  const progress = useProgress()
  const navigate = useNavigate()

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

  const question = questions[index]
  const isLast = index === questions.length - 1

  // Bookmark check
  useEffect(() => {
    if (!question) return
    let active = true
    bookmarksStore.isBookmarked(question.id).then((bm) => {
      if (active) setBookmarked(bm)
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
    if (bookmarked) {
      await bookmarksStore.remove(question.id)
      setBookmarked(false)
    } else {
      await bookmarksStore.add(question, {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        trackId: lesson.trackId,
        trackTitle: lesson.trackTitle,
      })
      setBookmarked(true)
    }
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
    setAnswers((prev) => [...prev, { choice: selected, correct: isCorrect }])

    if (isCorrect) {
      feedbackService.onCorrect()
    } else {
      feedbackService.onWrong()
    }
  }

  const advance = () => {
    if (!checked) return
    if (isLast) {
      const finalAnswers = answers
      const correctCount = finalAnswers.filter((a) => a.correct).length
      const finalScoreDetails = calculateScore(finalAnswers, 0)

      progress.recordScore(lesson.id, {
        score: correctCount,
        netScore: finalScoreDetails.netScore,
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

  // Keyboard shortcut listener
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
        if (i >= 0 && i < (q?.choices?.length ?? 0) && !elim[i]) {
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
  if (!progress.ready) {
    return (
      <div className="lesson lesson--loading" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p className="text-sm font-semibold text-[var(--muted)]">Loading lesson runner…</p>
      </div>
    )
  }
  if (!progress.isUnlocked(lesson.id)) return <Navigate to="/" replace />

  const BACK = `/track/${lesson.trackId}`

  // Completion Screen
  if (finished) {
    const finalScoreDetails = calculateScore(answers, 0)
    const correctCount = answers.filter((a) => a.correct).length
    const pct = Math.round((correctCount / questions.length) * 100)
    const isMastered = correctCount === questions.length

    return (
      <div className="lesson lesson--finished" style={{ '--hue': lesson.hue }}>
        <div className="completion-card">
          <div className="completion-icon-wrap" aria-hidden="true">
            {isMastered ? (
              <SparklesIcon width="48" height="48" style={{ color: 'var(--gold-text)' }} />
            ) : (
              <CheckCircleIcon width="48" height="48" style={{ color: 'var(--green-text)' }} />
            )}
          </div>

          <span className="completion-pill font-mono">
            {isMastered ? 'Lesson Mastered ★' : 'Lesson Complete'}
          </span>

          <h1 className="completion-title">
            {isMastered ? 'Flawless Score!' : pct >= 70 ? 'Great Practice!' : 'Keep Going!'}
          </h1>
          <p className="completion-subtitle">
            You scored <strong className="font-mono">{correctCount}</strong> out of <strong className="font-mono">{questions.length}</strong> questions ({pct}%).
          </p>

          <div className="completion-stats-grid">
            <div className="c-stat-box">
              <span className="c-stat-lbl">Correct</span>
              <strong className="c-stat-val font-mono text-[var(--green-text)]">+{correctCount}</strong>
            </div>
            <div className="c-stat-box">
              <span className="c-stat-lbl">Accuracy</span>
              <strong className="c-stat-val font-mono">{pct}%</strong>
            </div>
            <div className="c-stat-box">
              <span className="c-stat-lbl">Mistakes</span>
              <strong className="c-stat-val font-mono text-[var(--red-text)]">
                {questions.length - correctCount}
              </strong>
            </div>
          </div>

          <div className="completion-actions-stack">
            {next && progress.isUnlocked(next.id) ? (
              <button
                className="btn btn--primary btn--wide"
                type="button"
                onClick={() => navigate(`/lesson/${next.id}`)}
              >
                Next Lesson: {next.title} →
              </button>
            ) : (
              <Link className="btn btn--primary btn--wide" to={BACK}>
                Back to Syllabus Path →
              </Link>
            )}

            <button className="btn btn--ghost btn--wide" type="button" onClick={restart}>
              <RotateCcwIcon width="16" height="16" />
              <span>Practise Again</span>
            </button>
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
      {/* Immersive Top Bar: Exit, Progress, Bookmark, Monospace Counter */}
      <header className="lesson__bar">
        <Link className="lesson__close" to={BACK} aria-label="Leave lesson and return to syllabus">
          <CloseIcon width="20" height="20" />
        </Link>
        <div
          className="lesson__progress"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-label={`Question ${index + 1} of ${questions.length}`}
        >
          <span style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
        <button
          type="button"
          className={`icon-btn bookmark-btn ${bookmarked ? 'is-bookmarked' : ''}`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          onClick={toggleBookmark}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
        >
          <BookmarkStarIcon width="20" height="20" />
        </button>
        <span className="lesson__count font-mono">
          {index + 1}/{questions.length}
        </span>
      </header>

      {/* Main MCQ Card Surface */}
      <main className="lesson__body">
        <MCQCard
          question={question}
          selectedChoice={selected}
          eliminatedChoices={eliminated}
          checked={checked}
          bookmarked={bookmarked}
          hasNote={hasNote}
          penalty={0} // CSS MPT has no negative marking
          onSelectChoice={(idx) => !checked && setSelected(idx)}
          onToggleEliminate={toggleEliminate}
          onToggleBookmark={toggleBookmark}
          onOpenNotes={() => setShowNoteModal(true)}
          explanation={explanation}
          provenance={provenance}
          unitLabel={`${lesson.trackTitle} · ${lesson.unitTitle}`}
        />
      </main>

      {/* Sticky Check / Continue Thumb Dock (Lower half ergonomics on mobile) */}
      <footer className="lesson__footer">
        <button
          className={`btn btn--wide ${checked && !answeredCorrectly ? 'btn--continue-wrong' : 'btn--primary'}`}
          type="button"
          onClick={checked ? advance : check}
          disabled={selected === null}
        >
          {checked ? (isLast ? 'Finish Lesson' : 'Continue (Enter)') : 'Check Answer (Enter)'}
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
