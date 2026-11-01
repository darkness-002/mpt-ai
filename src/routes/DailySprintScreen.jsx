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
import MCQCard from '../components/MCQCard.jsx'
import NoteModal from '../components/NoteModal.jsx'
import StreakPill from '../components/StreakPill.jsx'
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
  const [streakData] = useState(() => streakStore.load())

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [eliminatedChoices, setEliminatedChoices] = useState({})
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

  const handleToggleEliminate = (choiceIndex) => {
    setEliminatedChoices((prev) => ({
      ...prev,
      [choiceIndex]: !prev[choiceIndex],
    }))
  }

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
    setEliminatedChoices({})
    setIsChecked(false)
  }

  return (
    <div className="daily-page">
      <div className="daily-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum Desk</span>
        </Link>
        <div className="daily-title-row">
          <div className="daily-title-wrap">
            <SparklesIcon width="24" height="24" style={{ color: 'var(--gold-text)' }} />
            <h1>Daily 10-MCQ Sprint</h1>
          </div>
          <div className="flex items-center gap-2">
            <StreakPill count={streakData.currentStreak} compact />
            <span className="daily-date-badge font-mono">{todayKey}</span>
          </div>
        </div>
        <p className="daily-subtitle">
          A fresh, curated 10-question sprint generated every 24 hours to keep your daily study streak sharp.
        </p>
      </div>

      {completedRecord ? (
        <div className="daily-summary-card">
          <div className="daily-summary__badge" aria-hidden="true">
            <TrophyIcon width="40" height="40" style={{ color: 'var(--gold-text)' }} />
          </div>
          <h2>Today&apos;s Sprint Completed!</h2>
          <p className="daily-summary__score">
            You scored <strong className="font-mono">{completedRecord.score}</strong> / {completedRecord.total}
          </p>

          <div className="daily-summary__metrics">
            <div className="metric-box">
              <span className="metric-label">Accuracy</span>
              <strong className="metric-val font-mono">
                {Math.round((completedRecord.score / completedRecord.total) * 100)}%
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">Daily Streak</span>
              <strong className="metric-val font-mono text-[var(--amber-text)]">
                Active
              </strong>
            </div>
            <div className="metric-box">
              <span className="metric-label">Status</span>
              <strong className="metric-val text-[var(--green-text)]">Done for Today</strong>
            </div>
          </div>

          {/* Today's review list */}
          {completedRecord.answers && (
            <div className="daily-review-wrap text-left my-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
                Sprint Review ({completedRecord.answers.length} items)
              </h3>
              <div className="flex flex-col gap-2.5">
                {completedRecord.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border ${
                      ans.correct
                        ? 'border-[rgba(22,163,74,0.3)] bg-[var(--green-subtle)]'
                        : 'border-[rgba(220,38,38,0.3)] bg-[var(--red-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-bold mb-1">
                      <span>Q{idx + 1}</span>
                      <span className={ans.correct ? 'text-[var(--green-text)]' : 'text-[var(--red-text)]'}>
                        {ans.correct ? 'Correct (+1.00)' : 'Missed'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--text)] line-clamp-2">
                      {ans.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="daily-summary__actions">
            <Link to="/drill" className="btn btn--primary">
              Continue with Custom Drill →
            </Link>
            <Link to="/" className="btn btn--ghost">
              Back to Curriculum
            </Link>
          </div>
        </div>
      ) : dailyQuestions.length === 0 ? (
        <div className="daily-loading">Preparing today&apos;s sprint questions…</div>
      ) : (
        <div className="daily-quiz-stage">
          {/* Progress Ribbon */}
          <div className="daily-progress-row">
            <span className="font-mono text-xs text-[var(--muted)]">
              Question <strong>{currentIndex + 1}</strong> of {dailyQuestions.length}
            </span>
            <div className="daily-meter" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={dailyQuestions.length}>
              <div
                className="daily-meter__fill"
                style={{ width: `${Math.round(((currentIndex + 1) / dailyQuestions.length) * 100)}%` }}
              />
            </div>
          </div>

          {/* MCQ Card Surface */}
          <MCQCard
            question={currentQ}
            selectedChoice={selectedChoice}
            eliminatedChoices={eliminatedChoices}
            checked={isChecked}
            bookmarked={false}
            hasNote={false}
            penalty={0}
            onSelectChoice={(idx) => !isChecked && setSelectedChoice(idx)}
            onToggleEliminate={handleToggleEliminate}
            onOpenNotes={() => setNoteModalQuestion(currentQ)}
            explanation={currentQ.explanation}
            unitLabel={`${currentQ.trackTitle} • ${currentQ.unitTitle}`}
          />

          {/* Check / Continue Action Dock */}
          <div className="daily-action-dock">
            <button
              className="btn btn--primary btn--wide"
              type="button"
              onClick={isChecked ? handleAdvance : handleCheck}
              disabled={selectedChoice === null}
            >
              {isChecked ? (isLast ? 'Complete Daily Sprint' : 'Next Question →') : 'Check Answer'}
            </button>
          </div>
        </div>
      )}

      {noteModalQuestion && (
        <NoteModal
          isOpen={Boolean(noteModalQuestion)}
          onClose={() => setNoteModalQuestion(null)}
          question={noteModalQuestion}
        />
      )}
    </div>
  )
}
