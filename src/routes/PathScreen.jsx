import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import LessonNode from '../components/LessonNode.jsx'
import {
  ArrowLeftIcon,
  BookIcon,
  CheckCircleIcon,
  StarIcon,
  TimerIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { useInstallPrompt } from '../lib/useInstallPrompt.js'
import { useProgress } from '../storage/progressContext.js'
import './PathScreen.css'

/** Unlocking runs unit by unit, so each unit shows one unlocked-but-unfinished "current" node. */
function lessonState(lesson, { records, isUnlocked }) {
  const record = records[lesson.id]
  if (record) return record.bestScore === record.total ? 'mastered' : 'done'
  return isUnlocked(lesson.id) ? 'current' : 'locked'
}

export default function PathScreen() {
  const { trackId } = useParams()
  const { getTrack } = useContent()
  const track = getTrack(trackId)
  const progress = useProgress()
  const { canInstall, install } = useInstallPrompt()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  if (!track) return <Navigate to="/" replace />

  const trackLessons = track.units.flatMap((unit) => unit.lessons)
  const completed = trackLessons.filter((lesson) => progress.records[lesson.id]).length
  const mastered = trackLessons.filter((lesson) => {
    const record = progress.records[lesson.id]
    return record && record.bestScore === record.total
  }).length
  const percent = Math.round((completed / trackLessons.length) * 100)
  const nextLesson = trackLessons.find((lesson) => !progress.records[lesson.id])
  const { blueprint } = track

  const handleReset = () => {
    progress.resetProgress()
    setShowResetConfirm(false)
  }

  return (
    <div className="path-page">
      <header className="path-header">
        <div className="path-header__top">
          <Link className="path-back-btn" to="/">
            <ArrowLeftIcon width="16" height="16" />
            <span>All Exams</span>
          </Link>

          <div className="path-header__top-actions">
            {canInstall && (
              <button className="btn btn--small btn--primary" type="button" onClick={install}>
                Install App
              </button>
            )}
          </div>
        </div>

        <div className="path-title-group">
          <span className="path-exam-badge">{track.exam}</span>
          <h1>{track.title}</h1>
          <p className="path-header__blurb">{track.tagline}</p>
        </div>

        {/* Exam Blueprint Info Card */}
        {blueprint && (
          <div className="blueprint-pill-bar">
            <span className="bp-chip">
              <BookIcon width="14" height="14" /> {blueprint.totalMcqs} MCQs
            </span>
            <span className="bp-chip">
              <TimerIcon width="14" height="14" /> {blueprint.minutes} Mins
            </span>
            <span className="bp-chip">
              <CheckCircleIcon width="14" height="14" /> Pass: {blueprint.passingMarks}/{blueprint.totalMcqs}
            </span>
            <span className="bp-chip bp-chip--penalty">
              {blueprint.negativeMarking > 0
                ? `-${blueprint.negativeMarking} Negative Marking`
                : 'No Negative Marking'}
            </span>
          </div>
        )}

        {track.note && <div className="path-header__note">{track.note}</div>}

        {/* Progress Card */}
        <div className="path-summary-card">
          <div className="path-summary__top">
            <div className="path-summary__meta">
              <span className="path-summary__title">Syllabus Progress</span>
              <span className="path-summary__stats">
                <strong>{completed}</strong> of {trackLessons.length} lessons ({percent}%)
              </span>
            </div>
            <span className="mastery-count-pill">
              <StarIcon width="14" height="14" style={{ color: 'var(--gold)' }} /> {mastered} Mastered
            </span>
          </div>

          <div className="path-summary__bar" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
            <span style={{ width: `${percent}%` }} />
          </div>

          <div className="path-summary__next">
            {nextLesson ? (
              <span>
                Next up: <strong>{nextLesson.title}</strong>
              </span>
            ) : (
              <span className="all-cleared-text">
                🎉 All lessons in this track completed! Take a full-length mock to test your score.
              </span>
            )}
          </div>
        </div>

        {/* Full-Length Mock Simulator Banner */}
        <div className="mock-launcher-card">
          <div className="mock-launcher-card__info">
            <span className="mock-pill">
              <TimerIcon width="14" height="14" /> Real Exam Simulator
            </span>
            <h3>Full-Length Timed Mock</h3>
            <p>
              {blueprint?.totalMcqs ?? 100} randomized MCQs under {blueprint?.minutes ?? 60} mins timed lockdown conditions with official score deduction rules.
            </p>
          </div>
          <Link className="btn btn--primary mock-launcher-btn" to={`/mock/${track.id}`}>
            Start Mock Exam →
          </Link>
        </div>
      </header>

      <main className="path">
        {track.units.map((unit) => (
          <section className="unit" key={unit.id} style={{ '--hue': unit.hue }}>
            <div className="unit__banner" dir={unit.rtl ? 'rtl' : 'ltr'}>
              <div className="unit__banner-info">
                <span className="unit-label">Subject Unit</span>
                <h2 className={unit.rtl ? 'urdu' : undefined}>{unit.title}</h2>
                <p className={unit.rtl ? 'urdu' : undefined}>{unit.tagline}</p>
              </div>

              {unit.marks ? (
                <span className="unit__marks" dir="ltr">
                  <span className="marks-val">{unit.marks}</span>
                  <small>/{blueprint?.totalMcqs ?? 100} Marks</small>
                </span>
              ) : (
                <span className="unit__marks" dir="ltr">
                  <span className="marks-val">{unit.questionCount}</span>
                  <small>Questions</small>
                </span>
              )}
            </div>

            {unit.note && <p className="unit__note">{unit.note}</p>}

            <ol className="unit__nodes">
              {unit.lessons.map((lesson, index) => (
                <LessonNode
                  key={lesson.id}
                  lesson={lesson}
                  position={index + 1}
                  state={lessonState(lesson, progress)}
                  record={progress.records[lesson.id]}
                />
              ))}
            </ol>
          </section>
        ))}
      </main>

      <footer className="path-footer">
        <p>
          {track.lessonCount} lessons · {track.questionCount} MCQs · Stored offline on this device.
        </p>
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={() => setShowResetConfirm(true)}
        >
          Reset Track Progress
        </button>
      </footer>

      {showResetConfirm && (
        <div className="modal-backdrop" onClick={() => setShowResetConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reset Track Progress?</h2>
            <p>
              This will clear your completed lessons and scores for this track on this device. Your mistakes bank and bookmarks will remain saved.
            </p>
            <div className="modal__actions">
              <button
                className="btn btn--small btn--ghost"
                type="button"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn--small"
                style={{ background: 'var(--red)', boxShadow: '0 3px 0 var(--red-dark)' }}
                type="button"
                onClick={handleReset}
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

