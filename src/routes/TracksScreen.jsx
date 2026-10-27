import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FlameIcon,
  SparklesIcon,
  ZapIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { useInstallPrompt } from '../lib/useInstallPrompt.js'
import { dailyStore } from '../storage/dailyStore.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { useProgress } from '../storage/progressContext.js'
import { streakStore } from '../storage/streakStore.js'
import './TracksScreen.css'

export default function TracksScreen() {
  const { exams, tracks } = useContent()
  const { records } = useProgress()
  const { canInstall, install } = useInstallPrompt()
  const [streakData] = useState(() => streakStore.load())
  const [todaySprint] = useState(() => dailyStore.getToday())
  const [dueMistakes, setDueMistakes] = useState(0)
  const [selectedExamTab, setSelectedExamTab] = useState('all')

  // Fetch count of SRS mistakes due for review
  useState(() => {
    let active = true
    mistakesStore.getDue().then((due) => {
      if (active) setDueMistakes(due.length)
    })
    return () => {
      active = false
    }
  })

  // Active student lesson to resume
  const resumeInfo = useMemo(() => {
    for (const track of tracks) {
      const allLessons = track.units.flatMap((u) => u.lessons)
      const unfinished = allLessons.find((l) => !records[l.id])
      const doneCount = allLessons.filter((l) => records[l.id]).length
      if (doneCount > 0 && unfinished) {
        return {
          track,
          lesson: unfinished,
          doneCount,
          totalCount: allLessons.length,
          isNew: false,
        }
      }
    }
    // Default to first lesson if not started
    if (tracks.length > 0) {
      const first = tracks[0]
      const firstLesson = first.units[0]?.lessons[0]
      return {
        track: first,
        lesson: firstLesson,
        doneCount: 0,
        totalCount: first.units.flatMap((u) => u.lessons).length,
        isNew: true,
      }
    }
    return null
  }, [tracks, records])

  const filteredTracks = useMemo(() => {
    if (selectedExamTab === 'all') return tracks
    return tracks.filter((t) => t.exam === selectedExamTab)
  }, [tracks, selectedExamTab])

  return (
    <div className="simple-dashboard">
      <div className="simple-dashboard__container">
        {/* PWA Install Notice if promptable */}
        {canInstall && (
          <div className="simple-install-bar">
            <span>Install MPT-AI on your home screen for quick offline access.</span>
            <button type="button" className="simple-btn simple-btn--primary" onClick={install}>
              Install
            </button>
          </div>
        )}

        {/* 1. Header Greeting & Streak */}
        <header className="student-header">
          <div>
            <span className="student-greeting-sub">Civil Services Examination Screening</span>
            <h1 className="student-greeting-title">Study Dashboard</h1>
          </div>

          <div className="student-streak-badge">
            <FlameIcon width="18" height="18" className="student-streak-flame" />
            <span><strong>{streakData.currentStreak}</strong> Day Streak</span>
          </div>
        </header>

        {/* 2. The Active Lesson Card (The obvious Start/Resume button) */}
        {resumeInfo && resumeInfo.track && (
          <section className="resume-hero-card" aria-label="Current Lesson">
            <div className="resume-hero-card__header">
              <span className="resume-hero-card__tag">
                {resumeInfo.isNew ? 'Start Syllabus' : 'Active Lesson'}
              </span>
              <span className="resume-hero-card__percent">
                {Math.round((resumeInfo.doneCount / (resumeInfo.totalCount || 1)) * 100)}% Complete
              </span>
            </div>

            <div className="resume-hero-card__body">
              <span className="resume-hero-card__track">{resumeInfo.track.exam} · {resumeInfo.track.title}</span>
              <h2 className="resume-hero-card__title">
                {resumeInfo.lesson?.title ?? 'Lesson 1'}
              </h2>
              {resumeInfo.lesson?.subtitle && (
                <p className="resume-hero-card__subtitle">{resumeInfo.lesson.subtitle}</p>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="resume-hero-card__progress-track">
              <div
                className="resume-hero-card__progress-fill"
                style={{
                  width: `${Math.max(6, Math.round((resumeInfo.doneCount / (resumeInfo.totalCount || 1)) * 100))}%`,
                }}
              />
            </div>

            <div className="resume-hero-card__footer">
              <span className="resume-hero-card__stats">
                {resumeInfo.doneCount} of {resumeInfo.totalCount} lessons completed
              </span>

              <Link
                to={resumeInfo.lesson ? `/lesson/${resumeInfo.lesson.id}` : `/track/${resumeInfo.track.id}`}
                className="resume-hero-card__btn"
              >
                <ZapIcon width="18" height="18" />
                <span>{resumeInfo.isNew ? 'Start Track' : 'Resume Lesson'}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        )}

        {/* 3. Simple Daily Sprint & Spaced-Repetition Prompt */}
        <section className="student-prompt-row">
          {dueMistakes > 0 ? (
            <Link to="/mistakes" className="simple-prompt-card simple-prompt-card--review">
              <div className="simple-prompt-card__icon">
                <FlameIcon width="18" height="18" />
              </div>
              <div className="simple-prompt-card__content">
                <strong>{dueMistakes} Questions Due for Review</strong>
                <span>Strengthen memory in the Spaced Repetition Mistakes Bank</span>
              </div>
              <span className="simple-prompt-card__arrow" aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link to="/daily" className="simple-prompt-card simple-prompt-card--sprint">
              <div className="simple-prompt-card__icon">
                <SparklesIcon width="18" height="18" />
              </div>
              <div className="simple-prompt-card__content">
                <strong>
                  {todaySprint
                    ? `Daily Sprint Complete (${todaySprint.score}/${todaySprint.total})`
                    : 'Daily 10-MCQ Sprint'}
                </strong>
                <span>
                  {todaySprint
                    ? 'Review today’s questions and keep your streak safe.'
                    : '10 quick screening test questions to stay consistent.'}
                </span>
              </div>
              <span className="simple-prompt-card__arrow" aria-hidden="true">→</span>
            </Link>
          )}
        </section>

        {/* 4. Available Exam Tracks */}
        <section className="student-tracks-section">
          <div className="student-tracks-header">
            <h2 className="student-section-title">Exam Tracks</h2>
            <div className="student-track-tabs" role="tablist">
              <button
                type="button"
                className={`student-tab ${selectedExamTab === 'all' ? 'is-active' : ''}`}
                onClick={() => setSelectedExamTab('all')}
              >
                All ({tracks.length})
              </button>
              {exams.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className={`student-tab ${selectedExamTab === ex.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedExamTab(ex.id)}
                >
                  {ex.title}
                </button>
              ))}
            </div>
          </div>

          <div className="student-tracks-grid">
            {filteredTracks.map((track) => {
              const allLessons = track.units.flatMap((u) => u.lessons)
              const done = allLessons.filter((l) => records[l.id]).length
              const percent = allLessons.length > 0 ? Math.round((done / allLessons.length) * 100) : 0

              return (
                <Link
                  key={track.id}
                  to={`/track/${track.id}`}
                  className="student-track-card"
                >
                  <div className="student-track-card__top">
                    <span className="student-track-card__badge">{track.exam}</span>
                    <span className="student-track-card__count">
                      {done}/{allLessons.length} lessons
                    </span>
                  </div>

                  <h3 className="student-track-card__title">{track.title}</h3>
                  <p className="student-track-card__desc">{track.tagline}</p>

                  <div className="student-track-card__meta">
                    <span>{track.units.length} Subjects</span>
                  </div>

                  <div className="student-track-card__bar-wrap">
                    <div
                      className="student-track-card__bar"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
