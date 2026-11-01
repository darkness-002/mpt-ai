import React from 'react'
import { ExamFlagIcon } from './icons.jsx'
import './PaletteButton.css'

/**
 * PaletteButton - Question navigation button with 4 distinct states:
 * 1. current: active glowing outline / halo
 * 2. answered: filled OMR bubble
 * 3. unanswered: clean outline
 * 4. flagged: amber pennant badge
 */
export default function PaletteButton({
  index,
  isCurrent = false,
  isAnswered = false,
  isFlagged = false,
  onClick,
}) {
  const qNum = index + 1

  let statusLabel = 'unanswered'
  if (isAnswered) statusLabel = 'answered'
  if (isFlagged) statusLabel += ', flagged for review'
  if (isCurrent) statusLabel += ', current question'

  return (
    <button
      type="button"
      className={`reading-palette-btn ${isCurrent ? 'is-current' : ''} ${isAnswered ? 'is-answered' : 'is-unanswered'} ${isFlagged ? 'is-flagged' : ''}`}
      onClick={() => onClick?.(index)}
      aria-label={`Question ${qNum} (${statusLabel})`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <span className="palette-num">{qNum}</span>
      {isFlagged && (
        <span className="palette-flag-corner" aria-hidden="true">
          <ExamFlagIcon width="10" height="10" />
        </span>
      )}
    </button>
  )
}
