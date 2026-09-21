import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  FlameIcon,
  SparklesIcon,
  TrophyIcon,
  XCircleIcon,
  NotesIcon,
} from '../components/icons.jsx'
import QuestionTTS from '../components/QuestionTTS.jsx'
import NoteModal from '../components/NoteModal.jsx'
import { useContent } from '../content/contentContext.js'
import { dailyStore } from '../storage/dailyStore.js'
import { streakStore } from '../storage/streakStore.js'
import { feedbackService } from '../lib/feedback.js'
import './DailySprintScreen.css'

// Deterministic seed PRNG based on today's date string
function pseudoRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export default function DailySprintScreen() {
  const { tracks } = useContent()
  const todayKey = dailyStore.getTodayKey()
  const [completedRecord, setCompletedRecord] = useState(() => dailyStore.getToday())

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [answers, setAnswers] = useState([])
  const [isChecked, setIsChecked] = useState(false)
  const [startTime] = useState(() => Date.now())
  const [noteModalQuestion, setNoteModalQuestion] = useState(null)

  // Deterministically select 10 questions for today
  const dailyQuestions = useMemo(() => {
    const all = tracks.flatMap((t) =>
      t.units.flatMap((u) =>
        u.lessons.flatMap((l) =>
          l.questions.map((q) => ({
            ...q,
            trackTitle: t.title,
            unitTitle: u.title,
            rtl: u.rtl,
          })),
        ),
      ),
    )
    if (all.length === 0) return []

    const rng = pseudoRandom(`mpt-daily-${todayKey}`)
    const shuffled = [...all].sort(() => rng() - 0.5)
    return shuffled.slice(0, 10)
  }, [tracks, todayKey])

  const currentQ = dailyQuestions[currentIndex]
  const isLast = currentIndex === dailyQuestions.length - 1

  const handleCheck = () => {
    if (selectedChoice === null || isChecked || !currentQ) return
    const isCorrect = selectedChoice === currentQ.answer
    setIsChecked(true)
    setAnswers((prev) => [...prev, { question: currentQ, choice: selectedChoice, correct: isCorrect }])

    if (isCorrect) {
      feedbackService.onCorrect()
    } else {
      feedbackService.onWrong()
    }
  }

  const handleAdvance = () => {
    if (!isChecked) return
    if (isLast) {
      const finalAnswers = answers
      const correctCount = finalAnswers.filter((a) => a.correct).length
      const elapsedMs = Date.now() - startTime

      const record = dailyStore.recordToday({
        score: correctCount,
        total: dailyQuestions.length,
        timeSpentMs: elapsedMs,
        answers: finalAnswers.map((a) => ({
          questionId: a.question.id,
          prompt: a.question.prompt,
          choice: a.choice,
          correct: a.correct,
          answer: a.question.answer,
          explanation: a.question.explanation,
        })),
      })

      streakStore.recordAnswers(dailyQuestions.length)
      setCompletedRecord(record)

      if (correctCount >= 8) {
        feedbackService.celebrate()
      }
      return
    }

    setCurrentIndex((i) => i + 1)
    setSelectedChoice(null)
    setIsChecked(false)
  }

  return (
    <div className="daily-page">
      <div className="daily-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum</span>
        </Link>
        <div className="daily-title-row">
          <div className="daily-title-wrap">
            <SparklesIcon width="24" height="24" style={{ color: 'var(--gold)' }} />
            <h1>Daily 10-MCQ Sprint</h1>
          </div>
          <span className="daily-date-badge">{todayKey}</span>
        </div>
        <p className="daily-subtitle">
          A fresh, curated 10-question sprint generated every 24 hours to keep your daily study streak sharp.
        </p>
      </div>

      {completedRecord ? (
        <div className="daily-summary-card">
          <div className="daily-summary__badge">
            <TrophyIcon width="42" height="42" style={{ color: 'var(--gold)' }} />
          </div>
          <h2>Today&apos;s Sprint Completed!</h2>
          <p className="daily-summary__score">
            You scored <strong>{completedRecord.score}</strong> / {completedRecord.total}
          </p>

          <div className="daily-summary__metrics">
            <div className="metric-box">
              <span className="metric-label">Accuracy</span>
              <strong className="metric-val">
                {Math.round((completedRecord.score / completedRecord.total) * 100)}%
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">Daily Streak</span>
              <strong className="metric-val">
                <FlameIcon width="16" height="16" style={{ color: 'var(--gold)' }} /> Active
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">Status</span>
              <strong className="metric-val stat-green">Done for Today</strong>
            </div>
          </div>

          <div className="daily-summary__actions">
            <Link to="/drill" className="btn btn--primary">
              Continue with Custom Drill →
            </Link>
            <Link to="/flashcards" className="btn btn--ghost">
              Revise Flashcards
            </Link>
          </div>
        </div>
      ) : dailyQuestions.length === 0 ? (
        <div className="daily-loading">Preparing today&apos;s sprint questions…</div>
      ) : (
        <div className="daily-quiz-stage">
          {/* Progress Ribbon */}
          <div className="daily-progress-row">
            <span>
              Question <strong>{currentIndex + 1}</strong> of {dailyQuestions.length}
            </span>
            <div className="daily-meter">
              <div
                className="daily-meter__fill"
                style={{ width: `${Math.round(((currentIndex + 1) / dailyQuestions.length) * 100)}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="daily-q-card" dir={currentQ.rtl ? 'rtl' : 'ltr'}>
            <div className="daily-q-meta">
              <span className="q-badge">
                {currentQ.trackTitle} • {currentQ.unitTitle}
              </span>
              <div className="daily-q-tools">
                <QuestionTTS question={currentQ} />
                <button
                  type="button"
                  className="note-btn"
                  onClick={() => setNoteModalQuestion(currentQ)}
                  title="Add study note"
                >
                  <NotesIcon width="14" height="14" />
                  <span>+Note</span>
                </button>
              </div>
            </div>

            {currentQ.directive && <div className="q-directive">{currentQ.directive}</div>}

            <h2 className={`q-prompt ${currentQ.rtl ? 'urdu' : ''}`}>{currentQ.prompt}</h2>

            {currentQ.statements && (
              <div className="q-statements">
                {currentQ.statements.map((s, i) => (
                  <div key={i} className="statement-line">
                    {s}
                  </div>
                ))}
              </div>
            )}

            {/* Choices */}
            <div className="daily-choices-list">
              {currentQ.choices.map((choice, i) => {
                const isSelected = selectedChoice === i
                let choiceClass = 'choice-item'
                if (isSelected) choiceClass += ' is-selected'
                if (isChecked) {
                  if (i === currentQ.answer) choiceClass += ' is-correct'
                  else if (isSelected) choiceClass += ' is-wrong'
                }

                return (
                  <button
                    key={i}
                    type="button"
                    className={choiceClass}
                    onClick={() => !isChecked && setSelectedChoice(i)}
                    disabled={isChecked}
                  >
                    <span className="choice-marker">{String.fromCharCode(65 + i)}</span>
                    <span className="choice-text">{choice}</span>
                  </button>
                )
              })}
            </div>

            {/* Feedback & Explanation */}
            {isChecked && (
              <div className={`daily-feedback ${selectedChoice === currentQ.answer ? 'is-correct' : 'is-wrong'}`}>
                <div className="feedback-headline">
                  {selectedChoice === currentQ.answer ? (
                    <>
                      <CheckCircleIcon width="18" height="18" /> Correct!
                    </>
                  ) : (
                    <>
                      <XCircleIcon width="18" height="18" /> Incorrect. Correct Answer is Option{' '}
                      {String.fromCharCode(65 + currentQ.answer)}
                    </>
                  )}
                </div>
                {currentQ.explanation && (
                  <p className="feedback-explanation">{currentQ.explanation}</p>
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="daily-footer">
            {!isChecked ? (
              <button
                type="button"
                className="btn btn--primary btn--wide"
                onClick={handleCheck}
                disabled={selectedChoice === null}
              >
                Check Answer
              </button>
            ) : (
              <button type="button" className="btn btn--primary btn--wide" onClick={handleAdvance}>
                {isLast ? 'Complete Sprint' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
      )}

      {noteModalQuestion && (
        <NoteModal
          isOpen={!!noteModalQuestion}
          onClose={() => setNoteModalQuestion(null)}
          question={noteModalQuestion}
        />
      )}
    </div>
  )
}
