import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CardsIcon,
  FileTextIcon,
  SparklesIcon,
  TrophyIcon,
} from '../components/icons.jsx'
import HeroSection from '../components/HeroSection.jsx'
import FeatureCard from '../components/FeatureCard.jsx'

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
      {/* Hero Section with Asymmetrical 7/5 Layout & Anti-Generic Aesthetic */}
      <div className="tracks-hero">
        <HeroSection
          streakData={streakData}
          resumeInfo={resumeInfo}
          totalQuestions={totalQuestions}
          totalCleared={totalCompletedLessons}
          onInstall={install}
          canInstall={canInstall}
          dueMistakesCount={dueMistakesCount}
        />

        {/* Quick Study Modes Grid */}
        <div className="quick-modes-grid">
          <Link to="/daily" className="quick-mode-card quick-mode-card--gold">
            <div className="quick-mode-icon">
              <SparklesIcon width="18" height="18" />
            </div>
            <div className="quick-mode-text">
              <strong>Daily 10-MCQ Sprint</strong>
              <span>Today&apos;s challenge</span>
            </div>
          </Link>

          <Link to="/flashcards" className="quick-mode-card quick-mode-card--blue">
            <div className="quick-mode-icon">
              <CardsIcon width="18" height="18" />
            </div>
            <div className="quick-mode-text">
              <strong>Flashcards</strong>
              <span>Active recall review</span>
            </div>
          </Link>

          <Link to="/readiness" className="quick-mode-card quick-mode-card--green">
            <div className="quick-mode-icon">
              <TrophyIcon width="18" height="18" />
            </div>
            <div className="quick-mode-text">
              <strong>Readiness Score</strong>
              <span>Diagnostic analysis</span>
            </div>
          </Link>

          <Link to="/papers" className="quick-mode-card quick-mode-card--teal">
            <div className="quick-mode-icon">
              <FileTextIcon width="18" height="18" />
            </div>
            <div className="quick-mode-text">
              <strong>Past Papers Vault</strong>
              <span>2013–2026 papers</span>
            </div>
          </Link>
        </div>

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
      </div>

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
                    <FeatureCard
                      key={track.id}
                      to={`/track/${track.id}`}
                      title={track.title}
                      category={exam.title}
                      tagline={track.tagline}
                      metric={
                        track.blueprint
                          ? `${track.blueprint.totalMcqs} MCQs · ${track.blueprint.minutes} mins · ${
                              track.blueprint.negativeMarking > 0
                                ? `-${track.blueprint.negativeMarking} wrong`
                                : 'No negative marking'
                            }`
                          : null
                      }
                      badge={
                        isCompleted
                          ? 'Completed'
                          : percent > 0
                          ? `${percent}%`
                          : `${track.units.length} Subjects`
                      }
                      badgeVariant={
                        isCompleted
                          ? 'success'
                          : percent > 0
                          ? 'primary'
                          : 'neutral'
                      }
                      progress={percent}
                      stats={[
                        { label: 'lessons cleared', value: `${done}/${track.lessonCount}` },
                        { label: 'questions', value: track.questionCount },
                      ]}
                    />
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
          MPT-AI Studio · Examiner & Admin Console →
        </Link>
      </footer>
    </div>
  )
}

