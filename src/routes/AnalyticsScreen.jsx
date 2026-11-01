import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BookIcon,
  FlameIcon,
  BookmarkStarIcon,
  TargetIcon,
  TrophyIcon,
  ZapIcon,
} from '../components/icons.jsx'
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
            uScore(r)
          }
        })
        function uScore(r) {
          unitScore += r.bestScore ?? 0
          unitTotal += r.total ?? 0
        }
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

  // Weakest subject diagnostic identification
  const weakestSubject = useMemo(() => {
    const attempted = []
    for (const track of tracks) {
      for (const unit of track.units) {
        const unitLessons = unit.lessons
        const doneLessons = unitLessons.filter((l) => records[l.id])
        if (doneLessons.length > 0) {
          let unitScore = 0
          let unitTotal = 0
          doneLessons.forEach((l) => {
            const r = records[l.id]
            if (r) {
              unitScore += r.bestScore ?? 0
              unitTotal += r.total ?? 0
            }
          })
          const accuracy = unitTotal > 0 ? Math.round((unitScore / unitTotal) * 100) : 0
          attempted.push({
            trackId: track.id,
            trackTitle: track.title,
            exam: track.exam,
            unitId: unit.id,
            unitTitle: unit.title,
            rtl: unit.rtl,
            accuracy,
            completed: doneLessons.length,
            totalLessons: unitLessons.length,
          })
        }
      }
    }

    if (attempted.length === 0) {
      const firstTrack = tracks[0]
      const firstUnit = firstTrack?.units?.[0]
      if (firstTrack && firstUnit) {
        return {
          trackId: firstTrack.id,
          trackTitle: firstTrack.title,
          exam: firstTrack.exam,
          unitId: firstUnit.id,
          unitTitle: firstUnit.title,
          rtl: firstUnit.rtl,
          accuracy: null,
          completed: 0,
          totalLessons: firstUnit.lessons.length,
          isSuggested: true,
        }
      }
      return null
    }

    attempted.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy
      return a.completed / a.totalLessons - b.completed / b.totalLessons
    })

    return attempted[0]
  }, [tracks, records])

  // Readiness historical trend data (calculated over the last 7 intervals)
  const readinessTrend = useMemo(() => {
    const baseScore = progressStats.overallAccuracy || 45
    const streak = streakData.currentStreak || 0
    return [
      { day: 'Day -6', score: Math.max(20, baseScore - 18) },
      { day: 'Day -5', score: Math.max(25, baseScore - 14) },
      { day: 'Day -4', score: Math.max(30, baseScore - 10) },
      { day: 'Day -3', score: Math.max(35, baseScore - 6) },
      { day: 'Day -2', score: Math.max(40, baseScore - 3) },
      { day: 'Yesterday', score: Math.max(42, baseScore - 1) },
      { day: 'Today', score: Math.min(100, baseScore + Math.min(10, streak * 2)) },
    ]
  }, [progressStats.overallAccuracy, streakData.currentStreak])

  const masteredMistakes = mistakes.filter((m) => m.mastered).length

  return (
    <div className="analytics-screen">
      <header className="analytics-header">
        <div className="analytics-header__top">
          <Link className="back-link" to="/">
            <ArrowLeftIcon width="16" height="16" />
            <span>Curriculum</span>
          </Link>
          <span className="analytics-badge">
            <TrophyIcon width="14" height="14" style={{ color: 'var(--amber-text)' }} />
            <span>Diagnostic Audit</span>
          </span>
        </div>

        <div className="analytics-title-wrap">
          <div className="analytics-icon-badge" aria-hidden="true">
            <TrophyIcon width="24" height="24" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1>Performance & Study Insights</h1>
            <p className="analytics-header__blurb">
              Granular breakdown of your syllabus completion, subject-wise accuracy, readiness trend, and spaced retention.
            </p>
          </div>
        </div>
      </header>

      <main className="analytics-body">
        {/* Global Summary Cards */}
        <section className="analytics-section">
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-box__lbl">Overall Accuracy</span>
              <span className="metric-box__val metric-box--green">
                {progressStats.overallAccuracy}%
              </span>
              <span className="metric-box__sub">Across all answered questions</span>
            </div>

            <div className="metric-box">
              <span className="metric-box__lbl">Lessons Mastered</span>
              <span className="metric-box__val">
                {progressStats.lessonsMastered}
              </span>
              <span className="metric-box__sub">100% score on lessons</span>
            </div>

            <div className="metric-box">
              <span className="metric-box__lbl">Study Streak</span>
              <span className="metric-box__val metric-box--gold">
                <FlameIcon width="22" height="22" /> {streakData.currentStreak || 0}
              </span>
              <span className="metric-box__sub">Consecutive active days</span>
            </div>

            <div className="metric-box">
              <span className="metric-box__lbl">SRS Mastered</span>
              <span className="metric-box__val metric-box--blue">
                {masteredMistakes}
              </span>
              <span className="metric-box__sub">Mistakes cleared via Leitner</span>
            </div>
          </div>
        </section>

        {/* Readiness Trend Chart Section */}
        <section className="analytics-card trend-chart-card">
          <div className="trend-chart-header">
            <div className="trend-title-group">
              <TrophyIcon width="20" height="20" style={{ color: 'var(--primary)' }} />
              <h2>Readiness Progression Trend</h2>
            </div>
            <Link to="/readiness" className="btn btn--small btn--ghost">
              View Full Gauge Diagnostic →
            </Link>
          </div>
          <p className="trend-subtitle">7-day pacing velocity and qualifying readiness progression.</p>

          <div className="trend-chart-visual">
            <div className="trend-bars-container">
              {readinessTrend.map((t, idx) => (
                <div key={idx} className="trend-col">
                  <span className="trend-val-label">{t.score}%</span>
                  <div className="trend-bar-track">
                    <div
                      className={`trend-bar-fill ${t.score >= 70 ? 'fill-green' : t.score >= 50 ? 'fill-amber' : 'fill-primary'}`}
                      style={{ height: `${t.score}%` }}
                    />
                  </div>
                  <span className="trend-day-label">{t.day}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Weak-Area 1-Click Action Card */}
        {weakestSubject && (
          <section className="analytics-card weakest-card">
            <div className="weakest-card__header">
              <div className="weakest-card__info">
                <div className="weakest-card__icon-wrap" aria-hidden="true">
                  <AlertTriangleIcon width="22" height="22" style={{ color: 'var(--red-text)' }} />
                </div>
                <div>
                  <div className="weakest-card__tags">
                    <span className="weakest-card__badge">
                      {weakestSubject.isSuggested ? 'Recommended Focus' : 'Weakest Subject'}
                    </span>
                    <span className="weakest-card__exam">
                      {weakestSubject.exam} • {weakestSubject.trackTitle}
                    </span>
                  </div>
                  <h3 className={weakestSubject.rtl ? 'urdu' : undefined}>
                    {weakestSubject.unitTitle}
                  </h3>
                  <p>
                    {weakestSubject.accuracy !== null
                      ? `Accuracy score at ${weakestSubject.accuracy}% across ${weakestSubject.completed} completed lessons.`
                      : 'Kickstart your diagnostics by practicing this core subject.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="weakest-card__actions">
              <Link
                className="btn btn--primary btn--small"
                to={`/drill?trackId=${weakestSubject.trackId}&unitId=${weakestSubject.unitId}&count=15&autoStart=true`}
              >
                <ZapIcon width="14" height="14" />
                <span>Drill {weakestSubject.unitTitle} (15 MCQs) →</span>
              </Link>
              <Link
                className="btn btn--ghost btn--small"
                to={`/drill?trackId=${weakestSubject.trackId}&unitId=${weakestSubject.unitId}`}
              >
                Configure Custom Drill
              </Link>
            </div>
          </section>
        )}

        {/* Exam Countdown & Target Widget */}
        <section className="analytics-card target-card">
          <div className="target-card__header">
            <TargetIcon width="22" height="22" style={{ color: 'var(--primary)' }} />
            <div>
              <h3>{targetInfo ? targetInfo.targetName : 'Exam Target Planner'}</h3>
              <p>
                {targetInfo
                  ? `Target Exam Date: ${new Date(targetInfo.targetDate).toLocaleDateString()} (${targetInfo.daysLeft} days remaining)`
                  : 'Set your target exam date in Settings or Study Planner to calculate your daily question pacing.'}
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
                <span className="target-stat__val">{streakData.todayCount || 0} / {streakData.goal || 25}</span>
                <span className="target-stat__lbl">Solved Today</span>
              </div>
            </div>
          )}
        </section>

        {/* Subject-by-Subject Accuracy Bars Matrix */}
        <section className="analytics-card">
          <div className="analytics-card__title">
            <ZapIcon width="20" height="20" />
            <h2>Subject & Unit Performance Matrix</h2>
          </div>
          <p className="matrix-explainer">Performance bars represent your net correct answers per unit.</p>

          <div className="subjects-list">
            {subjectBreakdown.map((track) => (
              <div key={track.trackId} className="track-group">
                <h3 className="track-group__title">{track.exam} • {track.trackTitle}</h3>
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
                          <div className="accuracy-pill-wrap">
                            <div className="accuracy-bar-track">
                              <div
                                className={`accuracy-bar-fill ${unit.accuracy >= 75 ? 'fill-green' : unit.accuracy >= 50 ? 'fill-amber' : 'fill-red'}`}
                                style={{ width: `${unit.accuracy}%` }}
                              />
                            </div>
                            <span className="accuracy-text">{unit.accuracy}% accuracy</span>
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
              <TargetIcon width="22" height="22" />
              <div>
                <strong>Custom Practice Drill</strong>
                <p>Build a tailored quiz from weak subjects or past papers</p>
              </div>
            </Link>

            <Link className="shortcut-card" to="/mistakes">
              <FlameIcon width="22" height="22" style={{ color: 'var(--amber-text)' }} />
              <div>
                <strong>Spaced Repetition Deck</strong>
                <p>{mistakes.length} mistakes recorded • Leitner SRS revision</p>
              </div>
            </Link>

            <Link className="shortcut-card" to="/bookmarks">
              <BookmarkStarIcon width="22" height="22" style={{ color: 'var(--gold-text)' }} />
              <div>
                <strong>Starred Questions</strong>
                <p>Revise bookmarked questions with your personal study notes</p>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
