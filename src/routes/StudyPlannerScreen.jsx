import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  FlameIcon,
  TimerIcon,
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
  const [customDailyQuota, setCustomDailyQuota] = useState(settings.dailyGoal || 25)
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

    // Required daily MCQs to complete by the target date
    const requiredDailyMcqs = Math.ceil(remainingQuestions / daysLeft)
    const currentDailyPace = streakData.todayCount || 0

    // Pacing Health determination based on streak goal and actual solved today
    let paceStatus = 'on-track'
    let paceMessage = 'You are on track to complete the syllabus before the exam.'

    if (customDailyQuota >= requiredDailyMcqs * 1.25) {
      paceStatus = 'ahead'
      paceMessage = 'Optimal pace! You are pacing well ahead of the exam deadline.'
    } else if (customDailyQuota < requiredDailyMcqs) {
      paceStatus = 'behind'
      paceMessage = `At your selected quota, you need ${requiredDailyMcqs - customDailyQuota} more MCQs/day to finish all syllabus units on time.`
    }

    // Projected completion date with customDailyQuota
    const daysToFinishWithQuota = Math.ceil(remainingQuestions / Math.max(1, customDailyQuota))
    const projectedDate = new Date()
    projectedDate.setDate(projectedDate.getDate() + daysToFinishWithQuota)

    return {
      completedCount,
      remainingQuestions,
      daysLeft,
      requiredDailyMcqs,
      currentDailyPace,
      paceStatus,
      paceMessage,
      daysToFinishWithQuota,
      projectedDate: projectedDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }
  }, [totalQuestions, records, targetDate, streakData, customDailyQuota])

  const handleSavePlanner = (e) => {
    e.preventDefault()
    const updated = {
      ...settings,
      examTargetName: examName,
      examTargetDate: targetDate,
      dailyGoal: customDailyQuota,
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
          <span>Curriculum Dashboard</span>
        </Link>
        <div className="planner-title-wrap">
          <div className="planner-icon-badge" aria-hidden="true">
            <CalendarIcon width="24" height="24" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1>Exam Study Pacing Planner</h1>
            <p className="planner-subtitle">
              Set your target civil service examination date, calculate daily MCQ requirements, and monitor pacing health.
            </p>
          </div>
        </div>
      </div>

      {/* Target Countdown & Pacing Hero Card */}
      <div className="planner-hero-card">
        <div className="countdown-dial-wrap">
          <div className="countdown-dial">
            <span className="countdown-days">{calculations.daysLeft}</span>
            <span className="countdown-label">Days Left</span>
          </div>
        </div>

        <div className="planner-hero-info">
          <div className="target-exam-header-row">
            <span className="target-exam-pill">{settings.examTargetName || examName}</span>
            <span className="target-date-pill">Target: {new Date(targetDate).toLocaleDateString()}</span>
          </div>

          <h2 className="target-pacing-headline">
            Required Rate: <strong>{calculations.requiredDailyMcqs} MCQs / day</strong> to finish 100% syllabus
          </h2>

          <div className={`pacing-status-indicator is-${calculations.paceStatus}`}>
            {calculations.paceStatus === 'ahead' && <CheckCircleIcon width="18" height="18" />}
            {calculations.paceStatus === 'on-track' && <ZapIcon width="18" height="18" />}
            {calculations.paceStatus === 'behind' && <FlameIcon width="18" height="18" />}
            <div className="pacing-status-text">
              <strong className="status-title">
                Pacing Health: {calculations.paceStatus.replace('-', ' ').toUpperCase()}
              </strong>
              <span>{calculations.paceMessage}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Quota Slider Card */}
      <div className="planner-slider-card">
        <div className="slider-card-header">
          <div className="slider-card-title-group">
            <TimerIcon width="20" height="20" style={{ color: 'var(--primary)' }} />
            <h3>Interactive Daily Quota Simulator</h3>
          </div>
          <span className="current-slider-val">
            <strong>{customDailyQuota}</strong> MCQs / Day
          </span>
        </div>

        <p className="slider-explainer">
          Adjust the slider to simulate your daily practice target and preview your estimated syllabus completion date.
        </p>

        <div className="slider-container">
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={customDailyQuota}
            onChange={(e) => setCustomDailyQuota(Number(e.target.value))}
            className="quota-range-slider"
            aria-label="Adjust daily question quota"
          />
          <div className="slider-ticks">
            <span>10 MCQs (Light)</span>
            <span>25 MCQs (Recommended)</span>
            <span>60 MCQs (Intense)</span>
            <span>120 MCQs (Sprint)</span>
          </div>
        </div>

        <div className="slider-projection-strip">
          <div className="projection-item">
            <span className="projection-lbl">Projected Finish Date</span>
            <strong className="projection-val">{calculations.projectedDate}</strong>
          </div>
          <div className="projection-item">
            <span className="projection-lbl">Time to Completion</span>
            <strong className="projection-val">{calculations.daysToFinishWithQuota} Days</strong>
          </div>
          <div className="projection-item">
            <span className="projection-lbl">Margin to Exam</span>
            <strong className={`projection-val ${calculations.daysLeft >= calculations.daysToFinishWithQuota ? 'text-green' : 'text-red'}`}>
              {calculations.daysLeft >= calculations.daysToFinishWithQuota
                ? `+${calculations.daysLeft - calculations.daysToFinishWithQuota} Days buffer`
                : `-${calculations.daysToFinishWithQuota - calculations.daysLeft} Days behind deadline`}
            </strong>
          </div>
        </div>
      </div>

      {/* Daily Metrics Row */}
      <div className="planner-metrics-grid">
        <div className="planner-metric-card">
          <span className="planner-metric-label">Remaining MCQs</span>
          <strong className="planner-metric-val">{calculations.remainingQuestions}</strong>
          <span className="planner-metric-sub">of {totalQuestions} total questions</span>
        </div>

        <div className="planner-metric-card">
          <span className="planner-metric-label">Completed So Far</span>
          <strong className="planner-metric-val">{calculations.completedCount}</strong>
          <span className="planner-metric-sub">
            {totalQuestions > 0 ? Math.round((calculations.completedCount / totalQuestions) * 100) : 0}% of syllabus
          </span>
        </div>

        <div className="planner-metric-card">
          <span className="planner-metric-label">Solved Today</span>
          <strong className="planner-metric-val">{streakData.todayCount || 0}</strong>
          <span className="planner-metric-sub">Goal: {customDailyQuota} MCQs</span>
        </div>
      </div>

      {/* Target Exam Configuration Form */}
      <div className="planner-form-card">
        <h3>Exam Target Settings</h3>
        <p className="form-subtext">Update your examination milestone and sync pacing benchmarks.</p>
        <form onSubmit={handleSavePlanner} className="planner-form">
          <div className="form-fields-row">
            <label className="planner-label">
              <span>Target Exam:</span>
              <input
                type="text"
                className="planner-input"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. FPSC CSS MPT 2026"
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
              Save Study Target & Quota
            </button>
            {savedSuccess && <span className="save-toast">✓ Settings updated successfully!</span>}
          </div>
        </form>
      </div>

      {/* Subject Pacing Breakdown */}
      <section className="planner-breakdown-section">
        <h3 className="section-title">Track Pacing Progress</h3>
        <div className="subject-pacing-list">
          {tracks.map((track) => {
            const trackLessons = track.units.flatMap((u) => u.lessons)
            const done = trackLessons.filter((l) => records[l.id]).length
            const pct = trackLessons.length > 0 ? Math.round((done / trackLessons.length) * 100) : 0

            return (
              <div key={track.id} className="subject-pacing-row">
                <div className="subject-pacing-info">
                  <strong>{track.title}</strong>
                  <span>
                    {done} of {trackLessons.length} lessons completed ({pct}%)
                  </span>
                </div>
                <div className="subject-progress-bar" aria-hidden="true">
                  <div className="subject-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <Link to={`/track/${track.id}`} className="btn btn--small btn--ghost">
                  View Track →
                </Link>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
