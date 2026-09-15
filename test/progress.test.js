import { describe, expect, it } from 'vitest'
import { calculateScore } from '../src/data/curriculum.js'
import { exportProgressPayload, parseAndMergeProgress } from '../src/storage/adapter.js'

describe('Unit Progression Unlock Logic (ProgressProvider.jsx:61-64)', () => {
  // Simulates getPrerequisite and isUnlocked logic
  const mockLessons = [
    { id: 'math-1', unitId: 'math', indexInUnit: 0 },
    { id: 'math-2', unitId: 'math', indexInUnit: 1 },
    { id: 'math-3', unitId: 'math', indexInUnit: 2 },
    { id: 'english-1', unitId: 'english', indexInUnit: 0 },
    { id: 'english-2', unitId: 'english', indexInUnit: 1 },
  ]

  const getPrerequisite = (lessonId) => {
    const idx = mockLessons.findIndex((l) => l.id === lessonId)
    const current = mockLessons[idx]
    if (!current || current.indexInUnit === 0) return null
    return mockLessons[idx - 1] ?? null
  }

  const createUnlockChecker = (records) => (lessonId) => {
    const prerequisite = getPrerequisite(lessonId)
    return prerequisite ? Boolean(records[prerequisite.id]) : true
  }

  it('first lesson of any unit is always unlocked with zero prerequisites', () => {
    const isUnlocked = createUnlockChecker({})
    expect(isUnlocked('math-1')).toBe(true)
    expect(isUnlocked('english-1')).toBe(true)
  })

  it('second lesson remains locked until the first lesson has a completion record', () => {
    const isUnlockedBefore = createUnlockChecker({})
    expect(isUnlockedBefore('math-2')).toBe(false)

    const isUnlockedAfter = createUnlockChecker({
      'math-1': { lessonId: 'math-1', score: 8, total: 10 },
    })
    expect(isUnlockedAfter('math-2')).toBe(true)
    expect(isUnlockedAfter('math-3')).toBe(false)
  })

  it('units unlock independently: completing a lesson in Math does NOT unlock lessons in English', () => {
    const isUnlocked = createUnlockChecker({
      'math-1': { lessonId: 'math-1', score: 10, total: 10 },
      'math-2': { lessonId: 'math-2', score: 9, total: 10 },
    })
    expect(isUnlocked('english-1')).toBe(true) // 1st in English
    expect(isUnlocked('english-2')).toBe(false) // 2nd in English remains locked
  })
})

describe('Negative Marking Calculation (curriculum.js calculateScore)', () => {
  it('calculates score correctly without negative marking (penalty = 0)', () => {
    const answers = [
      { correct: true },
      { correct: true },
      { correct: false },
      { correct: false },
    ]
    const result = calculateScore(answers, 0)
    expect(result.correct).toBe(2)
    expect(result.wrong).toBe(2)
    expect(result.marksDeducted).toBe(0)
    expect(result.netScore).toBe(2)
  })

  it('deducts 0.25 marks per wrong answer for PMS exams', () => {
    const answers = [
      { correct: true },
      { correct: true },
      { correct: true },
      { correct: true },
      { correct: false }, // -0.25
      { correct: false }, // -0.25
    ]
    const result = calculateScore(answers, 0.25)
    expect(result.correct).toBe(4)
    expect(result.wrong).toBe(2)
    expect(result.marksDeducted).toBe(0.5)
    expect(result.netScore).toBe(3.5)
  })

  it('deducts 0.33 marks per wrong answer for UPSC exams and prevents negative total', () => {
    const allWrong = [
      { correct: false },
      { correct: false },
      { correct: false },
    ]
    const result = calculateScore(allWrong, 0.33)
    expect(result.correct).toBe(0)
    expect(result.wrong).toBe(3)
    expect(result.netScore).toBe(0) // does not go below 0
  })
})

describe('Progress Backup & Merge (adapter.js)', () => {
  it('exportProgressPayload packages records with metadata', () => {
    const records = {
      'lesson-1': { lessonId: 'lesson-1', bestScore: 10, total: 10 },
    }
    const payload = exportProgressPayload(records)
    expect(payload.app).toBe('mpt-ai')
    expect(payload.recordCount).toBe(1)
    expect(payload.records[0].lessonId).toBe('lesson-1')
  })

  it('parseAndMergeProgress keeps the highest score between local and imported records', () => {
    const existing = {
      'lesson-1': {
        lessonId: 'lesson-1',
        attempts: 2,
        bestScore: 8,
        lastScore: 7,
        total: 10,
        updatedAt: 1000,
      },
    }

    const imported = {
      records: [
        {
          lessonId: 'lesson-1',
          attempts: 1,
          bestScore: 10, // higher score
          lastScore: 10,
          total: 10,
          updatedAt: 2000,
        },
        {
          lessonId: 'lesson-2',
          attempts: 1,
          bestScore: 9,
          lastScore: 9,
          total: 10,
          updatedAt: 2500,
        },
      ],
    }

    const merged = parseAndMergeProgress(imported, existing)
    const byId = Object.fromEntries(merged.map((r) => [r.lessonId, r]))

    expect(byId['lesson-1'].bestScore).toBe(10)
    expect(byId['lesson-1'].attempts).toBe(2)
    expect(byId['lesson-2'].bestScore).toBe(9)
  })
})
