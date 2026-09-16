import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SettingsModal from '../components/SettingsModal.jsx'
import {
  BarChartIcon,
  BookIcon,
  FlameIcon,
  SettingsIcon,
  StarIcon,
  TargetIcon,
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

  return (
    <>
      {/* Desktop & Mobile Header Bar */}
      <header className="tracks-header">
        <div className="tracks-header__top">
          <div className="brand-group">
            <Link className="brand" to="/">
              <BookIcon width="24" height="24" />
              <span>
                MPT<span className="brand__dot">·</span>AI
              </span>
            </Link>
            <span className="brand-tagline">Civil Service Prep Suite</span>
          </div>

          <div className="tracks-header__actions">
            <nav className="desktop-nav" aria-label="Desktop Navigation">
              <Link className="desktop-nav__link" to="/drill">
                <TargetIcon width="16" height="16" /> Drill
              </Link>
              <Link className="desktop-nav__link" to="/analytics">
                <BarChartIcon width="16" height="16" /> Analytics
              </Link>
              <Link className="desktop-nav__link" to="/mistakes">
                <FlameIcon width="16" height="16" style={{ color: '#f59e0b' }} /> Mistakes
                {dueMistakesCount > 0 && <span className="chip__badge">{dueMistakesCount}</span>}
              </Link>
              <Link className="desktop-nav__link" to="/bookmarks">
                <StarIcon width="16" height="16" style={{ color: 'var(--gold)' }} /> Starred
              </Link>
              <button
                type="button"
                className="desktop-nav__btn"
                onClick={() => setShowSettings(true)}
                title="Open Settings"
              >
                <SettingsIcon width="16" height="16" /> Settings
              </button>
            </nav>

            {canInstall && (
              <button className="btn btn--small" type="button" onClick={install}>
                Install App
              </button>
            )}
          </div>
        </div>

        {/* Daily Streak & Practice Widget */}
        <div className="streak-bar">
          <div className="streak-bar__item">
            <FlameIcon width="20" height="20" style={{ color: '#f59e0b' }} />
            <span>
              <strong>{streakData.currentStreak}</strong> day streak ·{' '}
              <strong>{streakData.todayCount}</strong>/{streakData.goal} solved today
            </span>
          </div>

          <div className="streak-bar__links">
            <Link className="chip" to="/drill">
              <TargetIcon width="14" height="14" /> Custom Drill
            </Link>
            <Link className="chip" to="/mistakes">
              Mistakes Bank
              {dueMistakesCount > 0 && <span className="chip__badge">{dueMistakesCount}</span>}
            </Link>
            <Link className="chip" to="/bookmarks">
              <StarIcon width="14" height="14" /> Starred
            </Link>
          </div>
        </div>

        <div className="hero-banner">
          <h1>Pick your exam track.</h1>
          <p className="tracks-header__blurb">
            {totalQuestions} MCQs from official past papers and curated sets — offline, mobile-first, and desktop-ready.
          </p>
        </div>

        {statusMsg && (
          <div className="tracks__status-alert" role="status">
            {statusMsg}
          </div>
        )}
      </header>

      <main className="tracks">
        {exams.map((exam) => (
          <section className="exam" key={exam.id}>
            <div className="exam__heading">
              <h2>{exam.title}</h2>
              {exam.blurb && <p>{exam.blurb}</p>}
            </div>

            <div className="exam__tracks">
              {tracks
                .filter((track) => track.exam === exam.id)
                .map((track) => {
                  const done = track.units
                    .flatMap((unit) => unit.lessons)
                    .filter((lesson) => records[lesson.id]).length
                  const percent = track.lessonCount > 0 ? Math.round((done / track.lessonCount) * 100) : 0

                  return (
                    <Link className="track" to={`/track/${track.id}`} key={track.id}>
                      <div className="track__top">
                        <h3>{track.title}</h3>
                        <span className="track__pill">{track.units.length} Subjects</span>
                      </div>
                      <p className="track__tagline">{track.tagline}</p>
                      <div className="track__bar">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <div className="track__meta">
                        <span>
                          <strong>{done}/{track.lessonCount}</strong> lessons
                        </span>
                        <span>{track.questionCount} MCQs</span>
                      </div>
                    </Link>
                  )
                })}
            </div>
          </section>
        ))}
      </main>

      <footer className="tracks-footer">
        <p>Progress is stored securely on this device and works 100% offline.</p>
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
    </>
  )
}
