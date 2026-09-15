import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookIcon, FlameIcon, StarIcon } from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { useInstallPrompt } from '../lib/useInstallPrompt.js'
import { exportProgressPayload, parseAndMergeProgress } from '../storage/adapter.js'
import { idb } from '../storage/idb.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { useProgress } from '../storage/progressContext.js'
import { streakStore } from '../storage/streakStore.js'
import './TracksScreen.css'

export default function TracksScreen() {
  const { exams, tracks, totalQuestions } = useContent()
  const { records } = useProgress()
  const { canInstall, install } = useInstallPrompt()
  const [streakData] = useState(() => streakStore.load())
  const [dueMistakesCount, setDueMistakesCount] = useState(0)
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
    const payload = exportProgressPayload(records)
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
      const merged = parseAndMergeProgress(text, records)
      await idb.putMany(merged)
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
      <header className="tracks-header">
        <div className="tracks-header__top">
          <div className="brand">
            <BookIcon width="22" height="22" />
            <span>
              MPT<span className="brand__dot">·</span>AI
            </span>
          </div>
          {canInstall && (
            <button className="btn btn--small" type="button" onClick={install}>
              Install app
            </button>
          )}
        </div>

        {/* Daily Streak & Practice Widget */}
        <div className="streak-bar">
          <div className="streak-bar__item">
            <FlameIcon width="18" height="18" style={{ color: '#f59e0b' }} />
            <span>
              <strong>{streakData.currentStreak}</strong> day streak ·{' '}
              <strong>{streakData.todayCount}</strong>/{streakData.goal} today
            </span>
          </div>

          <div className="streak-bar__links">
            <Link className="chip" to="/mistakes">
              Mistakes Bank
              {dueMistakesCount > 0 && <span className="chip__badge">{dueMistakesCount}</span>}
            </Link>
            <Link className="chip" to="/bookmarks">
              <StarIcon width="14" height="14" /> Starred
            </Link>
          </div>
        </div>

        <h1>Pick your paper.</h1>
        <p className="tracks-header__blurb">
          {totalQuestions} MCQs from real past papers and coached sets — offline, on your phone.
        </p>

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
                      <h3>{track.title}</h3>
                      <p className="track__tagline">{track.tagline}</p>
                      <div className="track__bar">
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <p className="track__meta">
                        <strong>
                          {done}/{track.lessonCount}
                        </strong>{' '}
                        lessons · {track.questionCount} questions
                      </p>
                    </Link>
                  )
                })}
            </div>
          </section>
        ))}
      </main>

      <footer className="tracks-footer">
        <p>Progress is stored on this device and works offline.</p>
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
          Dashboard — add your own questions →
        </Link>
      </footer>
    </>
  )
}
