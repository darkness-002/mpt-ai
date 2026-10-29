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
    <div className="simple-dashboard w-full min-h-[calc(100vh-4.5rem)] p-4 md:p-8">
      <div className="simple-dashboard__container w-full max-w-7xl mx-auto flex flex-col gap-5 sm:gap-7">
        {/* PWA Install Notice if promptable */}
        {canInstall && (
          <div className="simple-install-bar flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]">
            <span className="text-sm text-[var(--muted)]">Install MPT-AI on your home screen for quick offline access.</span>
            <button
              type="button"
              className="simple-btn simple-btn--primary min-h-[44px] px-4 py-2 w-full sm:w-auto rounded-lg text-sm font-semibold"
              onClick={install}
            >
              Install App
            </button>
          </div>
        )}

        {/* 1. Header Greeting & Streak */}
        <header className="student-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-1">
          <div>
            <span className="student-greeting-sub text-xs sm:text-sm font-semibold tracking-wider text-[var(--muted)] uppercase">
              Civil Services Examination Screening
            </span>
            <h1 className="student-greeting-title text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text)] mt-1">
              Study Dashboard
            </h1>
          </div>

          <div className="student-streak-badge inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-full border border-[var(--border)] bg-[var(--surface-raised)] shadow-xs shrink-0 self-start sm:self-auto">
            <FlameIcon width="18" height="18" className="student-streak-flame text-[var(--gold)]" />
            <span className="text-sm font-medium text-[var(--text)]">
              <strong className="font-bold">{streakData.currentStreak}</strong> Day Streak
            </span>
          </div>
        </header>

        {/* 2. The Active Lesson Card (The obvious Start/Resume button) */}
        {resumeInfo && resumeInfo.track && (
          <section className="resume-hero-card w-full rounded-2xl p-5 sm:p-7 flex flex-col gap-4 sm:gap-5 border border-[var(--border)] bg-[var(--surface-raised)] shadow-xs relative overflow-hidden" aria-label="Current Lesson">
            <div className="resume-hero-card__header flex items-center justify-between gap-3">
              <span className="resume-hero-card__tag text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] border border-[rgba(37,99,235,0.2)]">
                {resumeInfo.isNew ? 'Start Syllabus' : 'Active Lesson'}
              </span>
              <span className="resume-hero-card__percent text-xs sm:text-sm font-bold text-[var(--teal)]">
                {Math.round((resumeInfo.doneCount / (resumeInfo.totalCount || 1)) * 100)}% Complete
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

            {/* Visual Progress Bar */}
            <div className="resume-hero-card__progress-track w-full h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="resume-hero-card__progress-fill h-full bg-gradient-to-r from-[var(--primary)] to-[var(--teal)] rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(6, Math.round((resumeInfo.doneCount / (resumeInfo.totalCount || 1)) * 100))}%`,
                }}
              />
            </div>

            <div className="resume-hero-card__footer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <span className="resume-hero-card__stats text-xs sm:text-sm text-[var(--muted)] font-medium">
                {resumeInfo.doneCount} of {resumeInfo.totalCount} lessons completed
              </span>

              <Link
                to={resumeInfo.lesson ? `/lesson/${resumeInfo.lesson.id}` : `/track/${resumeInfo.track.id}`}
                className="resume-hero-card__btn w-full sm:w-auto min-h-[44px] px-6 py-3 inline-flex items-center justify-center gap-2 rounded-full font-bold text-sm sm:text-base text-white bg-[var(--primary)] shadow-md hover:brightness-105 active:scale-98 transition-all"
              >
                <ZapIcon width="18" height="18" />
                <span>{resumeInfo.isNew ? 'Start Track' : 'Resume Lesson'}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        )}

        {/* 3. Simple Daily Sprint & Spaced-Repetition Prompt */}
        <section className="student-prompt-row w-full">
          {dueMistakes > 0 ? (
            <Link
              to="/mistakes"
              className="simple-prompt-card simple-prompt-card--review w-full min-h-[44px] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--red)] transition-all"
            >
              <div className="simple-prompt-card__icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center shrink-0 bg-[var(--red-subtle)] text-[var(--red)]">
                <FlameIcon width="20" height="20" />
              </div>
              <div className="simple-prompt-card__content flex flex-col gap-0.5 flex-1 min-w-0">
                <strong className="text-sm sm:text-base font-bold text-[var(--text)] truncate">
                  {dueMistakes} Questions Due for Review
                </strong>
                <span className="text-xs sm:text-sm text-[var(--muted)] line-clamp-1">
                  Strengthen memory in the Spaced Repetition Mistakes Bank
                </span>
              </div>
              <span className="simple-prompt-card__arrow text-lg font-bold text-[var(--muted)] shrink-0" aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link
              to="/daily"
              className="simple-prompt-card simple-prompt-card--sprint w-full min-h-[44px] p-4 sm:p-5 flex items-center gap-3 sm:gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--primary)] transition-all"
            >
              <div className="simple-prompt-card__icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center shrink-0 bg-[var(--primary-subtle)] text-[var(--primary)]">
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
                    ? 'Review today’s questions and keep your streak safe.'
                    : '10 quick screening test questions to stay consistent.'}
                </span>
              </div>
              <span className="simple-prompt-card__arrow text-lg font-bold text-[var(--muted)] shrink-0" aria-hidden="true">→</span>
            </Link>
          )}
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
                    ? 'bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] shadow-xs'
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
                      ? 'bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] shadow-xs'
                      : 'text-[var(--muted)] hover:text-[var(--text)] border border-transparent'
                  }`}
                  onClick={() => setSelectedExamTab(ex.id)}
                >
                  {ex.title}
                </button>
              ))}
            </div>
          </div>

          {/* Responsive CSS Grid: strictly 1 column on mobile, expanding to md:grid-cols-2 on larger screens */}
          <div className="student-tracks-grid grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
            {filteredTracks.map((track) => {
              const allLessons = track.units.flatMap((u) => u.lessons)
              const done = allLessons.filter((l) => records[l.id]).length
              const percent = allLessons.length > 0 ? Math.round((done / allLessons.length) * 100) : 0

              return (
                <Link
                  key={track.id}
                  to={`/track/${track.id}`}
                  className="student-track-card w-full min-h-[160px] p-5 sm:p-6 rounded-2xl flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--primary)] hover:-translate-y-0.5 hover:shadow-md transition-all text-left no-underline"
                >
                  <div className="student-track-card__top flex items-center justify-between gap-2">
                    <span className="student-track-card__badge text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--primary)] border border-[var(--border)]">
                      {track.exam}
                    </span>
                    <span className="student-track-card__count text-xs sm:text-sm text-[var(--muted)] font-medium">
                      {done}/{allLessons.length} lessons
                    </span>
                  </div>

                  <h3 className="student-track-card__title text-lg sm:text-xl font-bold tracking-tight text-[var(--text)] line-clamp-2">
                    {track.title}
                  </h3>
                  <p className="student-track-card__desc text-xs sm:text-sm text-[var(--muted)] line-clamp-2 leading-relaxed">
                    {track.tagline}
                  </p>

                  <div className="student-track-card__meta flex items-center gap-2 text-xs text-[var(--muted)] mt-auto pt-2">
                    <span>{track.units.length} Subjects</span>
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
