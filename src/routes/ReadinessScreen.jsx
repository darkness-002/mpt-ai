import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  TrophyIcon,
  ZapIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { useProgress } from '../storage/progressContext.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { streakStore } from '../storage/streakStore.js'
import './ReadinessScreen.css'

export default function ReadinessScreen() {
  const navigate = useNavigate()
  const { tracks } = useContent()
  const { records } = useProgress()
  const [streakData] = useState(() => streakStore.load())
  const [mistakes, setMistakes] = useState([])

  useEffect(() => {
    let active = true
    mistakesStore.getAll().then((m) => {
      if (active) setMistakes(m)
    })
    return () => {
      active = false
    }
  }, [])

  // Diagnostic calculations
  const diagnosis = useMemo(() => {
    const allLessons = tracks.flatMap((t) => t.units.flatMap((u) => u.lessons))
    const totalLessonsCount = Math.max(1, allLessons.length)
    const completedLessons = allLessons.filter((l) => records[l.id])
    const coveragePct = Math.min(100, Math.round((completedLessons.length / totalLessonsCount) * 100))

    let totalScore = 0
    let totalPossible = 0
    Object.values(records).forEach((r) => {
      totalScore += r.bestScore ?? 0
      totalPossible += r.total ?? 0
    })
    const accuracyPct = totalPossible > 0 ? Math.min(100, Math.round((totalScore / totalPossible) * 100)) : 0

    // SRS mastery
    const masteredMistakes = mistakes.filter((m) => m.mastered).length
    const totalMistakesCount = mistakes.length
    const srsMasteryPct =
      totalMistakesCount > 0 ? Math.round((masteredMistakes / totalMistakesCount) * 100) : 100

    // Consistency (streak up to 7 days = 100%)
    const streakPct = Math.min(100, Math.round((streakData.currentStreak / 7) * 100))

    // Weighted composite Readiness Index
    // Coverage: 35%, Accuracy: 35%, SRS: 15%, Streak: 15%
    const readinessIndex = Math.min(
      100,
      Math.round(coveragePct * 0.35 + accuracyPct * 0.35 + srsMasteryPct * 0.15 + streakPct * 0.15),
    )

    // Subject breakdown to find weakest spots
    const subjectStats = []
    tracks.forEach((track) => {
      track.units.forEach((unit) => {
        const uLessons = unit.lessons
        const done = uLessons.filter((l) => records[l.id])
        let uScore = 0
        let uTotal = 0
        done.forEach((l) => {
          const r = records[l.id]
          if (r) {
            uScore += r.bestScore ?? 0
            uTotal += r.total ?? 0
          }
        })
        const acc = uTotal > 0 ? Math.round((uScore / uTotal) * 100) : 0
        const unitMistakes = mistakes.filter((m) => m.unitId === unit.id && !m.mastered).length

        subjectStats.push({
          trackId: track.id,
          trackTitle: track.title,
          unitId: unit.id,
          unitTitle: unit.title,
          completedCount: done.length,
          totalCount: uLessons.length,
          accuracy: acc,
          pendingMistakes: unitMistakes,
          // Weakness score: lower accuracy & higher pending mistakes
          weaknessScore: (100 - acc) + unitMistakes * 10,
        })
      })
    })

    // Sort to identify top weak spots (filtered to started units or units with mistakes)
    const weakSpots = subjectStats
      .filter((s) => s.completedCount > 0 || s.pendingMistakes > 0)
      .sort((a, b) => b.weaknessScore - a.weaknessScore)
      .slice(0, 3)

    return {
      readinessIndex,
      coveragePct,
      accuracyPct,
      srsMasteryPct,
      streakPct,
      weakSpots,
      subjectStats,
    }
  }, [tracks, records, mistakes, streakData])

  const getStatusText = (index) => {
    if (index >= 80) return { label: 'Exam Ready', color: 'var(--green)', advice: 'High probability of qualifying screening test. Focus on timed mocks to build stamina.' }
    if (index >= 60) return { label: 'Moderate Readiness', color: 'var(--blue)', advice: 'Solid foundation. Target your weakest subject areas and clear SRS mistakes.' }
    if (index >= 40) return { label: 'Developing Preparation', color: 'var(--gold)', advice: 'Continue completing unit lessons and maintain your daily streak.' }
    return { label: 'Early Stage', color: 'var(--red)', advice: 'Begin by working through the bite-sized lessons in each exam track.' }
  }

  const status = getStatusText(diagnosis.readinessIndex)

  const handleStartWeaknessDrill = (spot) => {
    if (!spot) return
    navigate(`/drill?trackId=${spot.trackId}&unitId=${spot.unitId}&autoStart=true`)
  }

  return (
    <div className="readiness-page">
      <div className="readiness-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum</span>
        </Link>
        <div className="readiness-title-wrap">
          <TrophyIcon width="24" height="24" style={{ color: 'var(--gold)' }} />
          <h1>Civil Services Exam Readiness</h1>
        </div>
        <p className="readiness-subtitle">
          AI diagnostic matrix evaluating your syllabus completion, accuracy retention, and mock exam readiness.
        </p>
      </div>

      {/* Main Readiness Score Hero Card */}
      <div className="readiness-hero-card">
        <div className="readiness-dial">
          <div className="readiness-dial__number" style={{ color: status.color }}>
            {diagnosis.readinessIndex}%
          </div>
          <span className="readiness-dial__label">Readiness Index</span>
        </div>

        <div className="readiness-hero__body">
          <div className="readiness-status-badge" style={{ backgroundColor: `${status.color}22`, color: status.color }}>
            {status.label}
          </div>
          <p className="readiness-advice">{status.advice}</p>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <h2 className="section-title">Readiness Pillars Breakdown</h2>
      <div className="pillars-grid">
        <div className="pillar-card">
          <div className="pillar-header">
            <span className="pillar-name">Syllabus Coverage</span>
            <strong className="pillar-value">{diagnosis.coveragePct}%</strong>
          </div>
          <div className="pillar-bar">
            <div className="pillar-bar-fill" style={{ width: `${diagnosis.coveragePct}%`, background: 'var(--blue)' }} />
          </div>
          <span className="pillar-desc">Lessons completed across curriculum</span>
        </div>

        <div className="pillar-card">
          <div className="pillar-header">
            <span className="pillar-name">Practice Accuracy</span>
            <strong className="pillar-value">{diagnosis.accuracyPct}%</strong>
          </div>
          <div className="pillar-bar">
            <div className="pillar-bar-fill" style={{ width: `${diagnosis.accuracyPct}%`, background: 'var(--green)' }} />
          </div>
          <span className="pillar-desc">Net score on first and best attempts</span>
        </div>

        <div className="pillar-card">
          <div className="pillar-header">
            <span className="pillar-name">SRS Mistake Recovery</span>
            <strong className="pillar-value">{diagnosis.srsMasteryPct}%</strong>
          </div>
          <div className="pillar-bar">
            <div className="pillar-bar-fill" style={{ width: `${diagnosis.srsMasteryPct}%`, background: 'var(--gold)' }} />
          </div>
          <span className="pillar-desc">Missed questions revised to mastery</span>
        </div>

        <div className="pillar-card">
          <div className="pillar-header">
            <span className="pillar-name">Study Consistency</span>
            <strong className="pillar-value">{diagnosis.streakPct}%</strong>
          </div>
          <div className="pillar-bar">
            <div className="pillar-bar-fill" style={{ width: `${diagnosis.streakPct}%`, background: 'var(--purple)' }} />
          </div>
          <span className="pillar-desc">Daily practice streak discipline</span>
        </div>
      </div>

      {/* Critical Weak Spots & 1-Click Repair */}
      <h2 className="section-title">Critical Weak Spots Diagnosis</h2>
      {diagnosis.weakSpots.length === 0 ? (
        <div className="no-weakness-card">
          <CheckCircleIcon width="32" height="32" style={{ color: 'var(--green)', marginBottom: '0.5rem' }} />
          <h3>No Critical Weak Spots Detected!</h3>
          <p>You have high accuracy and no pending mistakes in your attempted units.</p>
        </div>
      ) : (
        <div className="weak-spots-list">
          {diagnosis.weakSpots.map((spot) => (
            <div key={`${spot.trackId}-${spot.unitId}`} className="weak-spot-card">
              <div className="weak-spot-icon">
                <AlertTriangleIcon width="20" height="20" />
              </div>
              <div className="weak-spot-info">
                <strong>{spot.unitTitle}</strong>
                <span>
                  {spot.trackTitle} • Accuracy: {spot.accuracy}% • {spot.pendingMistakes} Unresolved Mistakes
                </span>
              </div>
              <button
                type="button"
                className="btn btn--small btn--primary"
                onClick={() => handleStartWeaknessDrill(spot)}
              >
                <ZapIcon width="13" height="13" /> Strengthen Unit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
