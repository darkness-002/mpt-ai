import React, { useEffect, useRef, useState } from 'react'
import { PlayIcon, PauseIcon, RotateCcwIcon, SpeakerIcon } from './icons.jsx'
import './PomodoroDial.css'

/**
 * PomodoroDial - "The Reading Lamp" Deep Focus Timer Dial
 * Features:
 * - Circular SVG countdown progress dial
 * - Monospace digital timer readout (MM:SS)
 * - Built-in Web Audio API generator for Brown Noise, White Noise, and 528Hz Chime
 * - Touch targets >= 44px
 */
export default function PomodoroDial({
  initialMinutes = 25,
  onComplete,
  size = 220,
  strokeWidth = 10,
}) {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60)
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [ambientSound, setAmbientSound] = useState('none') // 'none' | 'brown' | 'white'

  const audioCtxRef = useRef(null)
  const noiseNodeRef = useRef(null)

  // Sound chime
  const play528HzChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(528, ctx.currentTime) // Solfeggio 528Hz
      osc.frequency.exponentialRampToValueAtTime(264, ctx.currentTime + 1.6)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 2.1)
    } catch {}
  }

  // Timer interval
  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsRunning(false)
          play528HzChime()
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, onComplete])

  // Ambient sound synthesizer
  useEffect(() => {
    if (ambientSound === 'none' || !isRunning) {
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
      if (ctx.state === 'suspended') ctx.resume()

      if (noiseNodeRef.current) {
        noiseNodeRef.current.stop()
        noiseNodeRef.current.disconnect()
      }

      const bufferSize = 2 * ctx.sampleRate
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)

      if (ambientSound === 'white') {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1
        }
      } else if (ambientSound === 'brown') {
        let lastOut = 0.0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          output[i] = (lastOut + 0.02 * white) / 1.02
          lastOut = output[i]
          output[i] *= 3.5
        }
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      const gain = ctx.createGain()
      gain.gain.value = 0.12
      whiteNoise.connect(gain)
      gain.connect(ctx.destination)

      whiteNoise.start()
      noiseNodeRef.current = whiteNoise
    } catch {}

    return () => {
      if (noiseNodeRef.current) {
        try {
          noiseNodeRef.current.stop()
          noiseNodeRef.current.disconnect()
        } catch {}
      }
    }
  }, [ambientSound, isRunning])

  const toggleRun = () => setIsRunning(!isRunning)

  const resetTimer = (newMinutes) => {
    const mins = newMinutes || initialMinutes
    setTotalSeconds(mins * 60)
    setTimeLeft(mins * 60)
    setIsRunning(false)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progressRatio = totalSeconds > 0 ? timeLeft / totalSeconds : 0
  const strokeDashoffset = circumference - progressRatio * circumference

  return (
    <div className="reading-pomodoro-dial">
      <div className="dial-svg-wrap" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            className="dial-track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            className="dial-progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        {/* Center Clock Digits */}
        <div className="dial-center-time">
          <span className="dial-digits">{formattedTime}</span>
          <span className="dial-state-label">{isRunning ? 'In Focus' : 'Paused'}</span>
        </div>
      </div>

      {/* Preset Duration Buttons */}
      <div className="dial-presets-row" role="group" aria-label="Preset durations">
        {[25, 50, 5, 15].map((m) => (
          <button
            key={m}
            type="button"
            className={`dial-preset-btn ${totalSeconds === m * 60 ? 'is-active' : ''}`}
            onClick={() => resetTimer(m)}
          >
            {m}m
          </button>
        ))}
      </div>

      {/* Dial Controls (44px touch targets) */}
      <div className="dial-controls-row">
        <button
          type="button"
          className="dial-ctrl-btn dial-ctrl-main"
          onClick={toggleRun}
          aria-label={isRunning ? 'Pause focus timer' : 'Start focus timer'}
        >
          {isRunning ? <PauseIcon width="20" height="20" /> : <PlayIcon width="20" height="20" />}
          <span>{isRunning ? 'Pause' : 'Focus'}</span>
        </button>

        <button
          type="button"
          className="dial-ctrl-btn dial-ctrl-reset"
          onClick={() => resetTimer()}
          title="Reset timer"
          aria-label="Reset timer"
        >
          <RotateCcwIcon width="18" height="18" />
        </button>
      </div>

      {/* Ambient Sound Selection */}
      <div className="dial-sound-bar">
        <SpeakerIcon width="14" height="14" className="dial-speaker-icon" />
        <span className="dial-sound-label">Desk Ambience:</span>
        <div className="dial-sound-options">
          {[
            { id: 'none', label: 'Off' },
            { id: 'brown', label: 'Brown Noise' },
            { id: 'white', label: 'White Noise' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              className={`dial-sound-btn ${ambientSound === s.id ? 'is-active' : ''}`}
              onClick={() => setAmbientSound(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
