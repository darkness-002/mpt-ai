import { useEffect, useRef, useState } from 'react'
import { CloseIcon, PauseIcon, PlayIcon, RotateCcwIcon, TimerIcon, SpeakerIcon } from './icons.jsx'
import { focusStore } from '../storage/focusStore.js'
import './FocusTimerModal.css'

export default function FocusTimerModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('focus25') // 'focus25' | 'focus50' | 'break5' | 'break15'
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [soundType, setSoundType] = useState('none') // 'none' | 'brown' | 'white'
  const [stats, setStats] = useState(() => focusStore.load())
  const volume = 0.3

  const audioCtxRef = useRef(null)
  const noiseNodeRef = useRef(null)
  const gainNodeRef = useRef(null)

  const durations = {
    focus25: 25 * 60,
    focus50: 50 * 60,
    break5: 5 * 60,
    break15: 15 * 60,
  }

  // Synthesized Chime sound
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(528, ctx.currentTime) // Solfeggio frequency 528Hz
      osc.frequency.exponentialRampToValueAtTime(264, ctx.currentTime + 1.5)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 2.1)
    } catch {}
  }

  // Handle mode changes
  const switchMode = (newMode) => {
    setMode(newMode)
    setTimeLeft(durations[newMode])
    setIsRunning(false)
  }

  // Timer countdown
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsRunning(false)
          playChime()
          if (mode === 'focus25' || mode === 'focus50') {
            const minutes = mode === 'focus25' ? 25 : 50
            const updated = focusStore.recordSession(minutes)
            if (updated) setStats(updated)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, mode])

  // Ambient sound generator via Web Audio API
  useEffect(() => {
    if (soundType === 'none' || !isRunning) {
      if (noiseNodeRef.current) {
        noiseNodeRef.current.stop()
        noiseNodeRef.current.disconnect()
        noiseNodeRef.current = null
      }
      return
    }

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      // Stop previous node
      if (noiseNodeRef.current) {
        noiseNodeRef.current.stop()
        noiseNodeRef.current.disconnect()
      }

      const bufferSize = 2 * ctx.sampleRate
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)

      if (soundType === 'white') {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1
        }
      } else if (soundType === 'brown') {
        let lastOut = 0.0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          output[i] = (lastOut + 0.02 * white) / 1.02
          lastOut = output[i]
          output[i] *= 3.5 // scale up brown noise
        }
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      const gain = ctx.createGain()
      gain.gain.value = volume

      whiteNoise.connect(gain)
      gain.connect(ctx.destination)

      gainNodeRef.current = gain
      noiseNodeRef.current = whiteNoise
      whiteNoise.start()
    } catch {}

    return () => {
      if (noiseNodeRef.current) {
        try {
          noiseNodeRef.current.stop()
          noiseNodeRef.current.disconnect()
        } catch {}
        noiseNodeRef.current = null
      }
    }
  }, [soundType, isRunning, volume])

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [volume])

  if (!isOpen) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const total = durations[mode]
  const progressPct = Math.round(((total - timeLeft) / total) * 100)

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal focus-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="focus-modal-title"
      >
        <div className="focus-modal__header">
          <div className="focus-modal__title-wrap">
            <TimerIcon width="20" height="20" style={{ color: 'var(--blue)' }} />
            <h2 id="focus-modal-title">Pomodoro Study Focus</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon width="18" height="18" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="focus-modes">
          <button
            type="button"
            className={`focus-mode-btn ${mode === 'focus25' ? 'is-active' : ''}`}
            onClick={() => switchMode('focus25')}
          >
            25m Focus
          </button>
          <button
            type="button"
            className={`focus-mode-btn ${mode === 'focus50' ? 'is-active' : ''}`}
            onClick={() => switchMode('focus50')}
          >
            50m Deep
          </button>
          <button
            type="button"
            className={`focus-mode-btn ${mode === 'break5' ? 'is-active' : ''}`}
            onClick={() => switchMode('break5')}
          >
            5m Break
          </button>
          <button
            type="button"
            className={`focus-mode-btn ${mode === 'break15' ? 'is-active' : ''}`}
            onClick={() => switchMode('break15')}
          >
            15m Rest
          </button>
        </div>

        {/* Large Timer Display */}
        <div className="focus-clock">
          <div className="focus-clock__digits">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="focus-progress-bar">
            <div className="focus-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Controls */}
        <div className="focus-controls">
          <button
            type="button"
            className={`btn ${isRunning ? 'btn--ghost' : 'btn--primary'} focus-btn-main`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? (
              <>
                <PauseIcon width="16" height="16" /> Pause
              </>
            ) : (
              <>
                <PlayIcon width="16" height="16" /> Start Focus
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn--ghost focus-btn-reset"
            onClick={() => {
              setTimeLeft(durations[mode])
              setIsRunning(false)
            }}
            title="Reset Timer"
          >
            <RotateCcwIcon width="16" height="16" />
          </button>
        </div>

        {/* Ambient Sound Options */}
        <div className="focus-ambient">
          <div className="focus-ambient__row">
            <span className="focus-ambient__label">
              <SpeakerIcon width="15" height="15" /> Ambient Focus Audio:
            </span>
            <div className="focus-sound-toggles">
              <button
                type="button"
                className={`focus-sound-pill ${soundType === 'none' ? 'is-active' : ''}`}
                onClick={() => setSoundType('none')}
              >
                Mute
              </button>
              <button
                type="button"
                className={`focus-sound-pill ${soundType === 'brown' ? 'is-active' : ''}`}
                onClick={() => setSoundType('brown')}
              >
                Brown Noise
              </button>
              <button
                type="button"
                className={`focus-sound-pill ${soundType === 'white' ? 'is-active' : ''}`}
                onClick={() => setSoundType('white')}
              >
                White Noise
              </button>
            </div>
          </div>
        </div>

        {/* Today's Study Stats */}
        <div className="focus-stats">
          <span>Today: <strong>{stats.completedSessions}</strong> focus blocks completed</span>
          <span><strong>{stats.totalMinutes}</strong> study mins</span>
        </div>
      </div>
    </div>
  )
}
