import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  FlameIcon,
  TargetIcon,
  TrophyIcon,
  ZapIcon,
} from '../components/icons.jsx'
import ReadinessGauge from '../components/ReadinessGauge.jsx'
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
  const [matrixFilter, setMatrixFilter] = useState('all') // 'all' | 'needs-work' | 'mastered'

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
    const streakPct = Math.min(100, Math.round(((streakData.currentStreak || 0) / 7) * 100))

    // Weighted composite Readiness Index:
    // Coverage: 35%, Accuracy: 35%, SRS: 15%, Streak: 15%
    const readinessIndex = Math.min(
      100,
      Math.round(coveragePct * 0.35 + accuracyPct * 0.35 + srsMasteryPct * 0.15 + streakPct * 0.15),
    )

    // Subject breakdown to identify top weak spots
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
        const acc = uTotal > 0 ? Math.round((uScore / uTotal) * 100) : null
        const unitMistakes = mistakes.filter((m) => m.unitId === unit.id && !m.mastered).length

        subjectStats.push({
          trackId: track.id,
          trackTitle: track.title,
          exam: track.exam,
          unitId: unit.id,
          unitTitle: unit.title,
          rtl: unit.rtl,
          completedCount: done.length,
          totalCount: uLessons.length,
          accuracy: acc,
          pendingMistakes: unitMistakes,
          // Weakness score: lower accuracy & higher pending mistakes
          weaknessScore: (acc !== null ? (100 - acc) : 50) + unitMistakes * 10,
        })
      })
    })

    // Sort to identify top-3 weak spots (prioritizing attempted units with low accuracy or mistakes)
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

  const getStatusAdvice = (index) => {
    if (index >= 85) {
      return {
        label: 'Exam Ready',
        badgeClass: 'status-ready',
        advice: 'Outstanding preparation. High statistical probability of clearing the screening threshold. Focus on 200-MCQ timed mock simulations to cement exam stamina.',
      }
    }
    if (index >= 70) {
      return {
        label: 'Moderate Readiness',
        badgeClass: 'status-moderate',
        advice: 'Solid conceptual foundation. Target your lowest scoring subjects and resolve active SRS mistakes to push your score comfortably past the cutoff.',
      }
    }
    if (index >= 40) {
      return {
        label: 'Developing Preparation',
        badgeClass: 'status-developing',
        advice: 'Good initial traction. Continue completing structured unit lessons, practice daily 10-MCQ sprints, and maintain your streak consistency.',
      }
    }
    return {
      label: 'Early Stage',
      badgeClass: 'status-early',
      advice: 'Begin by working through the high-weightage syllabus units in FPSC CSS MPT and PPSC PMS. Daily practice builds momentum.',
    }
  }

  const status = getStatusAdvice(diagnosis.readinessIndex)

  // One-click 15-MCQ drill launcher
  const handleStartWeaknessDrill = (spot) => {
    if (!spot) return
    navigate(`/drill?trackId=${spot.trackId}&unitId=${spot.unitId}&count=15&autoStart=true`)
  }

  // Filtered diagnostic matrix
  const filteredMatrix = useMemo(() => {
    if (matrixFilter === 'needs-work') {
      return diagnosis.subjectStats.filter(
        (s) => (s.accuracy !== null && s.accuracy < 70) || s.pendingMistakes > 0,
      )
    }
    if (matrixFilter === 'mastered') {
      return diagnosis.subjectStats.filter((s) => s.accuracy !== null && s.accuracy >= 70)
    }
    return diagnosis.subjectStats
  }, [diagnosis.subjectStats, matrixFilter])

  return (
    <div className="readiness-page">
      <div className="readiness-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum Dashboard</span>
        </Link>
        <div className="readiness-title-wrap">
          <div className="readiness-icon-badge" aria-hidden="true">
            <TrophyIcon width="24" height="24" style={{ color: 'var(--amber-text)' }} />
          </div>
          <div>
            <h1>Civil Services Exam Readiness</h1>
            <p className="readiness-subtitle">
              Comprehensive diagnostic matrix assessing syllabus coverage, retention accuracy, mistake recovery, and exam qualifying odds.
            </p>
          </div>
        </div>
      </div>

      {/* Main Readiness Gauge Hero Card */}
      <div className="readiness-hero-card">
        <div className="readiness-gauge-container">
          <ReadinessGauge score={diagnosis.readinessIndex} size={190} strokeWidth={15} />
        </div>

        <div className="readiness-hero__body">
          <div className={`readiness-status-badge ${status.badgeClass}`}>
            {status.label} • {diagnosis.readinessIndex}% Composite
          </div>
          <h2 className="readiness-hero-heading">
            {diagnosis.readinessIndex >= 85
              ? 'Qualifying Benchmark Achieved'
              : diagnosis.readinessIndex >= 70
              ? 'On Track to Clear Benchmark'
              : 'Targeted Revision Recommended'}
          </h2>
          <p className="readiness-advice">{status.advice}</p>

          <div className="readiness-quick-stats">
            <div className="quick-stat">
              <span className="lbl">Syllabus Coverage</span>
              <strong className="val">{diagnosis.coveragePct}%</strong>
            </div>
            <div className="quick-stat">
              <span className="lbl">Exam Accuracy</span>
              <strong className="val">{diagnosis.accuracyPct}%</strong>
            </div>
            <div className="quick-stat">
              <span className="lbl">Mistake Clearance</span>
              <strong className="val">{diagnosis.srsMasteryPct}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Four Weighted Pillars Grid (35/35/15/15) */}
      <section className="readiness-section">
        <div className="section-title-wrap">
          <h2>Four Weighted Readiness Pillars</h2>
          <span className="section-subtitle">Core dimensions governing competitive civil service selection</span>
        </div>

        <div className="pillars-grid">
          {/* Pillar 1: Syllabus Coverage (35%) */}
          <div className="pillar-card">
            <div className="pillar-card__top">
              <span className="pillar-weight-badge">35% Weight</span>
              <span className="pillar-name">Syllabus Coverage</span>
            </div>
            <div className="pillar-metric-row">
              <strong className="pillar-val">{diagnosis.coveragePct}%</strong>
              <span className="pillar-metric-sub">curriculum cleared</span>
            </div>
            <div className="pillar-progress-track" aria-hidden="true">
              <div
                className="pillar-progress-fill fill--primary"
                style={{ width: `${diagnosis.coveragePct}%` }}
              />
            </div>
            <p className="pillar-desc">
              Percentage of total lessons and units completed across CSS MPT, Compulsory, and PMS tracks.
            </p>
          </div>

          {/* Pillar 2: Practice Accuracy (35%) */}
          <div className="pillar-card">
            <div className="pillar-card__top">
              <span className="pillar-weight-badge">35% Weight</span>
              <span className="pillar-name">Practice Accuracy</span>
            </div>
            <div className="pillar-metric-row">
              <strong className="pillar-val">{diagnosis.accuracyPct}%</strong>
              <span className="pillar-metric-sub">net accuracy</span>
            </div>
            <div className="pillar-progress-track" aria-hidden="true">
              <div
                className="pillar-progress-fill fill--green"
                style={{ width: `${diagnosis.accuracyPct}%` }}
              />
            </div>
            <p className="pillar-desc">
              Net score percentage across all attempted question runs, accounting for first and best attempts.
            </p>
          </div>

          {/* Pillar 3: SRS Mistake Recovery (15%) */}
          <div className="pillar-card">
            <div className="pillar-card__top">
              <span className="pillar-weight-badge">15% Weight</span>
              <span className="pillar-name">SRS Mistake Recovery</span>
            </div>
            <div className="pillar-metric-row">
              <strong className="pillar-val">{diagnosis.srsMasteryPct}%</strong>
              <span className="pillar-metric-sub">mistakes mastered</span>
            </div>
            <div className="pillar-progress-track" aria-hidden="true">
              <div
                className="pillar-progress-fill fill--gold"
                style={{ width: `${diagnosis.srsMasteryPct}%` }}
              />
            </div>
            <p className="pillar-desc">
              Percentage of previously incorrect questions reviewed through Spaced Repetition until mastered.
            </p>
          </div>

          {/* Pillar 4: Consistency & Streak (15%) */}
          <div className="pillar-card">
            <div className="pillar-card__top">
              <span className="pillar-weight-badge">15% Weight</span>
              <span className="pillar-name">Study Consistency</span>
            </div>
            <div className="pillar-metric-row">
              <strong className="pillar-val">{diagnosis.streakPct}%</strong>
              <span className="pillar-metric-sub">{streakData.currentStreak || 0} day streak</span>
            </div>
            <div className="pillar-progress-track" aria-hidden="true">
              <div
                className="pillar-progress-fill fill--teal"
                style={{ width: `${diagnosis.streakPct}%` }}
              />
            </div>
            <p className="pillar-desc">
              Daily study discipline and habit formation measured against a target 7-day consistency benchmark.
            </p>
          </div>
        </div>
      </section>

      {/* Critical Weak Spots & One-Click 15-MCQ Drill */}
      <section className="readiness-section">
        <div className="section-title-wrap">
          <h2>Top-3 Critical Weak Spots</h2>
          <span className="section-subtitle">Lowest accuracy and highest mistake accumulation areas</span>
        </div>

        {diagnosis.weakSpots.length === 0 ? (
          <div className="no-weakness-card">
            <CheckCircleIcon width="36" height="36" style={{ color: 'var(--green-text)', marginBottom: '0.5rem' }} />
            <h3>No Critical Weak Spots Detected!</h3>
            <p>You have high accuracy and no unresolved mistakes in your attempted subjects. Keep up the high standard!</p>
          </div>
        ) : (
          <div className="weak-spots-grid">
            {diagnosis.weakSpots.map((spot, idx) => (
              <div key={`${spot.trackId}-${spot.unitId}`} className="weak-spot-card">
                <div className="weak-spot-rank">#{idx + 1}</div>
                <div className="weak-spot-body">
                  <div className="weak-spot-tags">
                    <span className="spot-exam-tag">{spot.exam}</span>
                    <span className="spot-track-name">{spot.trackTitle}</span>
                  </div>
                  <h3 className={`spot-title ${spot.rtl ? 'urdu' : ''}`}>{spot.unitTitle}</h3>
                  <div className="spot-metrics">
                    <span className="metric-chip chip--accuracy">
                      Accuracy: <strong>{spot.accuracy !== null ? `${spot.accuracy}%` : 'Not tested'}</strong>
                    </span>
                    {spot.pendingMistakes > 0 && (
                      <span className="metric-chip chip--mistakes">
                        <FlameIcon width="12" height="12" /> {spot.pendingMistakes} Unresolved Mistakes
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary btn--small weak-spot-drill-btn"
                    onClick={() => handleStartWeaknessDrill(spot)}
                  >
                    <ZapIcon width="14" height="14" />
                    <span>Launch 15-MCQ Weakness Drill</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Full Diagnostic Matrix */}
      <section className="readiness-section">
        <div className="matrix-header-row">
          <div>
            <h2>Full Diagnostic Matrix</h2>
            <span className="section-subtitle">Complete syllabus unit inspection across all exam commissions</span>
          </div>

          <div className="matrix-filters" role="tablist" aria-label="Filter Matrix">
            <button
              type="button"
              className={`matrix-tab ${matrixFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setMatrixFilter('all')}
            >
              All Subjects ({diagnosis.subjectStats.length})
            </button>
            <button
              type="button"
              className={`matrix-tab ${matrixFilter === 'needs-work' ? 'is-active' : ''}`}
              onClick={() => setMatrixFilter('needs-work')}
            >
              Needs Work
            </button>
            <button
              type="button"
              className={`matrix-tab ${matrixFilter === 'mastered' ? 'is-active' : ''}`}
              onClick={() => setMatrixFilter('mastered')}
            >
              Mastered (70%+)
            </button>
          </div>
        </div>

        <div className="diagnostic-matrix-table-card">
          <div className="matrix-table-wrap">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Syllabus Unit</th>
                  <th>Exam Track</th>
                  <th>Lessons Cleared</th>
                  <th>Accuracy</th>
                  <th>Mistakes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrix.map((item) => (
                  <tr key={`${item.trackId}-${item.unitId}`}>
                    <td>
                      <span className={`matrix-unit-title ${item.rtl ? 'urdu' : ''}`}>
                        {item.unitTitle}
                      </span>
                    </td>
                    <td>
                      <span className="matrix-track-pill">{item.exam}</span>
                    </td>
                    <td>
                      <span className="matrix-progress-num">
                        {item.completedCount} / {item.totalCount}
                      </span>
                    </td>
                    <td>
                      {item.accuracy !== null ? (
                        <span className={`matrix-accuracy-pill ${item.accuracy >= 70 ? 'pill--green' : item.accuracy >= 50 ? 'pill--amber' : 'pill--red'}`}>
                          {item.accuracy}%
                        </span>
                      ) : (
                        <span className="matrix-not-started">Not started</span>
                      )}
                    </td>
                    <td>
                      {item.pendingMistakes > 0 ? (
                        <span className="matrix-mistakes-flag">
                          {item.pendingMistakes} due
                        </span>
                      ) : (
                        <span className="matrix-zero-mistakes">0</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="matrix-drill-action"
                        onClick={() => handleStartWeaknessDrill(item)}
                        title={`Start 15-MCQ drill on ${item.unitTitle}`}
                      >
                        Drill 15 →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
