import { Link } from 'react-router-dom'

/**
 * FeatureCard Component
 * Implements anti-generic design constraints:
 * - Strict geometric rule: rounded-2xl container, rounded-full badges
 * - Subtle hairline border (border-black/[0.06] / border-white/[0.08])
 * - Multi-layer ambient diffused shadow (shadow-diffused)
 * - Space Grotesk heading with tight tracking & Zinc-700 body text
 * - Left-aligned asymmetric layout with generous whitespace
 */
export default function FeatureCard({
  title,
  tagline,
  category,
  metric,
  badge,
  badgeVariant = 'primary',
  progress,
  stats = [],
  to,
  children,
}) {
  const CardWrapper = to ? Link : 'div'
  const wrapperProps = to ? { to, className: 'group block no-underline text-inherit' } : {}

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
      case 'warning':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
      case 'primary':
      default:
        return 'bg-primary-500/10 text-primary-700 dark:text-primary-300 border-primary-500/20'
    }
  }

  return (
    <CardWrapper {...wrapperProps}>
      <article className="relative flex flex-col justify-between h-full p-6 sm:p-7 rounded-2xl bg-[#f5f5f3] dark:bg-[#13151f] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_4px_20px_-2px_rgba(12,13,17,0.03),0_0_3px_rgba(12,13,17,0.02),0_12px_32px_-4px_rgba(12,13,17,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(12,13,17,0.06),0_20px_48px_-8px_rgba(12,13,17,0.09)] transition-all duration-200 hover:-translate-y-0.5">
        <div>
          {/* Header row: category + badge */}
          <div className="flex items-center justify-between gap-3 mb-4">
            {category && (
              <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                {category}
              </span>
            )}
            {badge && (
              <span
                className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getBadgeStyle()}`}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Heading with strict rhythm */}
          <h3 className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {title}
          </h3>

          {/* Tagline / body copy in zinc-700 (anti-eyestrain) */}
          {tagline && (
            <p className="mt-2.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-2">
              {tagline}
            </p>
          )}

          {/* Metric hairline pill */}
          {metric && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 border border-black/[0.04] dark:border-white/[0.05]">
              <span>{metric}</span>
            </div>
          )}

          {children}
        </div>

        {/* Footer Area: Progress bar & metadata */}
        <div className="mt-6 pt-4 border-t border-black/[0.05] dark:border-white/[0.06]">
          {typeof progress === 'number' && (
            <div className="mb-3">
              <div className="flex justify-between items-center text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1.5">
                <span>Mastery Progress</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 dark:bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}

          {stats.length > 0 && (
            <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-400 font-medium">
              {stats.map((stat, i) => (
                <span key={i}>
                  <strong className="text-zinc-900 dark:text-zinc-100">{stat.value}</strong>{' '}
                  {stat.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </CardWrapper>
  )
}
