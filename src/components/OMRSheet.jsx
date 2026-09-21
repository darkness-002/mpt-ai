import { useState } from 'react'
import { GridIcon } from './icons.jsx'
import './OMRSheet.css'

const BUBBLE_LABELS = ['A', 'B', 'C', 'D']

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
        title="Toggle OMR Bubble Sheet"
      >
        <GridIcon width="16" height="16" />
        <span>OMR Sheet</span>
        <span className="omr-toggle-count">
          {answeredCount}/{totalQuestions}
        </span>
      </button>

      {isOpen && (
        <div className="omr-panel">
          <div className="omr-panel__header">
            <span className="omr-panel__title">OMR Response Matrix</span>
            <div className="omr-panel__legend">
              <span className="legend-dot is-filled" /> Filled
              <span className="legend-dot is-flagged" /> Flagged
              <span className="legend-dot is-current" /> Active
            </div>
          </div>

          <div className="omr-grid">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const qIndex = i
              const selectedChoice = selectedAnswers[qIndex]
              const isCurrent = currentIndex === qIndex
              const isFlag = !!flagged[qIndex]

              return (
                <div
                  key={i}
                  className={`omr-row ${isCurrent ? 'is-active-row' : ''} ${isFlag ? 'is-flagged-row' : ''}`}
                  onClick={() => onJumpToQuestion && onJumpToQuestion(qIndex)}
                >
                  <span className="omr-q-num">{i + 1}</span>
                  <div className="omr-bubbles">
                    {BUBBLE_LABELS.map((letter, optIdx) => {
                      const isFilled = selectedChoice === optIdx
                      return (
                        <button
                          key={letter}
                          type="button"
                          className={`omr-bubble ${isFilled ? 'is-filled' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onSelectAnswer) {
                              onSelectAnswer(qIndex, optIdx)
                            }
                          }}
                          aria-label={`Question ${i + 1} Option ${letter}`}
                        >
                          {letter}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
