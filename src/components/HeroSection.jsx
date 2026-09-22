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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white shadow-[0_4px_16px_-2px_rgba(37,99,235,0.35)] transition-all"
              >
                <ZapIcon width="16" height="16" className="fill-current text-white shrink-0" />
                <span>Resume Lesson ({resumeInfo.track.title})</span>
              </Link>
            ) : (
              <Link
                to="/daily"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white shadow-[0_4px_16px_-2px_rgba(37,99,235,0.35)] transition-all"
              >
                <SparklesIcon width="16" height="16" className="text-white shrink-0" />
                <span>Start Daily Sprint</span>
              </Link>
            )}

            <Link
              to="/drill"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm bg-[#f5f5f3] dark:bg-[#13151f] hover:bg-[#ebebe8] dark:hover:bg-[#1a1d2b] text-zinc-800 dark:text-zinc-200 border border-black/[0.08] dark:border-white/[0.1] transition-all"
            >
              <TargetIcon width="15" height="15" className="shrink-0 text-current" />
              <span>Custom Drill</span>
            </Link>

            <Link
              to="/mistakes"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-medium text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <FlameIcon width="15" height="15" className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Review Mistakes</span>
              {dueMistakesCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  {dueMistakesCount}
                </span>
              )}
            </Link>
          </div>

          {/* Micro-Metrics Bar */}
          <div className="mt-8 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center gap-6 sm:gap-10 text-xs text-zinc-600 dark:text-zinc-400">
            <div>
              <strong className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{streakData.currentStreak}</strong>
              <span className="ml-1.5">Day Streak</span>
            </div>
            <div>
              <strong className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{streakData.todayCount}/{streakData.goal}</strong>
              <span className="ml-1.5">MCQs Today</span>
            </div>
            <div>
              <strong className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{totalQuestions}+</strong>
              <span className="ml-1.5">Questions</span>
            </div>
            <div>
              <strong className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{totalCleared}</strong>
              <span className="ml-1.5">Cleared Units</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Asymmetric Live Diagnostic / Next Focus Card */}
        <div className="lg:col-span-5">
          <div className="relative p-7 rounded-2xl bg-[#f5f5f3] dark:bg-[#13151f] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(12,13,17,0.03),0_0_3px_rgba(12,13,17,0.02),0_12px_32px_-4px_rgba(12,13,17,0.05)]">
            {/* Header pill */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                Active Study Focus
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                PWA Offline Ready
              </span>
            </div>

            {/* Focus Card Body */}
            {resumeInfo && resumeInfo.track ? (
              <div>
                <h3 className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {resumeInfo.track.title}
                </h3>
                <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  {resumeInfo.isNew
                    ? `Ready to begin: ${resumeInfo.lesson?.title ?? 'Lesson 1'}`
                    : `Next Up: ${resumeInfo.lesson?.title ?? 'Next Unit'}`}
                </p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    <span>Course Progress</span>
                    <span>{Math.round((resumeInfo.doneCount / (resumeInfo.totalCount || 1)) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 dark:bg-primary-500 rounded-full"
                      style={{
                        width: `${Math.round((resumeInfo.doneCount / (resumeInfo.totalCount || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-4 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {resumeInfo.doneCount} of {resumeInfo.totalCount} lessons completed
                  </span>
                  <Link
                    to={resumeInfo.lesson ? `/lesson/${resumeInfo.lesson.id}` : `/track/${resumeInfo.track.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
                  >
                    <ZapIcon width="13" height="13" className="fill-current text-white shrink-0" />
                    <span>Continue</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Daily Practice Challenge
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Solve 10 mixed MCQs daily to reinforce memory and build streak momentum.
                </p>

                <div className="mt-5 p-4 rounded-xl bg-zinc-200/40 dark:bg-zinc-800/40 border border-black/[0.04] dark:border-white/[0.05]">
                  <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Sample Diagnostic MCQ
                  </div>
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-snug">
                    Which mountain pass connects Chitral with Gilgit-Baltistan in northern Pakistan?
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/10 text-primary-700 dark:text-primary-300">
                      Shandur Pass
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">· General Knowledge</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-4 border-t border-black/[0.05] dark:border-white/[0.06]">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">10 questions · 5 mins</span>
                  <Link
                    to="/daily"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-all"
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
