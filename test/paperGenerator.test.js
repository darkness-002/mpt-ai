import { describe, expect, it } from 'vitest'
import {
  BLUEPRINT_PRESETS,
  classifyQuestionSubject,
  generateBalancedPaper,
} from '../src/lib/paperGenerator.js'

describe('paperGenerator', () => {
  it('has valid blueprint presets with distributions summing to totalMcqs', () => {
    expect(BLUEPRINT_PRESETS.length).toBeGreaterThanOrEqual(3)

    for (const bp of BLUEPRINT_PRESETS) {
      const sum = bp.distribution.reduce((acc, d) => acc + d.count, 0)
      expect(sum).toBe(bp.totalMcqs)
      expect(bp.durationMinutes).toBeGreaterThan(0)
    }
  })

  it('correctly classifies question subjects from prompts and titles', () => {
    expect(classifyQuestionSubject({ prompt: 'Choose the correct antonym of mitigate' })).toBe('English')
    expect(classifyQuestionSubject({ prompt: 'If 3x + 5 = 20, find the average' })).toBe('General Abilities')
    expect(classifyQuestionSubject({ prompt: 'Which vitamin is synthesized by sunlight in the skin?' })).toBe('General Science')
    expect(classifyQuestionSubject({ prompt: 'In which year was the Lahore Resolution passed?' })).toBe('Pakistan Affairs')
    expect(classifyQuestionSubject({ prompt: 'How many Surahs are there in the Holy Quran?' })).toBe('Islamic Studies')
    expect(classifyQuestionSubject({ prompt: 'علامہ اقبال کی مشہور کتاب کا نام کیا ہے؟' })).toBe('Urdu')
  })

  it('generates a balanced mock paper according to blueprint and pool', () => {
    const mockTracks = [
      {
        title: 'FPSC CSS MPT',
        units: [
          {
            title: 'English Vocabulary',
            lessons: [
              {
                questions: [
                  { id: 'q1', prompt: 'Synonym of diligent', choices: ['Lazy', 'Hardworking', 'Careless', 'Slow'], answer: 1 },
                  { id: 'q2', prompt: 'Antonym of expand', choices: ['Shrink', 'Grow', 'Enlarge', 'Widen'], answer: 0 },
                ],
              },
            ],
          },
          {
            title: 'Basic Mathematics',
            lessons: [
              {
                questions: [
                  { id: 'q3', prompt: 'What is 15 percent of 200?', choices: ['20', '30', '40', '50'], answer: 1 },
                  { id: 'q4', prompt: 'Solve for x: 2x = 10', choices: ['2', '3', '4', '5'], answer: 3 },
                ],
              },
            ],
          },
        ],
      },
    ]

    const bp = {
      id: 'test-bp',
      title: 'Mini Test Blueprint',
      exam: 'CSS',
      totalMcqs: 4,
      durationMinutes: 10,
      negativeMarking: 0,
      passingPercent: 33,
      distribution: [
        { subject: 'English', count: 2 },
        { subject: 'General Abilities', count: 2 },
      ],
    }

    const paper = generateBalancedPaper(mockTracks, bp)
    expect(paper.totalQuestions).toBe(4)
    expect(paper.questions.length).toBe(4)
    expect(paper.questions.map((q) => q.id)).toContain('q1')
    expect(paper.questions.map((q) => q.id)).toContain('q3')
  })
})
