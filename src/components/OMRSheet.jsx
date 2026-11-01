import { useState } from 'react'
import { GridIcon, CloseIcon } from './icons.jsx'
import OMRRow from './OMRRow.jsx'
import './OMRSheet.css'

export default function OMRSheet({
  totalQuestions,
  currentIndex,
  selectedAnswers = {},
  flagged = {},
  onSelectAnswer,
  onJumpToQuestion,
}) {
  const [isOpen, setIsOpen] = useState(false)

  const answeredCount = Object.keys(selectedAnswers).filter(
    (k) => selectedAnswers[k] !== null && selectedAnswers[k] !== undefined,
  ).length

  return (
    <div className={`omr-drawer ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="omr-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle OMR Response Matrix Sheet"
        aria-label="Toggle OMR Sheet"
        aria-expanded={isOpen}
      >
        <GridIcon width="16" height="16" />
        <span>OMR Sheet</span>
        <span className="omr-toggle-count font-mono">
          {answeredCount}/{totalQuestions}
        </span>
      </button>

      {isOpen && (
        <div className="omr-panel" role="region" aria-label="OMR Response Matrix">
          <div className="omr-panel__header">
            <span className="omr-panel__title">OMR Response Matrix</span>
            <div className="omr-panel__legend">
              <span className="legend-dot is-filled" /> Filled
              <span className="legend-dot is-flagged" /> Flagged
              <span className="legend-dot is-current" /> Active
            </div>
            <button
              type="button"
              className="omr-panel-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close OMR Sheet"
            >
              <CloseIcon width="14" height="14" />
            </button>
          </div>

          <div className="omr-grid">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const qIndex = i
              const selectedChoice = selectedAnswers[qIndex]
              const isCurrent = currentIndex === qIndex
              const isFlag = Boolean(flagged[qIndex])

              return (
                <OMRRow
                  key={i}
                  questionIndex={qIndex}
                  selectedChoice={selectedChoice}
                  isCurrent={isCurrent}
                  isFlagged={isFlag}
                  onSelectChoice={onSelectAnswer}
                  onJumpToQuestion={onJumpToQuestion}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
