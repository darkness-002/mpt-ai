import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  FlameIcon,
  ZapIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { useProgress } from '../storage/progressContext.js'
import { settingsStore } from '../storage/settingsStore.js'
import { streakStore } from '../storage/streakStore.js'
import './StudyPlannerScreen.css'

export default function StudyPlannerScreen() {
  const { tracks, totalQuestions } = useContent()
  const { records } = useProgress()
  const [settings, setSettings] = useState(() => settingsStore.load())
  const [streakData] = useState(() => streakStore.load())

  const [examName, setExamName] = useState(settings.examTargetName || 'CSS MPT 2026')
  const [targetDate, setTargetDate] = useState(settings.examTargetDate || '2026-11-15')
  const [savedSuccess, setSavedSuccess] = useState(false)

  const calculations = useMemo(() => {
    const totalPossible = totalQuestions
    let completedCount = 0
    Object.values(records).forEach((r) => {
      completedCount += r.total ?? 0
    })

    const remainingQuestions = Math.max(0, totalPossible - completedCount)

    let daysLeft = 60
    if (targetDate) {
      const diffMs = new Date(targetDate) - new Date()
      daysLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }

    const requiredDailyMcqs = Math.ceil(remainingQuestions / daysLeft)
    const currentDailyPace = streakData.todayCount || 15

    let paceStatus = 'on-track'
    let paceMessage = 'You are on track to complete the syllabus in time.'

    if (currentDailyPace >= requiredDailyMcqs * 1.2) {
      paceStatus = 'ahead'
      paceMessage = 'Great work! You are ahead of schedule.'
    } else if (currentDailyPace < requiredDailyMcqs * 0.8) {
      paceStatus = 'behind'
      paceMessage = `You need to solve ${requiredDailyMcqs - currentDailyPace} more MCQs per day to finish on time.`
    }

    return {
      completedCount,
      remainingQuestions,
      daysLeft,
      requiredDailyMcqs,
      currentDailyPace,
      paceStatus,
      paceMessage,
    }
  }, [totalQuestions, records, targetDate, streakData])

  const handleSavePlanner = (e) => {
    e.preventDefault()
    const updated = {
      ...settings,
      examTargetName: examName,
      examTargetDate: targetDate,
    }
    settingsStore.save(updated)
    setSettings(updated)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  return (
    <div className="planner-page">
      <div className="planner-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum</span>
        </Link>
        <div className="planner-title-wrap">
          <CalendarIcon width="24" height="24" style={{ color: 'var(--green)' }} />
          <h1>Exam Study Pacing Planner</h1>
        </div>
        <p className="planner-subtitle">
          Calculate your target exam timeline, daily MCQ quota, and syllabus pacing health.
        </p>
      </div>

      {/* Target Countdown Card */}
      <div className="planner-hero-card">
        <div className="countdown-dial">
          <span className="countdown-days">{calculations.daysLeft}</span>
          <span className="countdown-label">Days Left</span>
        </div>

        <div className="planner-hero-info">
          <span className="target-exam-pill">{settings.examTargetName || examName}</span>
          <h2 className="target-pacing-headline">
            Solve <strong>{calculations.requiredDailyMcqs} MCQs / day</strong> to finish 100% syllabus
          </h2>
          <div className={`pacing-status-indicator is-${calculations.paceStatus}`}>
            {calculations.paceStatus === 'ahead' && <CheckCircleIcon width="16" height="16" />}
            {calculations.paceStatus === 'on-track' && <ZapIcon width="16" height="16" />}
            {calculations.paceStatus === 'behind' && <FlameIcon width="16" height="16" />}
            <span>{calculations.paceMessage}</span>
          </div>
        </div>
      </div>

      {/* Daily Metrics Row */}
      <div className="planner-metrics-grid">
        <div className="planner-metric-card">
          <span className="planner-metric-label">Remaining MCQs</span>
          <strong className="planner-metric-val">{calculations.remainingQuestions}</strong>
          <span className="planner-metric-sub">of {totalQuestions} total syllabus questions</span>
        </div>

        <div className="planner-metric-card">
          <span className="planner-metric-label">Target Daily Quota</span>
          <strong className="planner-metric-val">{calculations.requiredDailyMcqs}</strong>
          <span className="planner-metric-sub">MCQs required every day</span>
        </div>

        <div className="planner-metric-card">
          <span className="planner-metric-label">Today&apos;s Solved</span>
          <strong className="planner-metric-val">{calculations.currentDailyPace}</strong>
          <span className="planner-metric-sub">Against goal of {streakData.goal}</span>
        </div>
      </div>

      {/* Exam Target Date Configuration Form */}
      <div className="planner-form-card">
        <h3>Configure Your Target Exam Date</h3>
        <form onSubmit={handleSavePlanner} className="planner-form">
          <div className="form-fields-row">
            <label className="planner-label">
              <span>Target Exam Name:</span>
              <input
                type="text"
                className="planner-input"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. CSS MPT 2026"
                required
              />
            </label>

            <label className="planner-label">
              <span>Exam Date:</span>
              <input
                type="date"
                className="planner-input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn--primary">
              Save Study Target
            </button>
            {savedSuccess && <span className="save-toast">✓ Target saved successfully!</span>}
          </div>
        </form>
      </div>

      {/* Quick Subject Pacing Checklist */}
      <h3 className="section-title">Syllabus Breakdown Pacing</h3>
      <div className="subject-pacing-list">
        {tracks.map((track) => {
          const trackLessons = track.units.flatMap((u) => u.lessons)
          const done = trackLessons.filter((l) => records[l.id]).length
          const pct = Math.round((done / trackLessons.length) * 100)

          return (
            <div key={track.id} className="subject-pacing-row">
              <div className="subject-pacing-info">
                <strong>{track.title}</strong>
                <span>
                  {done} of {trackLessons.length} lessons completed ({pct}%)
                </span>
              </div>
              <div className="subject-progress-bar">
                <div className="subject-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <Link to={`/track/${track.id}`} className="btn btn--small btn--ghost">
                View Track →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
