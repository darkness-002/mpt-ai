import React from 'react'
import { FlameIcon } from './icons.jsx'
import './StreakPill.css'

/**
 * StreakPill - Study streak indicator badge
 * Features:
 * - Animated flame pulse
 * - Monospace day count
 * - WCAG AA accessible amber/gold styling
 */
export default function StreakPill({
  count = 0,
  maxStreak = 0,
  compact = false,
  onClick,
}) {
  const hasStreak = count > 0

  return (
    <div
      className={`reading-streak-pill ${hasStreak ? 'has-active-streak' : 'is-idle'} ${compact ? 'is-compact' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : 'status'}
      tabIndex={onClick ? 0 : undefined}
      title={`Current Streak: ${count} days (Best: ${maxStreak} days)`}
      aria-label={`Study streak: ${count} days`}
    >
      <span className="streak-flame-icon" aria-hidden="true">
        <FlameIcon width={compact ? '14' : '16'} height={compact ? '14' : '16'} />
      </span>
      <span className="streak-count">{count}</span>
      {!compact && <span className="streak-unit">{count === 1 ? 'day' : 'days'}</span>}
    </div>
  )
}
