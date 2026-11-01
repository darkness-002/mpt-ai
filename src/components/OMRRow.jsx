import React from 'react'
import { ExamFlagIcon } from './icons.jsx'
import './OMRRow.css'

const BUBBLES = ['A', 'B', 'C', 'D']

/**
 * OMRRow - Single question row inside the OMR Sheet Matrix
 * - Monospace question index
 * - Bubbles A, B, C, D with pencil fill
 * - Flagged review state (amber pennant)
 * - Eliminated cross-out representation
 */
export default function OMRRow({
  questionIndex,
  selectedChoice,
  eliminatedChoices = {},
  isCurrent = false,
  isFlagged = false,
  onSelectChoice,
  onJumpToQuestion,
}) {
  const qNum = questionIndex + 1

  return (
    <div
      className={`reading-omr-row ${isCurrent ? 'is-current-row' : ''} ${isFlagged ? 'is-flagged-row' : ''}`}
      onClick={() => onJumpToQuestion?.(questionIndex)}
      role="row"
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="omr-row-meta">
        <span className="omr-index-num">{qNum}</span>
        {isFlagged && (
          <span className="omr-flag-indicator" title="Marked for review" aria-label="Marked for review">
            <ExamFlagIcon width="12" height="12" />
          </span>
        )}
      </div>

      <div className="omr-bubbles-cell" role="radiogroup" aria-label={`Question ${qNum} choices`}>
        {BUBBLES.map((letter, optIdx) => {
          const isFilled = selectedChoice === optIdx
          const isStruck = Boolean(eliminatedChoices[optIdx])

          return (
            <button
              key={letter}
              type="button"
              className={`omr-cell-bubble ${isFilled ? 'is-filled' : ''} ${isStruck ? 'is-struck' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onSelectChoice?.(questionIndex, optIdx)
              }}
              aria-checked={isFilled}
              role="radio"
              aria-label={`Question ${qNum} Option ${letter}`}
              title={`Option ${letter}`}
            >
              <span className="bubble-letter">{letter}</span>
              {isFilled && <span className="bubble-fill-disc" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
