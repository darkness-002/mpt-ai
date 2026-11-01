import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CloseIcon,
  FlameIcon,
  PlayIcon,
  RotateCcwIcon,
  TimerIcon,
  TrophyIcon,
  ZapIcon,
  BookmarkStarIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { feedbackService } from '../lib/feedback.js'
import { shuffle } from '../lib/shuffle.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import './SpeedRunScreen.css'

const HIGHSCORE_KEY = 'mpt_ai_speedrun_highscore'

export default function SpeedRunScreen() {
  const { tracks } = useContent()
  const [gameState, setGameState] = useState('lobby') // 'lobby' | 'countdown' | 'playing' | 'gameover'
  const [countdownNum, setCountdownNum] = useState(3)
  const [timeLeft, setTimeLeft] = useState(60)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [suddenDeath, setSuddenDeath] = useState(false)
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem(HIGHSCORE_KEY) || 0)
    } catch {
      return 0
    }
  })

  // Pool of all questions across tracks
  const allQuestions = useMemo(() => {
    return tracks.flatMap((t) =>
      t.units.flatMap((u) =>
        u.lessons.flatMap((l) =>
          l.questions.map((q) => ({
            ...q,
            trackId: t.id,
            trackTitle: t.title,
            unitId: u.id,
            unitTitle: u.title,
            rtl: Boolean(u.rtl || q.rtl),
          })),
        ),
      ),
    )
  }, [tracks])

  const [shuffledDeck, setShuffledDeck] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [feedbackEffect, setFeedbackEffect] = useState(null) // 'correct' | 'wrong'
  const [timeDeltaBadge, setTimeDeltaBadge] = useState(null) // { text: '+3s', type: 'plus' | 'minus' }

  // Detailed history of answered questions for the post-run review
  const [runHistory, setRunHistory] = useState([])
  const [reviewFilter, setReviewFilter] = useState('all') // 'all' | 'missed' | 'correct'
  const [savedMissedToast, setSavedMissedToast] = useState(false)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  const currentQ = shuffledDeck[currentIndex]
  const timerRef = useRef(null)
  const deltaTimeoutRef = useRef(null)

  // End game handler
  const handleGameOver = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setGameState('gameover')
    feedbackService.celebrate({ withConfetti: true })
  }, [])

  // Kick off countdown sequence
  const startCountdown = () => {
    setShuffledDeck(shuffle(allQuestions))
    setCurrentIndex(0)
    setTimeLeft(60)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setRunHistory([])
    setFeedbackEffect(null)
    setTimeDeltaBadge(null)
    setSavedMissedToast(false)
    setExitConfirmOpen(false)
    setCountdownNum(3)
    setGameState('countdown')
  }

  // Countdown step timer
  useEffect(() => {
    if (gameState !== 'countdown') return

    if (countdownNum > 0) {
      const stepTimer = setTimeout(() => {
        setCountdownNum((prev) => prev - 1)
      }, 750)
      return () => clearTimeout(stepTimer)
    } else {
      // Countdown finished -> Start playing
      const startTimer = setTimeout(() => {
        setGameState('playing')
      }, 400)
      return () => clearTimeout(startTimer)
    }
  }, [gameState, countdownNum])

  // Active game timer
  useEffect(() => {
    if (gameState !== 'playing') return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleGameOver()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameState, handleGameOver])

  // Answer handler
  const handleAnswer = useCallback(
    (choiceIndex) => {
      if (!currentQ || gameState !== 'playing') return
      const isCorrect = choiceIndex === currentQ.answer

      // Record in history
      setRunHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          selectedChoice: choiceIndex,
          isCorrect,
          timeDelta: isCorrect ? '+3s' : '-5s',
        },
      ])

      if (isCorrect) {
        feedbackService.onCorrect()
        setFeedbackEffect('correct')
        setTimeDeltaBadge({ text: '+3s', type: 'plus' })

        const newCombo = combo + 1
        setCombo(newCombo)
        if (newCombo > maxCombo) setMaxCombo(newCombo)

        // Points: 10 base * multiplier (1x up to 4x)
        const multiplier = Math.min(4, 1 + Math.floor(newCombo / 3))
        const pointsAdded = 10 * multiplier

        setScore((s) => {
          const nextScore = s + pointsAdded
          if (nextScore > highScore) {
            setHighScore(nextScore)
            try {
              localStorage.setItem(HIGHSCORE_KEY, String(nextScore))
            } catch {}
          }
          return nextScore
        })

        // Add +3 seconds (cap at 99s)
        setTimeLeft((t) => Math.min(99, t + 3))
      } else {
        feedbackService.onWrong()
        setFeedbackEffect('wrong')
        setTimeDeltaBadge({ text: '-5s', type: 'minus' })
        setCombo(0)

        if (suddenDeath) {
          handleGameOver()
          return
        }

        // Penalty: -5 seconds
        setTimeLeft((t) => {
          const nextTime = Math.max(0, t - 5)
          if (nextTime === 0) {
            handleGameOver()
          }
          return nextTime
        })
      }

      // Clear feedback animations
      if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current)
      deltaTimeoutRef.current = setTimeout(() => {
        setFeedbackEffect(null)
        setTimeDeltaBadge(null)
      }, 500)

      // Advance question
      if (currentIndex < shuffledDeck.length - 1) {
        setCurrentIndex((i) => i + 1)
      } else {
        // Re-shuffle if deck runs out
        setShuffledDeck(shuffle(allQuestions))
        setCurrentIndex(0)
      }
    },
    [currentQ, gameState, combo, maxCombo, highScore, suddenDeath, currentIndex, shuffledDeck.length, allQuestions, handleGameOver],
  )

  // Keyboard shortcut listener during active run
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState === 'lobby' && (e.key === 'Enter' || e.key === ' ')) {
        startCountdown()
        return
      }

      if (gameState === 'countdown' && (e.key === ' ' || e.key === 'Enter')) {
        setGameState('playing')
        return
      }

      if (gameState === 'playing') {
        const key = e.key.toUpperCase()
        if (key === 'A' || key === '1') handleAnswer(0)
        else if (key === 'B' || key === '2') handleAnswer(1)
        else if (key === 'C' || key === '3') handleAnswer(2)
        else if (key === 'D' || key === '4') handleAnswer(3)
        else if (e.key === 'Escape') setExitConfirmOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, handleAnswer])

  // Save all missed questions to Mistakes Bank (SRS)
  const handleSaveMissedToMistakes = async () => {
    const missed = runHistory.filter((item) => !item.isCorrect)
    if (missed.length === 0) return

    for (const item of missed) {
      await mistakesStore.recordMistake(item.question, {
        trackId: item.question.trackId,
        unitId: item.question.unitId,
      })
    }

    setSavedMissedToast(true)
    setTimeout(() => setSavedMissedToast(false), 3000)
  }

  // Filtered review list
  const filteredReview = useMemo(() => {
    if (reviewFilter === 'missed') return runHistory.filter((h) => !h.isCorrect)
    if (reviewFilter === 'correct') return runHistory.filter((h) => h.isCorrect)
    return runHistory
  }, [runHistory, reviewFilter])

  const missedCount = runHistory.filter((h) => !h.isCorrect).length
  const correctCount = runHistory.filter((h) => h.isCorrect).length
  const accuracy = runHistory.length > 0 ? Math.round((correctCount / runHistory.length) * 100) : 0

  return (
    <div className={`speedrun-page ${feedbackEffect ? `is-${feedbackEffect}` : ''}`}>
      {/* 1. LOBBY STATE */}
      {gameState === 'lobby' && (
        <div className="speedrun-lobby">
          <div className="speedrun-header">
            <Link to="/drill" className="back-link">
              <ArrowLeftIcon width="16" height="16" />
              <span>Back to Drills</span>
            </Link>
            <div className="speedrun-title-wrap">
              <ZapIcon width="26" height="26" style={{ color: 'var(--amber-text)' }} />
              <h1>60-Second Speed Run</h1>
            </div>
            <p className="speedrun-tagline">
              Rapid-fire civil service MCQ sprint. Train instinct, test recall, and beat the clock.
            </p>
          </div>

          <div className="speedrun-lobby-card">
            <div className="lobby-hero-icon" aria-hidden="true">
              <ZapIcon width="44" height="44" />
            </div>

            <h2>How Rapid Run Works</h2>
            <div className="rules-grid">
              <div className="rule-card">
                <span className="rule-icon">⏱️</span>
                <strong>60s Base Time</strong>
                <p>Clock ticks down continuously.</p>
              </div>
              <div className="rule-card">
                <span className="rule-icon rule-icon--green">⚡</span>
                <strong className="text-green">+3s on Correct</strong>
                <p>Grow your combo multiplier up to 4x.</p>
              </div>
              <div className="rule-card">
                <span className="rule-icon rule-icon--red">⚠️</span>
                <strong className="text-red">-5s on Mistake</strong>
                <p>Resets your combo streak to 0.</p>
              </div>
            </div>

            <div className="lobby-stats-row">
              <div className="lobby-stat-box">
                <span className="lobby-stat-label">Personal Best</span>
                <span className="lobby-stat-val">
                  <TrophyIcon width="18" height="18" style={{ color: 'var(--gold)' }} />
                  {highScore} pts
                </span>
              </div>
              <div className="lobby-stat-box">
                <span className="lobby-stat-label">Available Questions</span>
                <span className="lobby-stat-val">{allQuestions.length}</span>
              </div>
            </div>

            {/* Mode Toggle: Standard vs Sudden Death */}
            <div className="mode-toggle-card">
              <label className="sudden-death-toggle">
                <input
                  type="checkbox"
                  checked={suddenDeath}
                  onChange={(e) => setSuddenDeath(e.target.checked)}
                />
                <div className="toggle-info">
                  <strong>Sudden Death Mode</strong>
                  <span>A single incorrect answer ends the run immediately. High risk, maximum precision.</span>
                </div>
              </label>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--wide start-btn"
              onClick={startCountdown}
              autoFocus
            >
              <PlayIcon width="20" height="20" />
              <span>Launch Speed Run</span>
            </button>
            <span className="keyboard-hint">Press <kbd>Space</kbd> or <kbd>Enter</kbd> to start</span>
          </div>
        </div>
      )}

      {/* 2. COUNTDOWN STATE (3-2-1 GO) */}
      {gameState === 'countdown' && (
        <div className="speedrun-countdown-screen" onClick={() => setGameState('playing')}>
          <div className="countdown-bubble-wrap">
            <div className="countdown-bubble" key={countdownNum}>
              {countdownNum > 0 ? countdownNum : 'GO!'}
            </div>
            <p className="countdown-label">
              {countdownNum > 0 ? 'Get Ready...' : 'Sprint Begins!'}
            </p>
            <span className="countdown-skip-hint">Click or press Space to skip</span>
          </div>
        </div>
      )}

      {/* 3. ACTIVE RUN ARENA */}
      {gameState === 'playing' && (
        <div className="speedrun-arena">
          {/* Immersive HUD Bar */}
          <header className="arena-hud">
            <button
              type="button"
              className="hud-exit-btn"
              onClick={() => setExitConfirmOpen(true)}
              aria-label="Exit speed run"
              title="Exit speed run"
            >
              <ArrowLeftIcon width="18" height="18" />
            </button>

            {/* Time Indicator with Floating Delta Badge */}
            <div className={`hud-timer-wrap ${timeLeft <= 10 ? 'is-danger' : ''}`}>
              <div className="hud-timer">
                <TimerIcon width="20" height="20" />
                <span className="hud-timer-digits">{timeLeft}s</span>
              </div>
              {timeDeltaBadge && (
                <span className={`time-delta-badge time-delta-badge--${timeDeltaBadge.type}`}>
                  {timeDeltaBadge.text}
                </span>
              )}
            </div>

            {/* Score Indicator */}
            <div className="hud-score">
              <span className="hud-label">Score</span>
              <span className="hud-val">{score}</span>
            </div>

            {/* Combo Streak */}
            <div className={`hud-combo ${combo >= 3 ? 'is-fire' : ''}`}>
              <FlameIcon width="18" height="18" />
              <span>{combo}x</span>
            </div>
          </header>

          {/* Active Question Hero Card */}
          <main className="arena-q-card" dir={currentQ?.rtl ? 'rtl' : 'ltr'}>
            <div className="arena-q-meta">
              <span className="arena-q-topic">
                {currentQ?.trackTitle} • {currentQ?.unitTitle}
              </span>
              <span className="arena-q-counter">Q#{currentIndex + 1}</span>
            </div>

            <h2 className={`arena-q-prompt ${currentQ?.rtl ? 'urdu' : ''}`}>
              {currentQ?.prompt}
            </h2>

            {/* Choice Grid in Mobile Thumb Zone */}
            <div className="arena-choices">
              {currentQ?.choices.map((choice, i) => (
                <button
                  key={i}
                  type="button"
                  className="arena-choice-btn"
                  onClick={() => handleAnswer(i)}
                >
                  <span className="choice-omr-bubble" aria-hidden="true">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className={`choice-text ${currentQ?.rtl ? 'urdu' : ''}`}>{choice}</span>
                </button>
              ))}
            </div>
          </main>

          {/* Touch-Friendly Desktop/Mobile Shortcuts HUD */}
          <footer className="arena-keyboard-dock" aria-hidden="true">
            <span>Keys: <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> or <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd></span>
          </footer>

          {/* Exit Confirm Modal */}
          {exitConfirmOpen && (
            <div className="modal-backdrop" role="dialog" aria-modal="true">
              <div className="modal-box">
                <h3>Leave Speed Run?</h3>
                <p>Your current sprint progress of {score} points will be saved to your session stats.</p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setExitConfirmOpen(false)}
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={handleGameOver}
                  >
                    End Run Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. GAME OVER & POST-RUN REVIEW STATE */}
      {gameState === 'gameover' && (
        <div className="speedrun-gameover">
          <div className="speedrun-gameover-card">
            <div className="gameover-trophy" aria-hidden="true">
              <TrophyIcon width="46" height="46" style={{ color: 'var(--gold)' }} />
            </div>

            <h2>Time&apos;s Up!</h2>
            <div className="final-score-display">{score} pts</div>

            {score >= highScore && score > 0 && (
              <div className="new-record-badge">★ New Personal Best! ★</div>
            )}

            {/* Diagnostic Stats Grid */}
            <div className="gameover-stats-grid">
              <div className="gameover-stat-item">
                <span className="label">Questions Cleared</span>
                <span className="value">{runHistory.length}</span>
              </div>
              <div className="gameover-stat-item">
                <span className="label">Accuracy</span>
                <span className="value">{accuracy}%</span>
              </div>
              <div className="gameover-stat-item">
                <span className="label">Max Combo</span>
                <span className="value">{maxCombo}x</span>
              </div>
              <div className="gameover-stat-item">
                <span className="label">Personal Best</span>
                <span className="value">{highScore} pts</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="gameover-actions">
              <button type="button" className="btn btn--primary" onClick={startCountdown}>
                <RotateCcwIcon width="16" height="16" />
                <span>Play Again</span>
              </button>

              {missedCount > 0 && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={handleSaveMissedToMistakes}
                  disabled={savedMissedToast}
                >
                  <BookmarkStarIcon width="16" height="16" />
                  <span>{savedMissedToast ? 'Saved to Mistakes!' : `Save ${missedCount} Missed to SRS`}</span>
                </button>
              )}

              <Link to="/drill" className="btn btn--ghost">
                Back to Drills
              </Link>
            </div>
          </div>

          {/* Detailed Question Review Section */}
          {runHistory.length > 0 && (
            <div className="speedrun-review-section">
              <div className="review-header">
                <h3>Sprint Question Review</h3>
                <div className="review-filter-tabs">
                  <button
                    type="button"
                    className={`filter-tab ${reviewFilter === 'all' ? 'is-active' : ''}`}
                    onClick={() => setReviewFilter('all')}
                  >
                    All ({runHistory.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-tab ${reviewFilter === 'missed' ? 'is-active' : ''}`}
                    onClick={() => setReviewFilter('missed')}
                  >
                    Missed ({missedCount})
                  </button>
                  <button
                    type="button"
                    className={`filter-tab ${reviewFilter === 'correct' ? 'is-active' : ''}`}
                    onClick={() => setReviewFilter('correct')}
                  >
                    Correct ({correctCount})
                  </button>
                </div>
              </div>

              <div className="review-list">
                {filteredReview.map((item, idx) => (
                  <article
                    key={idx}
                    className={`review-card ${item.isCorrect ? 'is-correct' : 'is-wrong'}`}
                    dir={item.question.rtl ? 'rtl' : 'ltr'}
                  >
                    <div className="review-card__header">
                      <span className={`review-badge ${item.isCorrect ? 'badge--correct' : 'badge--wrong'}`}>
                        {item.isCorrect ? (
                          <>
                            <CheckCircleIcon width="14" height="14" /> Correct ({item.timeDelta})
                          </>
                        ) : (
                          <>
                            <CloseIcon width="14" height="14" /> Missed ({item.timeDelta})
                          </>
                        )}
                      </span>
                      <span className="review-card__topic">
                        {item.question.trackTitle} • {item.question.unitTitle}
                      </span>
                    </div>

                    <p className={`review-card__prompt ${item.question.rtl ? 'urdu' : ''}`}>
                      {item.question.prompt}
                    </p>

                    <div className="review-card__choices">
                      <div className="review-choice user-choice">
                        <span className="choice-lbl">Your Answer:</span>
                        <span className="choice-val">
                          {String.fromCharCode(65 + item.selectedChoice)}. {item.question.choices[item.selectedChoice]}
                        </span>
                      </div>
                      {!item.isCorrect && (
                        <div className="review-choice correct-choice">
                          <span className="choice-lbl">Correct Key:</span>
                          <span className="choice-val">
                            {String.fromCharCode(65 + item.question.answer)}. {item.question.choices[item.question.answer]}
                          </span>
                        </div>
                      )}
                    </div>

                    {item.question.explanation && (
                      <div className="review-card__explanation">
                        <strong>Explanation:</strong> {item.question.explanation}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
