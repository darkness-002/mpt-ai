import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  FlameIcon,
  PlayIcon,
  RotateCcwIcon,
  TimerIcon,
  TrophyIcon,
  ZapIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { feedbackService } from '../lib/feedback.js'
import { shuffle } from '../lib/shuffle.js'
import './SpeedRunScreen.css'

const HIGHSCORE_KEY = 'mpt_ai_speedrun_highscore'

export default function SpeedRunScreen() {
  const { tracks } = useContent()
  const [gameState, setGameState] = useState('lobby') // 'lobby' | 'playing' | 'gameover'
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

  // Questions pool
  const allQuestions = useMemo(() => {
    return tracks.flatMap((t) =>
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
  }, [tracks])

  const [shuffledDeck, setShuffledDeck] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [feedbackEffect, setFeedbackEffect] = useState(null) // 'correct' | 'wrong'

  const currentQ = shuffledDeck[currentIndex]

  const handleGameOver = () => {
    setGameState('gameover')
    feedbackService.celebrate()
  }

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleGameOver()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [gameState])

  const startGame = () => {
    setShuffledDeck(shuffle(allQuestions))
    setCurrentIndex(0)
    setTimeLeft(60)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setFeedbackEffect(null)
    setGameState('playing')
  }

  const handleAnswer = (choiceIndex) => {
    if (!currentQ || gameState !== 'playing') return
    const isCorrect = choiceIndex === currentQ.answer

    if (isCorrect) {
      feedbackService.onCorrect()
      setFeedbackEffect('correct')
      setTimeout(() => setFeedbackEffect(null), 300)

      const newCombo = combo + 1
      setCombo(newCombo)
      if (newCombo > maxCombo) setMaxCombo(newCombo)

      // Points: 10 base * multiplier + bonus time
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
      // Add +3 seconds
      setTimeLeft((t) => Math.min(99, t + 3))
    } else {
      feedbackService.onWrong()
      setFeedbackEffect('wrong')
      setTimeout(() => setFeedbackEffect(null), 300)
      setCombo(0)

      if (suddenDeath) {
        handleGameOver()
        return
      }

      // Penalty: -5 seconds
      setTimeLeft((t) => Math.max(0, t - 5))
    }

    if (currentIndex < shuffledDeck.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setShuffledDeck(shuffle(allQuestions))
      setCurrentIndex(0)
    }
  }

  return (
    <div className={`speedrun-page ${feedbackEffect ? `is-${feedbackEffect}` : ''}`}>
      <div className="speedrun-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum</span>
        </Link>
        <div className="speedrun-title-wrap">
          <ZapIcon width="24" height="24" style={{ color: 'var(--purple)' }} />
          <h1>60-Second Speed Run</h1>
        </div>
      </div>

      {gameState === 'lobby' && (
        <div className="speedrun-lobby-card">
          <div className="lobby-hero-icon">
            <ZapIcon width="48" height="48" />
          </div>
          <h2>Rapid-Fire MCQ Sprint</h2>
          <p>
            Answer as many MCQs as you can before time runs out! Each correct answer adds{' '}
            <strong className="stat-green">+3 seconds</strong> and grows your combo multiplier. Incorrect answers cost{' '}
            <strong className="stat-red">-5 seconds</strong>.
          </p>

          <div className="lobby-stats-row">
            <div className="lobby-stat-box">
              <span className="lobby-stat-label">Personal Best</span>
              <span className="lobby-stat-val">
                <TrophyIcon width="18" height="18" style={{ color: 'var(--gold)' }} /> {highScore} pts
              </span>
            </div>
            <div className="lobby-stat-box">
              <span className="lobby-stat-label">Starting Time</span>
              <span className="lobby-stat-val">
                <TimerIcon width="18" height="18" /> 60s
              </span>
            </div>
          </div>

          <label className="sudden-death-toggle">
            <input
              type="checkbox"
              checked={suddenDeath}
              onChange={(e) => setSuddenDeath(e.target.checked)}
            />
            <span>
              <strong>Sudden Death Mode</strong> (1 mistake = Game Over immediately!)
            </span>
          </label>

          <button type="button" className="btn btn--primary btn--wide" onClick={startGame}>
            <PlayIcon width="18" height="18" /> Start Speed Run
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="speedrun-arena">
          {/* Top HUD */}
          <div className="arena-hud">
            <div className={`hud-timer ${timeLeft <= 10 ? 'is-danger' : ''}`}>
              <TimerIcon width="20" height="20" />
              <span>{timeLeft}s</span>
            </div>
            <div className="hud-score">
              <span className="hud-label">Score</span>
              <span className="hud-val">{score}</span>
            </div>
            <div className={`hud-combo ${combo >= 3 ? 'is-fire' : ''}`}>
              <FlameIcon width="18" height="18" />
              <span>{combo}x Combo</span>
            </div>
          </div>

          {/* Question Stem */}
          <div className="arena-q-card" dir={currentQ?.rtl ? 'rtl' : 'ltr'}>
            <span className="arena-q-topic">
              {currentQ?.trackTitle} • {currentQ?.unitTitle}
            </span>
            <h2 className={`arena-q-prompt ${currentQ?.rtl ? 'urdu' : ''}`}>{currentQ?.prompt}</h2>

            {/* Instant Choice Buttons */}
            <div className="arena-choices">
              {currentQ?.choices.map((choice, i) => (
                <button
                  key={i}
                  type="button"
                  className="arena-choice-btn"
                  onClick={() => handleAnswer(i)}
                >
                  <span className="choice-key-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="choice-stem-text">{choice}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="speedrun-gameover-card">
          <div className="gameover-trophy">
            <TrophyIcon width="48" height="48" style={{ color: 'var(--gold)' }} />
          </div>
          <h2>Time&apos;s Up!</h2>
          <div className="final-score-display">{score} pts</div>
          {score >= highScore && score > 0 && (
            <div className="new-record-badge">★ New High Score! ★</div>
          )}

          <div className="gameover-stats-grid">
            <div className="gameover-stat-item">
              <span className="label">Max Combo Streak</span>
              <span className="value">{maxCombo}x</span>
            </div>
            <div className="gameover-stat-item">
              <span className="label">Questions Cleared</span>
              <span className="value">{currentIndex}</span>
            </div>
            <div className="gameover-stat-item">
              <span className="label">All-Time High</span>
              <span className="value">{highScore} pts</span>
            </div>
          </div>

          <div className="gameover-actions">
            <button type="button" className="btn btn--primary" onClick={startGame}>
              <RotateCcwIcon width="16" height="16" /> Play Again
            </button>
            <Link to="/drill" className="btn btn--ghost">
              Back to Custom Drill
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
