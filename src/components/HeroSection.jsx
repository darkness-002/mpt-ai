import { Link } from 'react-router-dom'
import {
  FlameIcon,
  SparklesIcon,
  TargetIcon,
  ZapIcon,
} from './icons.jsx'

/**
 * HeroSection Component
 * Implements anti-generic design constraints:
 * - Asymmetric layout: 7-col / 5-col grid split breaking symmetry
 * - Left-aligned editorial typography (Space Grotesk + Plus Jakarta Sans)
 * - Strict geometry: rounded-2xl containers, rounded-full pills and buttons
 * - Subtle hairline borders (border-black/[0.06] / border-white/[0.08])
 * - Multi-layered diffused ambient shadows (shadow-diffused)
 * - Eye-strain reducing body contrast (zinc-700 / slate-300)
 */
export default function HeroSection({
  streakData = { currentStreak: 0, todayCount: 0, goal: 20 },
  resumeInfo = null,
  totalQuestions = 0,
  totalCleared = 0,
  onInstall = null,
  canInstall = false,
  dueMistakesCount = 0,
}) {
  return (
    <section className="relative w-full py-8 sm:py-12 lg:py-16">
      {/* Optional Install Notice banner */}
      {canInstall && onInstall && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-sm">
          <span className="font-medium">Install MPT-AI for instant offline access and standalone performance.</span>
          <button
            type="button"
            onClick={onInstall}
            className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
          >
            Install App
          </button>
        </div>
      )}

      {/* Asymmetric 7-col / 5-col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column (7 cols): Left-aligned Editorial Copy & CTAs */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          {/* Heading with tight tracking and rhythm */}
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.12]">
            Pass your screening exam <br className="hidden sm:inline" />
            <span className="text-primary-600 dark:text-primary-400">with confidence.</span>
          </h1>

          {/* Body copy: Zinc-700 anti-eyestrain */}
          <p className="mt-5 text-base sm:text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed max-w-xl">
            Practice real past questions, conquer tricky topics in minutes, and track your daily streak — 100% offline.
          </p>

          {/* Action Row */}
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            {resumeInfo && resumeInfo.lesson ? (
              <Link
                to={`/lesson/${resumeInfo.lesson.id}`}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-bold text-sm text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: 'var(--primary)',
                  boxShadow: '0 4px 16px -2px rgba(37,99,235,0.4)',
                  color: '#ffffff',
                }}
              >
                <ZapIcon width="16" height="16" className="fill-current text-white shrink-0" />
                <span>
                  {resumeInfo.isNew ? 'Start Lesson 1' : 'Resume Lesson'} · {resumeInfo.track.title}
                </span>
              </Link>
            ) : (
              <Link
                to="/daily"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                style={{
                  background: 'var(--primary)',
                  boxShadow: '0 4px 16px -2px rgba(37,99,235,0.4)',
                  color: '#ffffff',
                }}
              >
                <SparklesIcon width="16" height="16" className="text-white shrink-0" />
                <span>Start Daily Sprint</span>
              </Link>
            )}

            <Link
              to="/drill"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1.5px solid var(--border)',
              }}
            >
              <TargetIcon width="15" height="15" className="shrink-0" style={{ color: 'var(--primary)' }} />
              <span>Custom Drill</span>
            </Link>

            <Link
              to="/mistakes"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1.5px solid var(--border)',
              }}
            >
              <FlameIcon width="15" height="15" className="shrink-0" style={{ color: 'var(--gold-dark)' }} />
              <span>Review Mistakes</span>
              {dueMistakesCount > 0 && (
                <span
                  className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full"
                  style={{
                    background: 'var(--red-subtle)',
                    color: 'var(--red)',
                    border: '1px solid var(--red)',
                  }}
                >
                  {dueMistakesCount}
                </span>
              )}
            </Link>
          </div>

          {/* Micro-Metrics Bar */}
          <div
            className="mt-8 pt-6 border-t flex flex-wrap items-center gap-6 sm:gap-10 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <div>
              <strong className="text-sm font-bold" style={{ color: 'var(--text)' }}>{streakData.currentStreak}</strong>
              <span className="ml-1.5">Day Streak</span>
            </div>
            <div>
              <strong className="text-sm font-bold" style={{ color: 'var(--text)' }}>{streakData.todayCount}/{streakData.goal}</strong>
              <span className="ml-1.5">MCQs Today</span>
            </div>
            <div>
              <strong className="text-sm font-bold" style={{ color: 'var(--text)' }}>{totalQuestions}+</strong>
              <span className="ml-1.5">Questions</span>
            </div>
            <div>
              <strong className="text-sm font-bold" style={{ color: 'var(--text)' }}>{totalCleared}</strong>
              <span className="ml-1.5">Cleared Units</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Asymmetric Live Diagnostic / Next Focus Card */}
        <div className="lg:col-span-5">
          <div
            className="relative p-7 rounded-2xl border shadow-diffused transition-all"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            {/* Header pill */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span
                className="text-[11px] font-bold tracking-wider uppercase"
                style={{ color: 'var(--primary)' }}
              >
                ⚡ Active Study Focus
              </span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--green-subtle)',
                  color: 'var(--green-dark)',
                  border: '1px solid var(--green)',
                }}
              >
                PWA Offline Ready
              </span>
            </div>

            {/* Focus Card Body */}
            {resumeInfo && resumeInfo.track ? (
              <div>
                <h3
                  className="font-['Space_Grotesk'] text-xl font-bold tracking-tight"
                  style={{ color: 'var(--text)' }}
                >
                  {resumeInfo.track.title}
                </h3>
                <p
                  className="mt-1.5 text-xs font-medium"
                  style={{ color: 'var(--muted)' }}
                >
                  {resumeInfo.isNew
                    ? `Ready to begin: ${resumeInfo.lesson?.title ?? 'Lesson 1'}`
                    : `Next Up: ${resumeInfo.lesson?.title ?? 'Next Unit'}`}
                </p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div
                    className="flex justify-between text-xs font-semibold mb-1.5"
                    style={{ color: 'var(--muted)' }}
                  >
                    <span>Course Progress</span>
                    <span style={{ color: 'var(--text)' }}>
                      {Math.round((resumeInfo.doneCount / (resumeInfo.totalCount || 1)) * 100)}%
                    </span>
                  </div>
                  <div
                    className="h-2 w-full rounded-full overflow-hidden"
                    style={{ background: 'var(--surface-3)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round((resumeInfo.doneCount / (resumeInfo.totalCount || 1)) * 100)}%`,
                        background: 'var(--primary)',
                      }}
                    />
                  </div>
                </div>

                <div
                  className="mt-5 flex items-center justify-between pt-4 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {resumeInfo.doneCount} of {resumeInfo.totalCount} lessons completed
                  </span>
                  <Link
                    to={resumeInfo.lesson ? `/lesson/${resumeInfo.lesson.id}` : `/track/${resumeInfo.track.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: 'var(--primary)', color: '#ffffff' }}
                  >
                    <ZapIcon width="14" height="14" className="fill-current text-white shrink-0" />
                    <span>{resumeInfo.isNew ? 'Start Lesson' : 'Resume Lesson'}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <h3
                  className="font-['Space_Grotesk'] text-xl font-bold tracking-tight"
                  style={{ color: 'var(--text)' }}
                >
                  Daily Practice Challenge
                </h3>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  Solve 10 mixed MCQs daily to reinforce memory and build streak momentum.
                </p>

                <div
                  className="mt-5 p-4 rounded-xl border"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="text-[11px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    Sample Diagnostic MCQ
                  </div>
                  <p
                    className="text-xs font-medium leading-snug"
                    style={{ color: 'var(--text)' }}
                  >
                    Which mountain pass connects Chitral with Gilgit-Baltistan in northern Pakistan?
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        background: 'var(--primary-subtle)',
                        color: 'var(--primary)',
                      }}
                    >
                      Shandur Pass
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      · General Knowledge
                    </span>
                  </div>
                </div>

                <div
                  className="mt-5 flex items-center justify-between pt-4 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    10 questions · 5 mins
                  </span>
                  <Link
                    to="/daily"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm transition-all transform hover:-translate-y-0.5"
                    style={{ background: 'var(--primary)', color: '#ffffff' }}
                  >
                    <SparklesIcon width="13" height="13" className="text-white shrink-0" />
                    <span>Start Drill</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
