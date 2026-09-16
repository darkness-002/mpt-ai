/**
 * Question Model, Validation, and Scoring domain utilities.
 * Follows Single Responsibility Principle (SRP) by centralizing question rules.
 */

/**
 * Validates that a question is structurally complete and answerable.
 * Staging/draft items or malformed objects return false.
 * @param {object} question
 * @returns {boolean}
 */
export function isAnswerable(question) {
  return Boolean(
    question &&
      typeof question.prompt === 'string' &&
      question.prompt.trim().length > 0 &&
      Array.isArray(question.choices) &&
      question.choices.length >= 2 &&
      Number.isInteger(question.answer) &&
      question.answer >= 0 &&
      question.answer < question.choices.length,
  )
}

/**
 * Returns formatted explanation or source origin for an exam question.
 * @param {object} question
 * @returns {string|null}
 */
export function explainQuestion(question) {
  if (!question) return null
  if (question.explanation) return question.explanation
  if (question.source?.paper) {
    const where = question.source.number ? `, Q${question.source.number}` : ''
    return `Original exam question — ${question.source.paper}${where}.`
  }
  return null
}

/**
 * Returns attribution / provenance note for the answer key if not official.
 * @param {object} question
 * @returns {string|null}
 */
export function keyNoteQuestion(question) {
  const source = question?.source
  if (source?.keyedBy === 'mpt-ai') {
    return 'Answer worked out by MPT-AI — no official key was published for this paper.'
  }
  if (source?.keySource) {
    return `Answer key via ${source.keySource}.`
  }
  return null
}

/**
 * Calculates score with support for fractional negative marking.
 * @param {Array<{ correct: boolean }>} answers
 * @param {number} negativeMarking  fractional penalty e.g. 0.25 or 0.33
 */
export function calculateScore(answers, negativeMarking = 0) {
  const list = Array.isArray(answers) ? answers : []
  const correct = list.filter((a) => a.correct).length
  const wrong = list.filter((a) => !a.correct).length
  const penalty = typeof negativeMarking === 'number' && negativeMarking > 0 ? negativeMarking : 0
  const marksDeducted = Math.round(wrong * penalty * 100) / 100
  const rawScore = correct - marksDeducted
  const netScore = Math.max(0, Math.round(rawScore * 100) / 100)

  return {
    correct,
    wrong,
    total: list.length,
    penalty,
    marksDeducted,
    netScore,
  }
}
