import React from 'react'
import './ReadinessGauge.css'

/**
 * ReadinessGauge - Circular readiness gauge
 * - 4 Status Tiers (<40 red, 40-69 amber, 70-84 teal/primary, 85+ green)
 * - Monospace score readout
 * - Smooth SVG radial progress ring
 */
export default function ReadinessGauge({
  score = 0, // 0 - 100
  size = 180,
  strokeWidth = 14,
  label = 'Readiness',
  subtitle,
}) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  // 4 Status Tiers
  let tier = {
    key: 'critical',
    label: 'Critically Behind',
    colorVar: 'var(--red)',
    textVar: 'var(--red-text)',
    subtleVar: 'var(--red-subtle)',
  }

  if (clampedScore >= 85) {
    tier = {
      key: 'ready',
      label: 'Exam Ready',
      colorVar: 'var(--green)',
      textVar: 'var(--green-text)',
      subtleVar: 'var(--green-subtle)',
    }
  } else if (clampedScore >= 70) {
    tier = {
      key: 'on-track',
      label: 'On Track',
      colorVar: 'var(--teal)',
      textVar: 'var(--teal-text)',
      subtleVar: 'var(--teal-subtle)',
    }
  } else if (clampedScore >= 40) {
    tier = {
      key: 'needs-work',
      label: 'Needs Work',
      colorVar: 'var(--amber)',
      textVar: 'var(--amber-text)',
      subtleVar: 'var(--amber-subtle)',
    }
  }

  return (
    <div
      className={`reading-readiness-gauge tier-${tier.key}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clampedScore}%, ${tier.label}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track Ring */}
        <circle
          className="gauge-track-ring"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Fill Ring */}
        <circle
          className="gauge-fill-ring"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          stroke={tier.colorVar}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      {/* Center Readout */}
      <div className="gauge-center-content">
        <span className="gauge-score-value">
          {clampedScore}
          <span className="gauge-percent-symbol">%</span>
        </span>
        <span className="gauge-tier-badge" style={{ color: tier.textVar, background: tier.subtleVar }}>
          {tier.label}
        </span>
        {subtitle && <span className="gauge-subtitle">{subtitle}</span>}
      </div>
    </div>
  )
}
