import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookIcon, FlameIcon, StarIcon, TargetIcon, ZapIcon } from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { useProgress } from '../storage/progressContext.js'
import { settingsStore } from '../storage/settingsStore.js'
import { streakStore } from '../storage/streakStore.js'
import './AnalyticsScreen.css'

export default function AnalyticsScreen() {
  const { tracks, totalQuestions } = useContent()
  const { records } = useProgress()
  const [streakData] = useState(() => streakStore.load())
  const [mistakes, setMistakes] = useState([])
  const [settings] = useState(() => settingsStore.load())

  useEffect(() => {
    let active = true
    mistakesStore.getAll().then((all) => {
      if (active) setMistakes(all)
    })
    return () => {
      active = false
    }
  }, [])

  // Aggregate general progress
  const progressStats = useMemo(() => {
    const recordList = Object.values(records)
    const lessonsAttempted = recordList.length
    const lessonsMastered = recordList.filter((r) => r.bestScore === r.total).length

    let totalScoreSum = 0
    let totalPossibleSum = 0
    recordList.forEach((r) => {
      totalScoreSum += r.bestScore ?? 0
      totalPossibleSum += r.total ?? 0
    })

    const overallAccuracy = totalPossibleSum > 0 ? Math.round((totalScoreSum / totalPossibleSum) * 100) : 0

    return {
      lessonsAttempted,
      lessonsMastered,
      overallAccuracy,
      totalScoreSum,
      totalPossibleSum,
    }
  }, [records])

  // Subject-wise breakdown across tracks
  const subjectBreakdown = useMemo(() => {
    return tracks.map((track) => {
      const unitsData = track.units.map((unit) => {
        const unitLessons = unit.lessons
        const doneLessons = unitLessons.filter((l) => records[l.id])
        let unitScore = 0
        let unitTotal = 0
        doneLessons.forEach((l) => {
          const r = records[l.id]
          if (r) {
            unitScore += r.bestScore ?? 0
            unitTotal += r.total ?? 0
          }
        })
        const pct = unitTotal > 0 ? Math.round((unitScore / unitTotal) * 100) : null
        return {
          id: unit.id,
          title: unit.title,
          rtl: unit.rtl,
          completed: doneLessons.length,
          totalLessons: unitLessons.length,
          accuracy: pct,
        }
      })
      return {
        trackId: track.id,
        trackTitle: track.title,
        exam: track.exam,
        units: unitsData,
      }
    })
  }, [tracks, records])

  // Target exam countdown calculations
  const targetInfo = useMemo(() => {
    if (!settings.examTargetDate) return null
    const target = new Date(settings.examTargetDate)
    const now = new Date()
    const diffMs = target - now
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const remainingQuestions = Math.max(0, totalQuestions - progressStats.totalPossibleSum)
    const recommendedDaily = daysLeft > 0 ? Math.ceil(remainingQuestions / daysLeft) : remainingQuestions

    return {
      targetDate: settings.examTargetDate,
      targetName: settings.examTargetName || 'Target Exam',
      daysLeft,
      recommendedDaily,
      remainingQuestions,
    }
  }, [settings.examTargetDate, settings.examTargetName, totalQuestions, progressStats.totalPossibleSum])

  const masteredMistakes = mistakes.filter((m) => m.mastered).length

  return (
    <div className="analytics-screen">
      <header className="analytics-header">
        <div className="analytics-header__top">
          <Link className="brand" to="/">
            <BookIcon width="22" height="22" />
            <span>MPT·AI</span>
          </Link>
          <Link className="path-header__back" to="/">
            ← Curriculum
          </Link>
        </div>

        <h1>Performance & Study Insights</h1>
        <p className="analytics-header__blurb">
          Diagnostic breakdown of your study pacing, subject mastery, and examination readiness.
        </p>
      </header>

      <main className="analytics-body">
        {/* Exam Countdown & Target Widget */}
        <section className="analytics-card target-card">
          <div className="target-card__header">
            <TargetIcon width="22" height="22" style={{ color: 'var(--blue)' }} />
            <div>
              <h3>{targetInfo ? targetInfo.targetName : 'Exam Target Planner'}</h3>
              <p>
                {targetInfo
                  ? `Target Exam Date: ${new Date(targetInfo.targetDate).toLocaleDateString()}`
                  : 'Set your target exam date in Settings to calculate your daily question pacing.'}
              </p>
            </div>
          </div>

          {targetInfo && (
            <div className="target-card__stats">
              <div className="target-stat">
                <span className="target-stat__val">{targetInfo.daysLeft}</span>
                <span className="target-stat__lbl">Days Remaining</span>
              </div>
              <div className="target-stat">
                <span className="target-stat__val target-stat--highlight">
                  {targetInfo.recommendedDaily}
                </span>
                <span className="target-stat__lbl">Daily MCQs Needed</span>
              </div>
              <div className="target-stat">
                <span className="target-stat__val">{streakData.todayCount} / {streakData.goal}</span>
                <span className="target-stat__lbl">Solved Today</span>
              </div>
            </div>
          )}
        </section>

        {/* Global Overview Metrics */}
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-box__val metric-box--green">
              {progressStats.overallAccuracy}%
            </span>
            <span className="metric-box__lbl">Overall Accuracy</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__val">
              {progressStats.lessonsMastered}
            </span>
            <span className="metric-box__lbl">Lessons Mastered</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__val metric-box--gold">
              <FlameIcon width="20" height="20" /> {streakData.currentStreak}
            </span>
            <span className="metric-box__lbl">Day Streak</span>
          </div>

          <div className="metric-box">
            <span className="metric-box__val metric-box--blue">
              {masteredMistakes}
            </span>
            <span className="metric-box__lbl">SRS Items Mastered</span>
          </div>
        </div>

        {/* Subject-by-Subject Mastery Radar / Progress */}
        <section className="analytics-card">
          <div className="analytics-card__title">
            <ZapIcon width="20" height="20" />
            <h2>Subject & Unit Performance Matrix</h2>
          </div>

          <div className="subjects-list">
            {subjectBreakdown.map((track) => (
              <div key={track.trackId} className="track-group">
                <h3 className="track-group__title">{track.exam} · {track.trackTitle}</h3>
                <div className="units-table">
                  {track.units.map((unit) => (
                    <div key={unit.id} className="unit-stat-row">
                      <div className="unit-stat-row__info">
                        <span className={`unit-name${unit.rtl ? ' urdu' : ''}`} dir={unit.rtl ? 'rtl' : 'ltr'}>
                          {unit.title}
                        </span>
                        <span className="unit-progress">
                          {unit.completed}/{unit.totalLessons} lessons cleared
                        </span>
                      </div>

                      <div className="unit-stat-row__score">
                        {unit.accuracy !== null ? (
                          <div className="accuracy-pill">
                            <div
                              className="accuracy-bar"
                              style={{
                                width: `${unit.accuracy}%`,
                                backgroundColor:
                                  unit.accuracy >= 75
                                    ? 'var(--green)'
                                    : unit.accuracy >= 50
                                      ? 'var(--gold)'
                                      : 'var(--red)',
                              }}
                            />
                            <span>{unit.accuracy}% accuracy</span>
                          </div>
                        ) : (
                          <span className="not-started">Not started</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Revision Shortcuts */}
        <section className="analytics-card">
          <h2>Revision & Practice Hub</h2>
          <div className="shortcuts-grid">
            <Link className="shortcut-card" to="/drill">
              <TargetIcon width="24" height="24" />
              <div>
                <strong>Custom Practice Drill</strong>
                <p>Build a tailored quiz from weak subjects or past papers</p>
              </div>
            </Link>

            <Link className="shortcut-card" to="/mistakes">
              <FlameIcon width="24" height="24" style={{ color: '#f59e0b' }} />
              <div>
                <strong>Spaced Repetition Deck</strong>
                <p>{mistakes.length} mistakes recorded · Leitner SRS revision</p>
              </div>
            </Link>

            <Link className="shortcut-card" to="/bookmarks">
              <StarIcon width="24" height="24" style={{ color: 'var(--gold)' }} />
              <div>
                <strong>Starred Questions</strong>
                <p>Revise questions you starred during study sessions</p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
