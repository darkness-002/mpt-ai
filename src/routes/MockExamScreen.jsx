import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  BookIcon,
  CloseIcon,
  FlagIcon,
  MaximizeIcon,
  SlashIcon,
  TimerIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { calculateScore } from '../data/curriculum.js'
import { fireConfetti } from '../lib/confetti.js'
import { shuffle } from '../lib/shuffle.js'
import { playCelebrationSound, triggerHaptic } from '../lib/sound.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { settingsStore } from '../storage/settingsStore.js'
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
      // Fallback to default
    }
    return totalDurationMs
  })

  const targetTimeRef = useRef(0)

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

    // Save incorrect or skipped items to mistakes store
    for (const item of answeredList) {
      if (!item.correct) {
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

    // Unit-wise breakdown
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
      fireConfetti()
      const settings = settingsStore.load()
      if (settings.soundEnabled) playCelebrationSound()
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

  if (submitted && results) {
    return (
      <div className="mock">
        <header className="mock__header">
          <Link className="brand" to={`/track/${track.id}`}>
            <BookIcon width="22" height="22" />
            <span>MPT·AI</span>
          </Link>
          <h1>Mock Exam Results</h1>
          <p className="mock__sub">
            {track.exam} · {track.title} · Diagnostic Performance Report
          </p>
        </header>

        <main className="mock__results">
          <div className={`result-card ${results.isPassed ? 'result-card--pass' : 'result-card--fail'}`}>
            <span className="result-card__badge">{results.isPassed ? 'QUALIFIED' : 'DID NOT QUALIFY'}</span>
            <h2>
              {results.netScore} / {allTrackQuestions.length} marks
            </h2>
            <p className="result-card__passing">
              Qualifying benchmark: {blueprint.passingMarks} marks
            </p>
            <div className="result-stats">
              <div className="stat">
                <span className="stat__val stat--green">{results.correct}</span>
                <span className="stat__lbl">Correct</span>
              </div>
              <div className="stat">
                <span className="stat__val stat--red">{results.wrong}</span>
                <span className="stat__lbl">Incorrect</span>
              </div>
              <div className="stat">
                <span className="stat__val">{results.unansweredCount}</span>
                <span className="stat__lbl">Skipped</span>
              </div>
              {blueprint.negativeMarking > 0 && (
                <div className="stat">
                  <span className="stat__val stat--red">-{results.marksDeducted}</span>
                  <span className="stat__lbl">Penalty</span>
                </div>
              )}
            </div>
          </div>

          <section className="section-card">
            <h3>Subject-wise Breakdown</h3>
            <ul className="unit-list">
              {results.unitBreakdown.map((item) => (
                <li key={item.unitTitle} className="unit-row">
                  <div>
                    <strong>{item.unitTitle}</strong>
                    <span className="unit-row__meta">
                      {item.correct} correct · {item.wrong} wrong · {item.total} total
                    </span>
                  </div>
                  <span className="unit-row__score">{item.netScore} marks</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="section-card">
            <h3>Review All Questions</h3>
            <ul className="review-list">
              {allTrackQuestions.map((q, idx) => {
                const choice = selectedAnswers[idx]
                const isCorrect = choice === q.answer
                const isSkipped = choice === undefined

                return (
                  <li
                    key={q.id}
                    className={`review-item ${isCorrect ? 'is-correct' : isSkipped ? 'is-skipped' : 'is-wrong'}`}
                  >
                    <div className="review-item__header">
                      <span className="review-item__num">Q{idx + 1}</span>
                      <span className="review-item__unit">{q.unitTitle}</span>
                      <span className="review-item__status">
                        {isCorrect ? 'Correct (+1)' : isSkipped ? 'Skipped (0)' : `Wrong (-${blueprint.negativeMarking})`}
                      </span>
                    </div>
                    <p className={`review-item__prompt${q.rtl ? ' urdu' : ''}`} dir={q.rtl ? 'rtl' : 'ltr'}>
                      {q.prompt}
                    </p>
                    {!isSkipped && !isCorrect && (
                      <p className="review-item__wrong">Your choice: {q.choices[choice]}</p>
                    )}
                    <p className="review-item__right">Correct choice: {q.choices[q.answer]}</p>
                    {q.explanation && <p className="review-item__why">{q.explanation}</p>}
                  </li>
                )
              })}
            </ul>
          </section>

          <div className="mock__actions">
            <button className="btn" type="button" onClick={() => navigate(`/track/${track.id}`)}>
              Back to Track
            </button>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => {
                sessionStorage.removeItem(sessionKey)
                window.location.reload()
              }}
            >
              Retake Mock Exam
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="mock">
      <header className="mock__topbar">
        <div className="mock__topbar-left">
          <Link
            className="icon-btn"
            to={`/track/${track.id}`}
            aria-label="Exit mock exam"
            onClick={() => {
              if (window.confirm('Leave mock exam? Your progress will remain saved in this browser.')) {
                navigate(`/track/${track.id}`)
              }
            }}
          >
            <CloseIcon width="20" height="20" />
          </Link>
          <span className="mock__exam-name">
            {track.title} · Mock Exam
          </span>
        </div>

        <div className={`timer ${remainingMs < 300000 ? 'timer--urgent' : ''}`}>
          <TimerIcon width="18" height="18" />
          <span>{formatTime(remainingMs)}</span>
        </div>

        <div className="mock__topbar-right">
          <button
            type="button"
            className="icon-btn"
            aria-label="Toggle Fullscreen Lockdown"
            title="Toggle Fullscreen Lockdown"
            onClick={toggleFullscreen}
          >
            <MaximizeIcon width="18" height="18" />
          </button>
          <button className="btn btn--small" type="button" onClick={() => setShowConfirm(true)}>
            Submit Exam
          </button>
        </div>
      </header>

      <div className="mock__progress-bar">
        <div
          className="mock__progress-fill"
          style={{ width: `${(answeredCount / allTrackQuestions.length) * 100}%` }}
        />
      </div>

      <main className="mock__layout">
        <section className="mock__question-panel">
          <div className="mock__qheader">
            <span className="badge">
              Question {currentIndex + 1} of {allTrackQuestions.length}
            </span>
            <span className="mock__unit-tag">{currentQuestion.unitTitle}</span>
            <button
              type="button"
              className={`flag-btn ${flagged[currentIndex] ? 'is-flagged' : ''}`}
              onClick={() =>
                setFlagged((prev) => ({ ...prev, [currentIndex]: !prev[currentIndex] }))
              }
            >
              <FlagIcon width="16" height="16" />
              {flagged[currentIndex] ? 'Flagged' : 'Flag for review'}
            </button>
          </div>

          <h2
            className={`mock__prompt${currentQuestion.rtl ? ' urdu' : ''}`}
            dir={currentQuestion.rtl ? 'rtl' : 'ltr'}
          >
            {currentQuestion.prompt}
          </h2>

          {currentQuestion.statements && (
            <ol className="statements">
              {currentQuestion.statements.map((s, i) => (
                <li key={i}>
                  <span className="statements__mark">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}

          {currentQuestion.closing && <p className="mock__closing">{currentQuestion.closing}</p>}

          <ul className="choices">
            {currentQuestion.choices.map((choice, i) => {
              const isSelected = selectedAnswers[currentIndex] === i
              const isStruck = Boolean(eliminatedChoices[`${currentIndex}-${i}`])
              let tone = isSelected ? ' choice--selected' : ''
              if (isStruck) tone += ' choice--eliminated'
              const letter = ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? `${i + 1}`

              return (
                <li key={i} className="choice-row">
                  <button
                    type="button"
                    className={`choice${tone}${currentQuestion.rtl ? ' urdu' : ''}`}
                    dir={currentQuestion.rtl ? 'rtl' : 'ltr'}
                    onClick={() => {
                      if (isStruck) return
                      setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: i }))
                      triggerHaptic(30)
                    }}
                  >
                    <span className="choice__key">{letter}</span>
                    <span className="choice__text">{choice}</span>
                  </button>

                  <button
                    type="button"
                    className={`strike-toggle${isStruck ? ' is-struck' : ''}`}
                    aria-label={isStruck ? 'Restore option' : 'Eliminate option'}
                    title={isStruck ? 'Restore option' : 'Eliminate option'}
                    onClick={() => toggleEliminate(i)}
                  >
                    <SlashIcon width="16" height="16" />
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mock__nav">
            <button
              className="btn btn--ghost btn--small"
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              ← Previous
            </button>
            <button
              className="btn btn--small"
              type="button"
              disabled={currentIndex === allTrackQuestions.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              Next →
            </button>
          </div>
        </section>

        {/* Question Palette / Matrix Sidebar with Filters */}
        <aside className="mock__sidebar">
          <div className="mock__summary-pills">
            <span>{answeredCount} Answered</span>
            <span>{allTrackQuestions.length - answeredCount} Left</span>
            {flaggedCount > 0 && <span>{flaggedCount} Flagged</span>}
          </div>

          <div className="palette-filters">
            <button
              type="button"
              className={`filter-tab ${paletteFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setPaletteFilter('all')}
            >
              All ({allTrackQuestions.length})
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

              // Apply palette filter
              if (paletteFilter === 'unanswered' && isAnswered) return null
              if (paletteFilter === 'flagged' && !isFlagged) return null

              let tone = ''
              if (isCurrent) tone += ' is-current'
              if (isFlagged) tone += ' is-flagged'
              else if (isAnswered) tone += ' is-answered'

              return (
                <button
                  key={idx}
                  type="button"
                  className={`palette-btn${tone}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </aside>
      </main>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>Ready to submit?</h2>
            <p>
              You have answered <strong>{answeredCount}</strong> of{' '}
              <strong>{allTrackQuestions.length}</strong> questions.
              {allTrackQuestions.length - answeredCount > 0 && (
                <> (There are {allTrackQuestions.length - answeredCount} unanswered questions).</>
              )}
            </p>
            <div className="modal__actions">
              <button className="btn" type="button" onClick={submitExam}>
                Yes, Submit Now
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => setShowConfirm(false)}
              >
                Keep Practicing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
