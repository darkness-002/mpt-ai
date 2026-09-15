import { describe, expect, it } from 'vitest'
import { buildCustomTracks, isAnswerable } from '../src/content/buildCustom.js'

describe('isAnswerable (buildCustom.js:7)', () => {
  it('returns true for a valid answerable question', () => {
    const valid = {
      prompt: 'What is the capital of Pakistan?',
      choices: ['Karachi', 'Lahore', 'Islamabad', 'Peshawar'],
      answer: 2,
    }
    expect(isAnswerable(valid)).toBe(true)
  })

  it('rejects unkeyed staging questions (answer: null)', () => {
    const unkeyed = {
      prompt: 'Pending answer key question',
      choices: ['A', 'B', 'C', 'D'],
      answer: null,
    }
    expect(isAnswerable(unkeyed)).toBe(false)
  })

  it('rejects questions with out-of-range answers', () => {
    const outOfBounds = {
      prompt: 'Out of range answer',
      choices: ['A', 'B'],
      answer: 2,
    }
    const negative = {
      prompt: 'Negative answer',
      choices: ['A', 'B'],
      answer: -1,
    }
    expect(isAnswerable(outOfBounds)).toBe(false)
    expect(isAnswerable(negative)).toBe(false)
  })

  it('rejects questions with fewer than 2 choices', () => {
    const singleChoice = {
      prompt: 'Single choice question',
      choices: ['Only one'],
      answer: 0,
    }
    expect(isAnswerable(singleChoice)).toBe(false)
  })

  it('rejects questions with empty prompt', () => {
    const emptyPrompt = {
      prompt: '   ',
      choices: ['Option 1', 'Option 2'],
      answer: 0,
    }
    expect(isAnswerable(emptyPrompt)).toBe(false)
  })
})

describe('buildCustomTracks', () => {
  it('groups categories by exam and chunks questions into sets of 10', () => {
    const categories = [
      { id: 'cat-1', title: 'English Grammar', exam: 'CSS', hue: 120 },
      { id: 'cat-2', title: 'Basic Math', exam: 'PMS', hue: 200 },
    ]

    // Create 12 questions for cat-1
    const questions = Array.from({ length: 12 }, (_, i) => ({
      id: `q-${i + 1}`,
      categoryId: 'cat-1',
      prompt: `Grammar question ${i + 1}`,
      choices: ['A', 'B', 'C', 'D'],
      answer: 0,
      order: i,
    }))

    const tracks = buildCustomTracks(categories, questions)

    expect(tracks).toHaveLength(2)
    const cssTrack = tracks.find((t) => t.exam === 'CSS')
    expect(cssTrack).toBeDefined()
    expect(cssTrack.units).toHaveLength(1)

    // With 12 questions: 10 + 2 -> since remaining (2) < 4, it chunks into 1 merged lesson with 12 questions
    expect(cssTrack.units[0].lessons).toHaveLength(1)
    expect(cssTrack.units[0].lessons[0].questions).toHaveLength(12)
  })
})
