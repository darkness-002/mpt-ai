import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FlameIcon,
  SparklesIcon,
  ZapIcon,
  BookIcon,
  CheckCircleIcon,
  OMRLogoMark,
} from '../components/icons.jsx'
import StreakPill from '../components/StreakPill.jsx'
import { useContent } from '../content/contentContext.js'
import { useInstallPrompt } from '../lib/useInstallPrompt.js'
import { dailyStore } from '../storage/dailyStore.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { useProgress } from '../storage/progressContext.js'
import { streakStore } from '../storage/streakStore.js'
import './TracksScreen.css'

export default function TracksScreen() {
  const { exams, tracks, ready } = useContent()
  const { records } = useProgress()
  const { canInstall, install } = useInstallPrompt()
  const [streakData, setStreakData] = useState(() => streakStore.load())
  const [todaySprint] = useState(() => dailyStore.getToday())
  const [dueMistakes, setDueMistakes] = useState(0)
  const [selectedExamTab, setSelectedExamTab] = useState('all')

  // Fetch count of SRS mistakes due for review
  useEffect(() => {
    let active = true
    mistakesStore.getDue().then((due) => {
      if (active) setDueMistakes(due.length)
    })
    return () => {
      active = false
    }
  }, [])

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

  if (!ready && tracks.length === 0) {
    return (
      <div className="simple-dashboard w-full min-h-[calc(100vh-4.5rem)] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <OMRLogoMark width="40" height="40" className="animate-pulse text-[var(--primary)]" />
          <p className="text-sm font-semibold text-[var(--muted)]">Loading syllabus curriculum…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="simple-dashboard w-full min-h-[calc(100vh-4.5rem)] p-4 md:p-8">
      <div className="simple-dashboard__container w-full max-w-7xl mx-auto flex flex-col gap-5 sm:gap-7">
        
        {/* PWA Install Notice if promptable */}
        {canInstall && (
          <div className="simple-install-bar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            <div className="flex items-center gap-2.5">
              <OMRLogoMark width="20" height="20" className="text-[var(--primary)] shrink-0" />
              <span className="text-sm text-[var(--text-body)]">
                Install MPT-AI on your home screen for instant offline exam practice.
              </span>
            </div>
            <button
              type="button"
              className="simple-btn simple-btn--primary min-h-[44px] px-5 py-2 w-full sm:w-auto rounded-xl text-sm font-semibold cursor-pointer"
              onClick={install}
            >
              Install App
            </button>
          </div>
        )}

        {/* 1. Header Greeting & Streak */}
        <header className="student-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-1">
          <div>
            <span className="student-greeting-sub text-xs sm:text-sm font-semibold tracking-wider text-[var(--muted)] uppercase font-mono">
               Civil Service Preparation 
            </span>
            <h1 className="student-greeting-title text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text)] mt-1">
              Study Desk
            </h1>
          </div>

          <StreakPill count={streakData.currentStreak} maxStreak={streakData.maxStreak} />
        </header>

        {/* Louder Review Banner (Retention Hook) - rendered above Hero card when mistakes are due */}
        {dueMistakes > 0 && (
          <section className="student-prompt-row w-full" aria-label="Spaced Repetition Review">
            <Link
              to="/mistakes"
              className="simple-prompt-card simple-prompt-card--review w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[var(--rose-border)] bg-[var(--rose-subtle)] hover:shadow-md transition-all text-left no-underline group"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="review-banner__icon w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-[var(--rose)] text-[var(--rose-fg,#ffffff)] shadow-xs transition-transform group-hover:scale-105">
                  <FlameIcon width="22" height="22" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="review-banner__title text-sm sm:text-base font-bold text-[var(--text)] truncate">
                      Questions Due for Spaced Review
                    </strong>
                    <span className="review-banner__badge px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[var(--rose)] text-[var(--rose-fg,#ffffff)] shadow-xs">
                      {dueMistakes} Due
                    </span>
                  </div>
                  <span className="review-banner__subtitle text-xs sm:text-sm text-[var(--muted)] line-clamp-1">
                     Reinforce weak concepts 
                  </span>
                </div>
              </div>
              <div className="flex items-center sm:self-center shrink-0">
                <span className="review-banner__btn w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--rose)] text-[var(--rose-fg,#ffffff)] font-bold text-xs sm:text-sm hover:brightness-105 active:scale-98 transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer">
                  <span>Review now</span>
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          </section>
        )}

        {/* 2. The Active Lesson Card (Hero) */}
        {resumeInfo && resumeInfo.track && (() => {
          const heroPct = resumeInfo.totalCount ? Math.round((resumeInfo.doneCount / resumeInfo.totalCount) * 100) : 0
          return (
            <section
              className="resume-hero-card w-full rounded-2xl p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 border border-[var(--border)] bg-[var(--surface)] shadow-xs relative overflow-hidden"
              aria-label="Current Lesson"
            >
              <div className="resume-hero-card__header flex items-center justify-between gap-3">
                <span className="resume-hero-card__tag text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--primary-subtle)] text-[var(--primary-text)] border border-[var(--primary-border)]">
                  {resumeInfo.isNew ? 'Start Curriculum' : 'Active Lesson'}
                </span>
              </div>

              <div className="resume-hero-card__body flex flex-col gap-1.5">
                <span className="resume-hero-card__track text-xs sm:text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
                  {resumeInfo.track.exam} · {resumeInfo.track.title}
                </span>
                <h2 className="resume-hero-card__title text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[var(--text)]">
                  {resumeInfo.lesson?.title ?? 'Lesson 1'}
                </h2>
                {resumeInfo.lesson?.subtitle && (
                  <p className="resume-hero-card__subtitle text-sm sm:text-base text-[var(--muted)] leading-relaxed">
                    {resumeInfo.lesson.subtitle}
                  </p>
                )}
              </div>

              {/* Visual Progress Bar (0% at 0 lessons - empty track) */}
              <div className="resume-hero-card__progress-track w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="resume-hero-card__progress-fill h-full bg-[var(--primary)] rounded-full transition-all duration-300"
                  style={{
                    width: `${heroPct}%`,
                  }}
                />
              </div>

              <div className="resume-hero-card__footer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <span className="resume-hero-card__stats text-xs sm:text-sm text-[var(--muted)] font-mono">
                  {resumeInfo.doneCount} of {resumeInfo.totalCount} lessons completed
                </span>

                <Link
                  to={resumeInfo.lesson ? `/lesson/${resumeInfo.lesson.id}` : `/track/${resumeInfo.track.id}`}
                  className="resume-hero-card__btn w-full sm:w-auto min-h-[44px] px-6 py-3 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm sm:text-base text-white bg-[var(--primary)] shadow-sm hover:brightness-105 active:scale-98 transition-all"
                >
                  <ZapIcon width="18" height="18" />
                  <span>{resumeInfo.isNew ? 'Start Track' : 'Resume Lesson'}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>
          )
        })()}

        {/* 3. Daily 10-MCQ Sprint */}
        <section className="student-prompt-row w-full" aria-label="Daily Sprint">
          <Link
            to="/daily"
            className="simple-prompt-card simple-prompt-card--sprint w-full min-h-[44px] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all"
          >
            <div className="simple-prompt-card__icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center shrink-0 bg-[var(--primary-subtle)] text-[var(--primary-text)]">
              <SparklesIcon width="20" height="20" />
            </div>
            <div className="simple-prompt-card__content flex flex-col gap-0.5 flex-1 min-w-0">
              <strong className="text-sm sm:text-base font-bold text-[var(--text)] truncate">
                {todaySprint
                  ? `Daily Sprint Complete (${todaySprint.score}/${todaySprint.total})`
                  : 'Daily 10-MCQ Sprint'}
              </strong>
              <span className="text-xs sm:text-sm text-[var(--muted)] line-clamp-1">
                {todaySprint
                  ? 'Review today’s sprint results and protect your daily streak.'
                  : '10 quick screening questions seeded fresh every 24 hours.'}
              </span>
            </div>
            <span className="simple-prompt-card__arrow text-lg font-bold text-[var(--muted)] shrink-0" aria-hidden="true">→</span>
          </Link>
        </section>

        {/* 4. Available Exam Tracks */}
        <section className="student-tracks-section w-full flex flex-col gap-4 sm:gap-5">
          <div className="student-tracks-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="student-section-title text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
              Exam Tracks
            </h2>
            <div className="student-track-tabs flex items-center gap-2 overflow-x-auto pb-1 max-w-full" role="tablist">
              <button
                type="button"
                className={`student-tab min-h-[44px] px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedExamTab === 'all'
                    ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border-strong)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] border border-transparent'
                }`}
                onClick={() => setSelectedExamTab('all')}
              >
                All ({tracks.length})
              </button>
              {exams.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  className={`student-tab min-h-[44px] px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                    selectedExamTab === ex.id
                      ? 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border-strong)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] border border-transparent'
                  }`}
                  onClick={() => setSelectedExamTab(ex.id)}
                >
                  {ex.title}
                </button>
              ))}
            </div>
          </div>

          {/* Tracks Grid: 1 column on mobile, 2 columns on desktop */}
          <div className="student-tracks-grid grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
            {filteredTracks.map((track) => {
              const allLessons = track.units.flatMap((u) => u.lessons)
              const done = allLessons.filter((l) => records[l.id]).length
              const percent = allLessons.length > 0 ? Math.round((done / allLessons.length) * 100) : 0
              const nextLesson = allLessons.find((l) => !records[l.id]) || allLessons[0]
              const estHours = Math.max(3, Math.round(allLessons.length * 0.35))
              const isPms = track.exam === 'PMS'

              return (
                <Link
                  key={track.id}
                  to={`/track/${track.id}`}
                  className={`student-track-card w-full min-h-[160px] p-5 sm:p-6 rounded-2xl flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] border-l-4 ${
                    isPms ? 'border-l-[var(--amber)]' : 'border-l-[var(--primary)]'
                  } hover:border-[var(--primary)] hover:-translate-y-1 hover:shadow-md transition-all duration-200 text-left no-underline group`}
                >
                  <div className="student-track-card__top flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5 font-mono">
                      <span>~{estHours} hrs</span>
                      <span>•</span>
                      <span>{track.units.length} Units</span>
                    </span>
                    <span className="student-track-card__count text-xs sm:text-sm text-[var(--muted)] font-mono font-medium">
                      {done}/{allLessons.length} lessons
                    </span>
                  </div>

                  <h3 className="student-track-card__title text-lg sm:text-xl font-bold tracking-tight text-[var(--text)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                    {track.title}
                  </h3>
                  <p className="student-track-card__desc text-xs sm:text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">
                    {track.tagline}
                  </p>

                  {/* Next lesson promise line */}
                  <div className="student-track-card__next flex items-center gap-1.5 text-xs text-[var(--text-body)] font-medium pt-1">
                    <span className="text-[var(--muted)]">Next:</span>
                    <span className="text-[var(--primary-text)] font-semibold truncate">
                      {nextLesson?.title || 'Orientation & Syllabus'}
                    </span>
                  </div>

                  <div className="student-track-card__meta flex items-center justify-between text-xs text-[var(--muted)] mt-auto pt-2">
                    <span className="font-medium text-[var(--muted)]">Progress</span>
                    <span className="font-mono font-bold text-[var(--primary-text)]">{percent}%</span>
                  </div>

                  <div className="student-track-card__bar-wrap w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className="student-track-card__bar h-full bg-[var(--primary)] rounded-full transition-all duration-300"
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
