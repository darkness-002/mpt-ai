import React from 'react'
import { CheckIcon, CloseIcon, SlashIcon } from './icons.jsx'
import './ChoiceRow.css'

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/**
 * ChoiceRow Component
 * - 12px border radius
 * - >= 44px min touch target
 * - OMR bubble with pencil-fill animation (150-200ms)
 * - Strikethrough / Elimination toggle
 * - Full LTR and RTL mirroring support
 * - WCAG AA accessible states: default, hover, selected, struck, correct, wrong
 */
export default function ChoiceRow({
  index,
  text,
  selected = false,
  checked = false,
  isCorrect = false,
  isWrong = false,
  isAnswer = false,
  struck = false,
  disabled = false,
  rtl = false,
  onSelect,
  onToggleStrike,
}) {
  const letter = OPTION_LETTERS[index] || String(index + 1)

  // Determine state class
  let stateClass = 'is-default'
  if (checked) {
    if (isAnswer) {
      stateClass = 'is-correct'
    } else if (selected && isWrong) {
      stateClass = 'is-wrong'
    } else {
      stateClass = 'is-dimmed'
    }
  } else if (selected) {
    stateClass = 'is-selected'
  } else if (struck) {
    stateClass = 'is-struck'
  }

  const handleRowClick = () => {
    if (disabled || checked || struck) return
    onSelect?.(index)
  }

  const handleStrikeClick = (e) => {
    e.stopPropagation()
    if (disabled || checked) return
    onToggleStrike?.(index)
  }

  return (
    <div
      className={`reading-choice-row ${rtl ? 'is-rtl' : 'is-ltr'} ${stateClass}`}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        className={`choice-button ${selected ? 'is-active' : ''} ${struck ? 'is-eliminated' : ''}`}
        onClick={handleRowClick}
        disabled={disabled || (checked && !selected && !isAnswer)}
        aria-pressed={selected}
        aria-label={`Option ${letter}: ${text}`}
      >
        {/* OMR Bubble Indicator */}
        <span className="choice-omr-bubble" aria-hidden="true">
          <span className="omr-bubble-ring">
            <span className="omr-bubble-letter">{letter}</span>
            {selected && <span className="omr-pencil-fill" />}
            {checked && isAnswer && (
              <span className="omr-badge-correct">
                <CheckIcon width="14" height="14" />
              </span>
            )}
            {checked && selected && isWrong && (
              <span className="omr-badge-wrong">
                <CloseIcon width="14" height="14" />
              </span>
            )}
          </span>
        </span>

        {/* Choice Text */}
        <span className={`choice-content ${rtl ? 'urdu' : ''}`}>
          {text}
        </span>
      </button>

      {/* Distractor Elimination / Strike Toggle Button */}
      {!checked && onToggleStrike && (
        <button
          type="button"
          className={`strike-toggle-btn ${struck ? 'is-eliminated' : ''}`}
          onClick={handleStrikeClick}
          disabled={disabled}
          title={struck ? `Restore Option ${letter}` : `Eliminate Option ${letter}`}
          aria-label={struck ? `Restore Option ${letter}` : `Eliminate Option ${letter}`}
        >
          <SlashIcon width="16" height="16" />
        </button>
      )}
    </div>
  )
}
