import { describe, expect, it } from 'vitest'
import {
  calculateScore,
  explainQuestion,
  isAnswerable,
  keyNoteQuestion,
} from '../src/data/questionModel.js'

describe('questionModel domain helpers', () => {
  describe('isAnswerable', () => {
    it('returns true for valid question', () => {
      expect(
        isAnswerable({
          prompt: 'Valid prompt?',
          choices: ['Option 1', 'Option 2'],
          answer: 0,
        }),
      ).toBe(true)
    })

    it('returns false for empty or non-string prompt', () => {
      expect(isAnswerable({ prompt: '   ', choices: ['A', 'B'], answer: 0 })).toBe(false)
      expect(isAnswerable({ prompt: null, choices: ['A', 'B'], answer: 0 })).toBe(false)
    })

    it('returns false for invalid choices array', () => {
      expect(isAnswerable({ prompt: 'Q', choices: ['Single'], answer: 0 })).toBe(false)
      expect(isAnswerable({ prompt: 'Q', choices: null, answer: 0 })).toBe(false)
    })

    it('returns false for out of range or non-integer answer', () => {
      expect(isAnswerable({ prompt: 'Q', choices: ['A', 'B'], answer: 2 })).toBe(false)
      expect(isAnswerable({ prompt: 'Q', choices: ['A', 'B'], answer: -1 })).toBe(false)
      expect(isAnswerable({ prompt: 'Q', choices: ['A', 'B'], answer: '0' })).toBe(false)
      expect(isAnswerable({ prompt: 'Q', choices: ['A', 'B'], answer: null })).toBe(false)
    })
  })

  describe('explainQuestion', () => {
    it('returns written explanation when present', () => {
      const q = { prompt: 'Q', choices: ['A', 'B'], answer: 0, explanation: 'Detailed reason.' }
      expect(explainQuestion(q)).toBe('Detailed reason.')
    })

    it('formats source paper and number when explanation is omitted', () => {
      const q = {
        prompt: 'Q',
        choices: ['A', 'B'],
        answer: 0,
        source: { paper: 'CSS MPT 2026', number: 42 },
      }
      expect(explainQuestion(q)).toBe('Original exam question — CSS MPT 2026, Q42.')
    })

    it('returns null when neither explanation nor source is present', () => {
      expect(explainQuestion({ prompt: 'Q', choices: ['A', 'B'], answer: 0 })).toBe(null)
    })
  })

  describe('keyNoteQuestion', () => {
    it('returns AI worked-out note when keyedBy is mpt-ai', () => {
      const q = { source: { keyedBy: 'mpt-ai' } }
      expect(keyNoteQuestion(q)).toContain('no official key was published')
    })

    it('returns keySource attribution when keySource is given', () => {
      const q = { source: { keySource: 'FPSC Official Key' } }
      expect(keyNoteQuestion(q)).toBe('Answer key via FPSC Official Key.')
    })

    it('returns null when no key provenance note is required', () => {
      expect(keyNoteQuestion({})).toBe(null)
    })
  })

  describe('calculateScore edge cases', () => {
    it('handles empty answers array gracefully', () => {
      const result = calculateScore([])
      expect(result.correct).toBe(0)
      expect(result.wrong).toBe(0)
      expect(result.netScore).toBe(0)
    })

    it('clamps negative scores to zero', () => {
      const answers = [{ correct: false }, { correct: false }]
      const result = calculateScore(answers, 1.0)
      expect(result.marksDeducted).toBe(2)
      expect(result.netScore).toBe(0)
    })
  })
})
