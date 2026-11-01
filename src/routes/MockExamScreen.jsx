import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  CloseIcon,
  ExamFlagIcon,
  MaximizeIcon,
  NotesIcon,
  SlashIcon,
  TimerIcon,
  CheckCircleIcon,
  RotateCcwIcon,
  SparklesIcon,
} from '../components/icons.jsx'
import QuestionTTS from '../components/QuestionTTS.jsx'
import NoteModal from '../components/NoteModal.jsx'
import OMRSheet from '../components/OMRSheet.jsx'
import PaletteButton from '../components/PaletteButton.jsx'
import { Modal, Button, Chip } from '../components/UIPrimitives.jsx'
import { useContent } from '../content/contentContext.js'
import { calculateScore, explainQuestion } from '../data/curriculum.js'
import { feedbackService } from '../lib/feedback.js'
import { shuffle } from '../lib/shuffle.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { streakStore } from '../storage/streakStore.js'
import './MockExamScreen.css'

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function MockExamScreen() {
  const { trackId } = useParams()
  const navigate = useNavigate()
  const { getTrack } = useContent()
  const track = getTrack(trackId)

  const blueprint = useMemo(
    () =>
      track?.blueprint ?? {
        totalMcqs: 100,
        minutes: 100,
        passingMarks: 40,
        negativeMarking: 0,
      },
    [track],
  )

  const sessionKey = `mpt_mock_session_${trackId}`

  // Aggregate questions across all units of the track or restore session
  const [allTrackQuestions] = useState(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.questions?.length > 0) return parsed.questions
      }
    } catch {
      // Ignore storage error
    }
    if (!track) return []
    const flat = track.units.flatMap((unit) =>
      unit.lessons.flatMap((lesson) =>
        lesson.questions.map((q) => ({
          ...q,
          unitId: unit.id,
          unitTitle: unit.title,
          rtl: unit.rtl,
        })),
      ),
    )
    const shuffled = shuffle(flat)
    return shuffled.slice(0, Math.min(flat.length, blueprint.totalMcqs))
  })

  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
      return saved.currentIndex ?? 0
    } catch {
      return 0
    }
  })

  const [selectedAnswers, setSelectedAnswers] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
      return saved.selectedAnswers ?? {}
    } catch {
      return {}
    }
  })

  const [flagged, setFlagged] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
      return saved.flagged ?? {}
    } catch {
      return {}
    }
  })

  const [eliminatedChoices, setEliminatedChoices] = useState({})
  const [paletteFilter, setPaletteFilter] = useState('all') // 'all' | 'unanswered' | 'flagged'
  const [submitted, setSubmitted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showMobilePalette, setShowMobilePalette] = useState(false)

  const unansweredIndices = useMemo(() => {
    const indices = []
    allTrackQuestions.forEach((_, idx) => {
      if (selectedAnswers[idx] === undefined) indices.push(idx)
    })
    return indices
  }, [allTrackQuestions, selectedAnswers])

  // Timer initialization with session restore
  const totalDurationMs = blueprint.minutes * 60 * 1000
  const [remainingMs, setRemainingMs] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
      if (saved.targetTime) {
        const diff = saved.targetTime - Date.now()
        if (diff > 0) return diff
      }
    } catch {
      // Fallback
    }
    return totalDurationMs
  })

  const targetTimeRef = useRef(0)
  const [reviewFilter, setReviewFilter] = useState('all')
  const [noteModalQuestion, setNoteModalQuestion] = useState(null)
  const [savedToMistakesMsg, setSavedToMistakesMsg] = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(sessionKey) || '{}')
      if (saved.targetTime && saved.targetTime > Date.now()) {
        targetTimeRef.current = saved.targetTime
        return
      }
    } catch {
      // ignore
    }
    targetTimeRef.current = Date.now() + totalDurationMs
  }, [totalDurationMs, sessionKey])

  // Persist session to sessionStorage
  useEffect(() => {
    if (submitted || allTrackQuestions.length === 0) return
    try {
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({
          questions: allTrackQuestions,
          currentIndex,
          selectedAnswers,
          flagged,
          targetTime: targetTimeRef.current,
        }),
      )
    } catch {
      // Storage full/blocked
    }
  }, [submitted, allTrackQuestions, currentIndex, selectedAnswers, flagged, sessionKey])

  const submitExam = useCallback(() => {
    setSubmitted(true)
    setShowConfirm(false)
    sessionStorage.removeItem(sessionKey)
  }, [sessionKey])

  // Timer countdown: auto-submit when reaches 0
  useEffect(() => {
    if (submitted) return undefined
    const timer = setInterval(() => {
      const diff = targetTimeRef.current - Date.now()
      if (diff <= 0) {
        setRemainingMs(0)
        clearInterval(timer)
        submitExam()
      } else {
        setRemainingMs(diff)
      }
    }, 500)
    return () => clearInterval(timer)
  }, [submitted, submitExam])

  // Record missed questions and update streak when submitted
  useEffect(() => {
    if (!submitted || allTrackQuestions.length === 0) return
    const answeredList = allTrackQuestions.map((q, idx) => ({
      question: q,
      choice: selectedAnswers[idx],
      correct: selectedAnswers[idx] === q.answer,
    }))

    streakStore.recordAnswers(answeredList.filter((a) => a.choice !== undefined).length)

    for (const item of answeredList) {
      if (item.correct) {
        mistakesStore.recordReviewResult(item.question.id, true)
      } else {
        mistakesStore.recordMistake(item.question, {
          trackId: track?.id,
          unitId: item.question.unitId,
        })
      }
    }
  }, [submitted, allTrackQuestions, selectedAnswers, track?.id])

  // Calculate results on submission
  const results = useMemo(() => {
    if (!submitted || !track) return null
    const answers = allTrackQuestions.map((q, idx) => ({
      correct: selectedAnswers[idx] === q.answer,
      unanswered: selectedAnswers[idx] === undefined,
    }))

    const attemptedOnly = answers.filter((a) => !a.unanswered)
    const scoreData = calculateScore(attemptedOnly, blueprint.negativeMarking)

    const unitBreakdown = (track.units ?? []).map((unit) => {
      const unitQs = allTrackQuestions.filter((q) => q.unitId === unit.id)
      const unitAnswers = unitQs.map((q) => {
        const idx = allTrackQuestions.indexOf(q)
        return {
          correct: selectedAnswers[idx] === q.answer,
          unanswered: selectedAnswers[idx] === undefined,
        }
      })
      const unitScore = calculateScore(
        unitAnswers.filter((a) => !a.unanswered),
        blueprint.negativeMarking,
      )
      return {
        unitTitle: unit.title,
        total: unitQs.length,
        correct: unitScore.correct,
        wrong: unitScore.wrong,
        netScore: unitScore.netScore,
      }
    })

    const isPassed = scoreData.netScore >= blueprint.passingMarks

    if (isPassed) {
      feedbackService.celebrate()
    }

    return {
      ...scoreData,
      isPassed,
      unitBreakdown,
      unansweredCount: allTrackQuestions.length - attemptedOnly.length,
    }
  }, [submitted, track, allTrackQuestions, selectedAnswers, blueprint])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const toggleEliminate = (choiceIndex) => {
    setEliminatedChoices((prev) => ({
      ...prev,
      [`${currentIndex}-${choiceIndex}`]: !prev[`${currentIndex}-${choiceIndex}`],
    }))
  }

  if (!track) return <Navigate to="/" replace />

  const currentQuestion = allTrackQuestions[currentIndex]
  const answeredCount = Object.keys(selectedAnswers).length
  const flaggedCount = Object.values(flagged).filter(Boolean).length

  // Timer HUD status class: amber under 15 min (900,000ms), pulsing red under 5 min (300,000ms)
  let timerClass = ''
  if (remainingMs < 300000) {
    timerClass = 'timer--pulsing-red'
  } else if (remainingMs < 900000) {
    timerClass = 'timer--warning-amber'
  }

  // Post-Exam Results Screen
  if (submitted && results) {
    return (
      <div className="mock mock--results-view">
        <header className="mock__header">
          <Link className="path-back-btn" to={`/track/${track.id}`}>
            ← Syllabus Path
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Exam Performance Diagnostic</h1>
          <p className="mock__sub font-mono text-sm text-[var(--muted)]">
            {track.exam} · {track.title}
          </p>
        </header>

        <main className="mock__results">
          {/* Main Scorecard Banner */}
          <div className={`result-card ${results.isPassed ? 'result-card--pass' : 'result-card--fail'}`}>
            <span className="result-card__badge font-mono">
              {results.isPassed ? 'QUALIFIED FOR SCREENING' : 'NEEDS IMPROVEMENT'}
            </span>
            <h2 className="font-mono text-3xl font-extrabold my-2">
              {results.netScore} / {allTrackQuestions.length} Marks
            </h2>
            <p className="result-card__passing text-xs text-[var(--muted)]">
              Passing Benchmark: {blueprint.passingMarks} Marks
            </p>

            <div className="result-stats">
              <div className="stat">
                <span className="stat__val stat--green font-mono">+{results.correct}</span>
                <span className="stat__lbl">Correct (+1.00)</span>
              </div>
              <div className="stat">
                <span className="stat__val stat--red font-mono">{results.wrong}</span>
                <span className="stat__lbl">Incorrect</span>
              </div>
              <div className="stat">
                <span className="stat__val font-mono">{results.unansweredCount}</span>
                <span className="stat__lbl">Skipped</span>
              </div>
              {blueprint.negativeMarking > 0 && (
                <div className="stat">
                  <span className="stat__val stat--red font-mono">-{results.marksDeducted}</span>
                  <span className="stat__lbl">Deductions (-{blueprint.negativeMarking})</span>
                </div>
              )}
            </div>
          </div>

          {/* Subject Breakdown */}
          <section className="section-card">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
              Per-Subject Diagnostic Breakdown
            </h3>
            <ul className="unit-list flex flex-col gap-2">
              {results.unitBreakdown.map((item) => (
                <li key={item.unitTitle} className="unit-row p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
                  <div>
                    <strong className="text-sm text-[var(--text)]">{item.unitTitle}</strong>
                    <span className="unit-row__meta block text-xs text-[var(--muted)] font-mono">
                      {item.correct} correct · {item.wrong} wrong · {item.total} total
                    </span>
                  </div>
                  <span className="unit-row__score font-mono font-bold text-sm text-[var(--primary-text)]">
                    {item.netScore} Marks
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Question Review Section */}
          <section className="section-card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] m-0">
                Detailed Question Review
              </h3>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: `All (${allTrackQuestions.length})` },
                  { id: 'wrong', label: `Wrong (${results.wrong})` },
                  { id: 'skipped', label: `Skipped (${results.unansweredCount})` },
                  { id: 'flagged', label: `Flagged (${flaggedCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`btn btn--small ${reviewFilter === f.id ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => setReviewFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Bulk Action */}
            {results.wrong > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] mb-4">
                <Button
                  size="small"
                  variant="ghost"
                  onClick={async () => {
                    let count = 0
                    for (let idx = 0; idx < allTrackQuestions.length; idx++) {
                      const q = allTrackQuestions[idx]
                      const choice = selectedAnswers[idx]
                      if (choice !== undefined && choice !== q.answer) {
                        await mistakesStore.recordMistake(q, { trackId: track.id, unitId: q.unitId })
                        count++
                      }
                    }
                    setSavedToMistakesMsg(`Saved ${count} missed questions to SRS Mistakes Bank!`)
                    setTimeout(() => setSavedToMistakesMsg(null), 3500)
                  }}
                >
                  Save All Missed to Mistakes Bank (SRS)
                </Button>
                {savedToMistakesMsg && (
                  <span className="text-xs font-bold text-[var(--green-text)] font-mono">
                    {savedToMistakesMsg}
                  </span>
                )}
              </div>
            )}

            <ul className="review-list flex flex-col gap-3">
              {allTrackQuestions.map((q, idx) => {
                const choice = selectedAnswers[idx]
                const isCorrect = choice === q.answer
                const isSkipped = choice === undefined
                const isWrong = choice !== undefined && !isCorrect
                const isFlag = Boolean(flagged[idx])

                if (reviewFilter === 'wrong' && !isWrong) return null
                if (reviewFilter === 'skipped' && !isSkipped) return null
                if (reviewFilter === 'flagged' && !isFlag) return null

                return (
                  <li
                    key={q.id}
                    className={`review-item p-4 rounded-xl border ${
                      isCorrect
                        ? 'border-[rgba(22,163,74,0.3)] bg-[var(--green-subtle)]'
                        : isSkipped
                        ? 'border-[var(--border)] bg-[var(--surface)]'
                        : 'border-[rgba(220,38,38,0.3)] bg-[var(--red-subtle)]'
                    }`}
                  >
                    <div className="review-item__header flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold">Q{idx + 1}</span>
                        <span className="text-[var(--muted)]">{q.unitTitle}</span>
                        {isFlag && (
                          <span className="text-[var(--amber-text)] flex items-center gap-1 font-bold">
                            <ExamFlagIcon width="12" height="12" /> Flagged
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <QuestionTTS question={q} />
                        <button
                          type="button"
                          className="note-btn text-xs font-mono"
                          onClick={() => setNoteModalQuestion(q)}
                        >
                          <NotesIcon width="12" height="12" /> +Note
                        </button>
                        <span className={`font-mono font-bold ${isCorrect ? 'text-[var(--green-text)]' : isSkipped ? 'text-[var(--muted)]' : 'text-[var(--red-text)]'}`}>
                          {isCorrect ? 'Correct (+1.00)' : isSkipped ? 'Skipped (0.00)' : `Wrong (-${blueprint.negativeMarking})`}
                        </span>
                      </div>
                    </div>

                    <p className={`font-semibold text-base text-[var(--text)] mb-2 ${q.rtl ? 'urdu' : ''}`} dir={q.rtl ? 'rtl' : 'ltr'}>
                      {q.prompt}
                    </p>

                    {!isSkipped && !isCorrect && (
                      <p className="text-xs font-mono text-[var(--red-text)]">
                        Your choice: {q.choices[choice]}
                      </p>
                    )}
                    <p className="text-xs font-mono text-[var(--green-text)] font-bold">
                      Correct answer: {q.choices[q.answer]}
                    </p>
                    {explainQuestion(q) && (
                      <p className={`text-xs text-[var(--muted)] mt-2 pt-2 border-t border-[var(--border)] ${q.rtl ? 'urdu' : ''}`}>
                        {explainQuestion(q)}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <div className="mock__actions flex gap-3 justify-center mt-6">
            <button className="btn btn--primary" type="button" onClick={() => navigate(`/track/${track.id}`)}>
              Back to Syllabus Path
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => {
                sessionStorage.removeItem(sessionKey)
                window.location.reload()
              }}
            >
              <RotateCcwIcon width="16" height="16" />
              <span>Retake Mock Exam</span>
            </button>
          </div>
        </main>

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

  const jumpToNextUnanswered = () => {
    if (unansweredIndices.length === 0) return
    const next = unansweredIndices.find((idx) => idx > currentIndex)
    if (next !== undefined) {
      setCurrentIndex(next)
    } else {
      setCurrentIndex(unansweredIndices[0])
    }
    setShowMobilePalette(false)
  }

  const renderPaletteContent = () => (
    <div className="palette-inner-container">
      <div className="palette-header-info flex items-center justify-between mb-3">
        <span className="font-bold text-sm text-[var(--text)]">Question Map</span>
        <span className="font-mono text-xs text-[var(--muted)]">
          <strong>{answeredCount}</strong>/{allTrackQuestions.length} answered
        </span>
      </div>

      {unansweredIndices.length > 0 && (
        <button
          type="button"
          className="btn btn--small btn--ghost w-full mb-3"
          onClick={jumpToNextUnanswered}
        >
          Next Unanswered →
        </button>
      )}

      <div className="palette-filters flex gap-1 mb-3" role="tablist">
        <button
          type="button"
          className={`filter-tab ${paletteFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setPaletteFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          className={`filter-tab ${paletteFilter === 'unanswered' ? 'is-active' : ''}`}
          onClick={() => setPaletteFilter('unanswered')}
        >
          Unanswered ({allTrackQuestions.length - answeredCount})
        </button>
        <button
          type="button"
          className={`filter-tab ${paletteFilter === 'flagged' ? 'is-active' : ''}`}
          onClick={() => setPaletteFilter('flagged')}
        >
          Flagged ({flaggedCount})
        </button>
      </div>

      <div className="palette-grid">
        {allTrackQuestions.map((_, idx) => {
          const isAnswered = selectedAnswers[idx] !== undefined
          const isFlagged = Boolean(flagged[idx])
          const isCurrent = currentIndex === idx

          if (paletteFilter === 'unanswered' && isAnswered) return null
          if (paletteFilter === 'flagged' && !isFlagged) return null

          return (
            <PaletteButton
              key={idx}
              index={idx}
              isCurrent={isCurrent}
              isAnswered={isAnswered}
              isFlagged={isFlagged}
              onClick={() => {
                setCurrentIndex(idx)
                setShowMobilePalette(false)
              }}
            />
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="mock mock--active-runner">
      {/* HUD Top Bar */}
      <header className="mock__topbar">
        <div className="mock__topbar-left flex items-center gap-2">
          <Link
            className="icon-btn"
            to={`/track/${track.id}`}
            aria-label="Exit mock exam"
            onClick={(e) => {
              if (!window.confirm('Leave mock exam? Your progress will remain saved in this browser.')) {
                e.preventDefault()
              }
            }}
          >
            <CloseIcon width="20" height="20" />
          </Link>
          <div className="mock__topbar-title-wrap">
            <span className="mock__exam-name text-xs font-bold text-[var(--muted)] uppercase font-mono">
              {track.title}
            </span>
            <span className="mock__topbar-sub text-sm font-extrabold text-[var(--text)]">
              Timed Mock
            </span>
          </div>
        </div>

        {/* HUD Timer with 3 Tiers (Normal, Amber under 15m, Pulsing Red under 5m) */}
        <div className={`mock-timer-hud font-mono ${timerClass}`} role="timer" aria-live="polite">
          <TimerIcon width="16" height="16" />
          <span>{formatTime(remainingMs)}</span>
        </div>

        <div className="mock__topbar-right flex items-center gap-2">
          <button
            type="button"
            className="btn btn--small btn--ghost mobile-palette-trigger"
            onClick={() => setShowMobilePalette(true)}
            aria-label="Open Question Map"
          >
            Map ({answeredCount}/{allTrackQuestions.length})
          </button>
          <button
            type="button"
            className="icon-btn desktop-only-btn"
            aria-label="Toggle Fullscreen Lockdown"
            title="Toggle Fullscreen Lockdown"
            onClick={toggleFullscreen}
          >
            <MaximizeIcon width="18" height="18" />
          </button>
          <button
            className="btn btn--small btn--primary"
            type="button"
            onClick={() => setShowConfirm(true)}
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Progress Track */}
      <div className="mock__progress-bar">
        <div
          className="mock__progress-fill"
          style={{ width: `${(answeredCount / allTrackQuestions.length) * 100}%` }}
        />
      </div>

      {/* Two-Column Desktop (65/35) Layout */}
      <main className="mock__layout">
        <section className="mock__question-panel">
          <div className="mock__qheader flex items-center justify-between mb-3 pb-2 border-b border-[var(--border)]">
            <button
              type="button"
              className="qheader-jump-pill font-mono text-xs font-bold"
              onClick={() => setShowMobilePalette(true)}
              title="Click to view all questions"
            >
              Question {currentIndex + 1} of {allTrackQuestions.length} ▾
            </button>
            <span className="mock__unit-tag text-xs text-[var(--muted)] font-semibold">
              {currentQuestion.unitTitle}
            </span>
            <button
              type="button"
              className={`flag-btn ${flagged[currentIndex] ? 'is-flagged' : ''}`}
              onClick={() =>
                setFlagged((prev) => ({ ...prev, [currentIndex]: !prev[currentIndex] }))
              }
              title={flagged[currentIndex] ? 'Unflag question' : 'Mark for review'}
            >
              <ExamFlagIcon width="16" height="16" />
              <span>{flagged[currentIndex] ? 'Flagged' : 'Flag for review'}</span>
            </button>
          </div>

          <h2
            className={`mock__prompt text-xl font-bold text-[var(--text)] mb-4 ${currentQuestion.rtl ? 'urdu' : ''}`}
            dir={currentQuestion.rtl ? 'rtl' : 'ltr'}
          >
            {currentQuestion.prompt}
          </h2>

          {currentQuestion.statements && (
            <ol className="mock-statements-list mb-4 flex flex-col gap-2">
              {currentQuestion.statements.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--text-body)]">
                  <span className="font-mono font-bold text-[var(--primary-text)]">{i + 1}.</span>
                  <span className={currentQuestion.rtl ? 'urdu' : undefined}>{s}</span>
                </li>
              ))}
            </ol>
          )}

          {currentQuestion.closing && (
            <p className={`mock__closing font-semibold text-sm mb-4 ${currentQuestion.rtl ? 'urdu' : ''}`} dir={currentQuestion.rtl ? 'rtl' : 'ltr'}>
              {currentQuestion.closing}
            </p>
          )}

          {/* Answer Options */}
          <div className="mock-choices-list flex flex-col gap-2.5 mb-6">
            {currentQuestion.choices.map((choice, i) => {
              const isSelected = selectedAnswers[currentIndex] === i
              const isStruck = Boolean(eliminatedChoices[`${currentIndex}-${i}`])
              const letter = ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? `${i + 1}`

              return (
                <div key={i} className={`reading-choice-row ${isSelected ? 'is-selected' : ''} ${isStruck ? 'is-struck' : ''}`}>
                  <button
                    type="button"
                    className={`choice-button ${isSelected ? 'is-active' : ''} ${isStruck ? 'is-eliminated' : ''}`}
                    onClick={() => {
                      if (isStruck) return
                      setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: i }))
                      feedbackService.tap(30)
                    }}
                    aria-pressed={isSelected}
                  >
                    <span className="choice-omr-bubble" aria-hidden="true">
                      <span className="omr-bubble-ring">
                        <span className="omr-bubble-letter font-mono">{letter}</span>
                        {isSelected && <span className="omr-pencil-fill" />}
                      </span>
                    </span>
                    <span className={`choice-content ${currentQuestion.rtl ? 'urdu' : ''}`}>
                      {choice}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`strike-toggle-btn ${isStruck ? 'is-eliminated' : ''}`}
                    onClick={() => toggleEliminate(i)}
                    title={isStruck ? 'Restore option' : 'Eliminate option'}
                    aria-label={isStruck ? 'Restore option' : 'Eliminate option'}
                  >
                    <SlashIcon width="16" height="16" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="mock__nav flex items-center justify-between pt-3 border-t border-[var(--border)]">
            <button
              className="btn btn--ghost btn--small"
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              ← Previous
            </button>
            <button
              className="btn btn--small btn--primary"
              type="button"
              disabled={currentIndex === allTrackQuestions.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              Next Question →
            </button>
          </div>
        </section>

        {/* Desktop Sidebar (65/35 ratio) */}
        <aside className="mock__sidebar hidden md:block">
          {renderPaletteContent()}
        </aside>
      </main>

      {/* Floating OMR Response Matrix */}
      <OMRSheet
        totalQuestions={allTrackQuestions.length}
        currentIndex={currentIndex}
        selectedAnswers={selectedAnswers}
        flagged={flagged}
        onSelectAnswer={(qIdx, optIdx) => {
          setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
        }}
        onJumpToQuestion={(qIdx) => setCurrentIndex(qIdx)}
      />

      {/* Mobile Drawer Map */}
      {showMobilePalette && (
        <div className="modal-backdrop" onClick={() => setShowMobilePalette(false)}>
          <div className="mobile-palette-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]">
              <span className="font-bold text-sm">Question Map</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowMobilePalette(false)}
                aria-label="Close Map"
              >
                <CloseIcon width="16" height="16" />
              </button>
            </div>
            {renderPaletteContent()}
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Submit Timed Exam?"
      >
        <p className="text-sm text-[var(--muted)] mb-4">
          Are you sure you want to finish and submit your exam?
        </p>

        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] mb-4 text-center font-mono">
          <div>
            <span className="block text-xs text-[var(--muted)]">Answered</span>
            <strong className="text-base text-[var(--text)]">{answeredCount}</strong>
          </div>
          <div>
            <span className="block text-xs text-[var(--muted)]">Flagged</span>
            <strong className="text-base text-[var(--amber-text)]">{flaggedCount}</strong>
          </div>
          <div>
            <span className="block text-xs text-[var(--muted)]">Left</span>
            <strong className="text-base text-[var(--red-text)]">
              {allTrackQuestions.length - answeredCount}
            </strong>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="small" onClick={() => setShowConfirm(false)}>
            Keep Working
          </Button>
          <Button variant="primary" size="small" onClick={submitExam}>
            Confirm Submission
          </Button>
        </div>
      </Modal>
    </div>
  )
}
