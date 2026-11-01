import React from 'react'
import ChoiceRow from './ChoiceRow.jsx'
import QuestionTTS from './QuestionTTS.jsx'
import { NotesIcon, BookmarkStarIcon, LightbulbIcon, AlertCircleIcon, CheckCircleIcon } from './icons.jsx'
import './MCQCard.css'

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI']

/**
 * MCQCard - "The Reading Lamp" Primary Study Hero Component
 * Features:
 * - 6 states across question options: default, hover, selected, struck, correct, wrong
 * - Full LTR and RTL mirroring (Urdu Nastaliq line-height 2.2)
 * - Hero question stem typography with generous leading and ruled-margin cue
 * - Statements I, II, III multi-item support
 * - Provenance chip, directive, notes, and TTS controls
 * - Negative marking feedback (CSS 0.00 vs PMS -0.25)
 */
export default function MCQCard({
  question,
  selectedChoice,
  eliminatedChoices = {},
  checked = false,
  bookmarked = false,
  hasNote = false,
  penalty = 0, // 0 for CSS MPT, 0.25 for PMS
  onSelectChoice,
  onToggleEliminate,
  onToggleBookmark,
  onOpenNotes,
  explanation,
  provenance,
  unitLabel,
}) {
  if (!question) return null

  const isRtl = Boolean(question.rtl)
  const isCorrect = checked && selectedChoice === question.answer
  const isWrong = checked && selectedChoice !== null && selectedChoice !== question.answer

  return (
    <article
      className={`reading-mcq-card ${isRtl ? 'is-rtl' : 'is-ltr'} ${checked ? (isCorrect ? 'is-card-correct' : 'is-card-wrong') : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Ruled margin exam paper cue */}
      <div className="card-ruled-margin" aria-hidden="true" />

      <div className="card-inner-content">
        {/* Header meta & toolbar */}
        <div className="card-meta-bar">
          <div className="card-provenance-cluster">
            {unitLabel && <span className="card-unit-chip">{unitLabel}</span>}
            {provenance && (
              <span className="card-provenance-chip" title="Exam provenance">
                {provenance}
              </span>
            )}
            {penalty > 0 && (
              <span className="card-penalty-chip" title="Negative marking applies">
                -{penalty.toFixed(2)} Mark Deducted
              </span>
            )}
          </div>

          <div className="card-tools-cluster">
            <QuestionTTS question={question} />
            {onOpenNotes && (
              <button
                type="button"
                className={`card-tool-btn ${hasNote ? 'is-active-tool' : ''}`}
                onClick={onOpenNotes}
                title="Study Note"
                aria-label="Add or view study note"
              >
                <NotesIcon width="16" height="16" />
                <span className="tool-btn-label">{hasNote ? 'Note' : '+Note'}</span>
              </button>
            )}
            {onToggleBookmark && (
              <button
                type="button"
                className={`card-tool-btn bookmark-tool-btn ${bookmarked ? 'is-bookmarked' : ''}`}
                onClick={onToggleBookmark}
                title={bookmarked ? 'Remove bookmark' : 'Bookmark question'}
                aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark question'}
              >
                <BookmarkStarIcon width="18" height="18" />
              </button>
            )}
          </div>
        </div>

        {/* Question Directive */}
        {question.directive && (
          <p className="card-directive">{question.directive}</p>
        )}

        {/* Hero Question Stem */}
        <h2 className={`card-stem ${isRtl ? 'urdu' : ''}`}>
          {question.prompt}
        </h2>

        {/* Multi-statement items: I, II, III */}
        {question.statements && question.statements.length > 0 && (
          <ol className="card-statements-list">
            {question.statements.map((stmt, idx) => (
              <li key={idx} className="statement-row">
                <span className="statement-numeral">
                  {ROMAN_NUMERALS[idx] || idx + 1}.
                </span>
                <span className={`statement-text ${isRtl ? 'urdu' : ''}`}>
                  {stmt}
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Closing question wrap (e.g. "Which of the statements given above is/are correct?") */}
        {question.closing && (
          <p className={`card-closing ${isRtl ? 'urdu' : ''}`}>
            {question.closing}
          </p>
        )}

        {/* Choices Container (Thumb Ergonomics on mobile) */}
        <div className="card-choices-group" role="group" aria-label="Answer options">
          {question.choices?.map((choiceText, idx) => (
            <ChoiceRow
              key={idx}
              index={idx}
              text={choiceText}
              selected={selectedChoice === idx}
              checked={checked}
              isCorrect={checked && idx === question.answer}
              isWrong={checked && selectedChoice === idx && selectedChoice !== question.answer}
              isAnswer={checked && idx === question.answer}
              struck={Boolean(eliminatedChoices[idx])}
              disabled={checked}
              rtl={isRtl}
              onSelect={onSelectChoice}
              onToggleStrike={onToggleEliminate}
            />
          ))}
        </div>

        {/* Explanation & Feedback Drawer */}
        {checked && (
          <section className={`card-feedback-box ${isCorrect ? 'is-correct' : 'is-wrong'}`} aria-live="polite">
            <div className="feedback-banner">
              <span className="feedback-icon" aria-hidden="true">
                {isCorrect ? (
                  <CheckCircleIcon width="20" height="20" />
                ) : (
                  <AlertCircleIcon width="20" height="20" />
                )}
              </span>
              <div className="feedback-headline">
                <strong>{isCorrect ? 'Correct!' : 'Incorrect'}</strong>
                {penalty > 0 && !isCorrect && (
                  <span className="feedback-deduction">(-{penalty.toFixed(2)} Deduction)</span>
                )}
              </div>
            </div>

            {explanation && (
              <div className="feedback-explanation">
                <div className="explanation-title">
                  <LightbulbIcon width="16" height="16" />
                  <span>Key Explanation</span>
                </div>
                <p className={`explanation-body ${isRtl ? 'urdu' : ''}`}>
                  {explanation}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  )
}
