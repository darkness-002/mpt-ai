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
      <article
        className="relative flex flex-col justify-between h-full p-6 sm:p-7 rounded-2xl border shadow-diffused hover:shadow-diffused-lg transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div>
          {/* Header row: category + badge */}
          <div className="flex items-center justify-between gap-3 mb-4">
            {category && (
              <span
                className="text-[11px] font-semibold tracking-wider uppercase"
                style={{ color: 'var(--muted)' }}
              >
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
          <h3
            className="font-['Space_Grotesk'] text-xl font-bold tracking-tight leading-snug transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400"
            style={{ color: 'var(--text)' }}
          >
            {title}
          </h3>

          {/* Tagline / body copy in muted */}
          {tagline && (
            <p
              className="mt-2.5 text-sm leading-relaxed line-clamp-2"
              style={{ color: 'var(--muted)' }}
            >
              {tagline}
            </p>
          )}

          {/* Metric hairline pill */}
          {metric && (
            <div
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              <span>{metric}</span>
            </div>
          )}

          {children}
        </div>

        {/* Footer Area: Progress bar & metadata */}
        <div
          className="mt-6 pt-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {typeof progress === 'number' && (
            <div className="mb-3">
              <div
                className="flex justify-between items-center text-xs font-medium mb-1.5"
                style={{ color: 'var(--muted)' }}
              >
                <span>Mastery Progress</span>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>
                  {progress}%
                </span>
              </div>
              <div
                className="h-1.5 w-full rounded-full overflow-hidden"
                style={{ background: 'var(--surface-3)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                    background: 'var(--primary)',
                  }}
                />
              </div>
            </div>
          )}

          {stats.length > 0 && (
            <div
              className="flex items-center justify-between text-xs font-medium"
              style={{ color: 'var(--muted)' }}
            >
              {stats.map((stat, i) => (
                <span key={i}>
                  <strong style={{ color: 'var(--text)' }}>{stat.value}</strong>{' '}
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
