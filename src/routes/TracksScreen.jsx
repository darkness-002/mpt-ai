import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SettingsModal from '../components/SettingsModal.jsx'
import {
  BookIcon,
  FlameIcon,
  SettingsIcon,
  StarIcon,
  TargetIcon,
  ZapIcon,
} from '../components/icons.jsx'

import { useContent } from '../content/contentContext.js'
import { useInstallPrompt } from '../lib/useInstallPrompt.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { useProgress } from '../storage/progressContext.js'
import { streakStore } from '../storage/streakStore.js'
import './TracksScreen.css'

export default function TracksScreen() {
  const { exams, tracks, totalQuestions } = useContent()
  const { records, exportProgress, importProgress } = useProgress()
  const { canInstall, install } = useInstallPrompt()
  const [streakData] = useState(() => streakStore.load())
  const [dueMistakesCount, setDueMistakesCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedExamTab, setSelectedExamTab] = useState('all')
  const fileInputRef = useRef(null)
  const [statusMsg, setStatusMsg] = useState(null)

  useEffect(() => {
    let active = true
    mistakesStore.getDue().then((due) => {
      if (active) setDueMistakesCount(due.length)
    })
    return () => {
      active = false
    }
  }, [])

  const handleExportProgress = () => {
    const payload = exportProgress()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mpt-ai-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatusMsg('Progress exported successfully.')
    setTimeout(() => setStatusMsg(null), 3500)
  }

  const handleImportProgress = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const merged = await importProgress(text)
      setStatusMsg(`Imported ${merged.length} progress records. Reloading...`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      alert(`Could not import progress: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  // Find the next recommended track / lesson to resume
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
    // If none partially started, suggest first track
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

  const filteredExams = useMemo(() => {
    if (selectedExamTab === 'all') return exams
    return exams.filter((e) => e.id === selectedExamTab)
  }, [exams, selectedExamTab])

  const totalCompletedLessons = useMemo(() => {
    return Object.keys(records).length
  }, [records])

  return (
    <div className="tracks-page">
      {/* Sleek Top Header Bar */}
      <header className="tracks-header">
        <div className="tracks-header__top">
          <div className="brand-group">
            <Link className="brand" to="/" aria-label="MPT-AI Home">
              <span className="brand-logo-disc">
                <BookIcon width="20" height="20" />
              </span>
              <span className="brand-text">
                MPT<span className="brand__dot">·</span>AI
              </span>
            </Link>
            <span className="brand-tagline">Civil Service Preparation</span>
          </div>

          <div className="tracks-header__actions">
            {canInstall && (
              <button className="btn btn--small btn--primary" type="button" onClick={install}>
                Install
              </button>
            )}

            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Open Settings"
              title="App Settings"
            >
              <SettingsIcon width="18" height="18" />
            </button>
          </div>
        </div>

        {/* Daily Streak & Practice Stats Ribbon */}
        <div className="streak-bar">
          <div className="streak-bar__item">
            <div className="streak-flame-disc">
              <FlameIcon width="20" height="20" />
            </div>
            <div className="streak-info">
              <span className="streak-title">
                <strong>{streakData.currentStreak}</strong> Day Streak
              </span>
              <span className="streak-subtitle">
                {streakData.todayCount}/{streakData.goal} MCQs solved today
              </span>
            </div>
          </div>

          <div className="streak-bar__links">
            <Link className="chip chip--accent" to="/drill">
              <TargetIcon width="14" height="14" /> Custom Drill
            </Link>
            <Link className="chip" to="/mistakes">
              <FlameIcon width="14" height="14" style={{ color: 'var(--gold)' }} /> Mistakes
              {dueMistakesCount > 0 && <span className="chip__badge">{dueMistakesCount}</span>}
            </Link>
            <Link className="chip" to="/bookmarks">
              <StarIcon width="14" height="14" style={{ color: 'var(--gold)' }} /> Starred
            </Link>
          </div>
        </div>


        {/* Hero Resume Practice Banner */}
        {resumeInfo && resumeInfo.track && (
          <div className="resume-hero-card">
            <div className="resume-hero-card__content">
              <span className="resume-pill">
                <ZapIcon width="13" height="13" /> {resumeInfo.isNew ? 'Get Started' : 'Continue Studying'}
              </span>
              <h2 className="resume-title">{resumeInfo.track.title}</h2>
              <p className="resume-subtitle">
                {resumeInfo.isNew
                  ? `Begin with Lesson 1: ${resumeInfo.lesson?.title ?? 'First Unit'}`
                  : `Next Up: ${resumeInfo.lesson?.title ?? 'Unit Lesson'} (${resumeInfo.doneCount}/${resumeInfo.totalCount} completed)`}
              </p>
            </div>
            <div className="resume-hero-card__action">
              {resumeInfo.lesson ? (
                <Link className="btn btn--primary" to={`/lesson/${resumeInfo.lesson.id}`}>
                  Resume Lesson →
                </Link>
              ) : (
                <Link className="btn btn--primary" to={`/track/${resumeInfo.track.id}`}>
                  View Track →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Exam Category Segmented Tabs */}
        <div className="exam-filter-bar" role="tablist" aria-label="Exam Track Filters">
          <button
            type="button"
            className={`filter-tab ${selectedExamTab === 'all' ? 'is-active' : ''}`}
            onClick={() => setSelectedExamTab('all')}
          >
            All Exams ({tracks.length})
          </button>
          {exams.map((exam) => {
            const count = tracks.filter((t) => t.exam === exam.id).length
            return (
              <button
                key={exam.id}
                type="button"
                className={`filter-tab ${selectedExamTab === exam.id ? 'is-active' : ''}`}
                onClick={() => setSelectedExamTab(exam.id)}
              >
                {exam.title} ({count})
              </button>
            )
          })}
        </div>

        {statusMsg && (
          <div className="tracks__status-alert" role="status">
            {statusMsg}
          </div>
        )}
      </header>

      <main className="tracks">
        {filteredExams.map((exam) => {
          const examTracks = tracks.filter((track) => track.exam === exam.id)
          if (examTracks.length === 0) return null

          return (
            <section className="exam" key={exam.id}>
              <div className="exam__heading">
                <div className="exam__heading-left">
                  <h2>{exam.title}</h2>
                  {exam.blurb && <p>{exam.blurb}</p>}
                </div>
                <span className="exam-track-count">
                  {examTracks.length} {examTracks.length === 1 ? 'Track' : 'Tracks'}
                </span>
              </div>

              <div className="exam__tracks">
                {examTracks.map((track) => {
                  const done = track.units
                    .flatMap((unit) => unit.lessons)
                    .filter((lesson) => records[lesson.id]).length
                  const percent = track.lessonCount > 0 ? Math.round((done / track.lessonCount) * 100) : 0
                  const isCompleted = done === track.lessonCount && track.lessonCount > 0

                  return (
                    <Link className="track" to={`/track/${track.id}`} key={track.id}>
                      <div className="track__top">
                        <div className="track__title-wrap">
                          <h3>{track.title}</h3>
                          <span className="track__exam-tag">{exam.title}</span>
                        </div>
                        {isCompleted ? (
                          <span className="track__badge track__badge--completed">Completed</span>
                        ) : percent > 0 ? (
                          <span className="track__badge track__badge--progress">{percent}%</span>
                        ) : (
                          <span className="track__badge">{track.units.length} Subjects</span>
                        )}
                      </div>

                      <p className="track__tagline">{track.tagline}</p>

                      {track.blueprint && (
                        <div className="track__rules-pill">
                          <span>{track.blueprint.totalMcqs} MCQs · {track.blueprint.minutes} mins</span>
                          <span>
                            {track.blueprint.negativeMarking > 0
                              ? `-${track.blueprint.negativeMarking} wrong`
                              : 'No negative marking'}
                          </span>
                        </div>
                      )}

                      <div className="track__bar">
                        <span style={{ width: `${percent}%` }} />
                      </div>

                      <div className="track__meta">
                        <span>
                          <strong>{done}/{track.lessonCount}</strong> lessons
                        </span>
                        <span>{track.questionCount} Questions</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>

      <footer className="tracks-footer">
        <div className="tracks-footer__stats">
          <span>{totalQuestions} Verified MCQs Available</span>
          <span>·</span>
          <span>{totalCompletedLessons} Lessons Cleared</span>
          <span>·</span>
          <span>100% Offline Capable</span>
        </div>
        <div className="tracks-footer__backup">
          <button className="btn btn--small btn--ghost" type="button" onClick={handleExportProgress}>
            Export Progress JSON
          </button>
          <button
            className="btn btn--small btn--ghost"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Progress JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImportProgress}
          />
        </div>

        <Link className="tracks-footer__admin" to="/admin">
          Authoring Suite & Past Paper PDF Importer →
        </Link>
      </footer>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}

