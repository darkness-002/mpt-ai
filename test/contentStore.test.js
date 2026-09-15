import { describe, expect, it } from 'vitest'
import { fromDataFile, toDataFile } from '../src/storage/contentStore.js'

describe('toDataFile and fromDataFile (contentStore.js:131-186)', () => {
  const sampleCategory = {
    id: 'cat-101',
    title: 'Everyday Science',
    exam: 'CSS',
    tagline: 'Basic physics and biology',
  }

  const sampleQuestions = [
    {
      id: 'q-1',
      prompt: 'Water boils at what temperature at sea level?',
      directive: 'Choose the correct temperature:',
      statements: ['Water expands upon freezing.', 'Boiling point depends on pressure.'],
      closing: 'Which statements are true?',
      choices: ['100°C', '90°C', '120°C', '80°C'],
      answer: 0,
      explanation: 'Under 1 atm pressure, water boils at 100°C.',
    },
    {
      id: 'q-2',
      prompt: 'Which vitamin is synthesized by sunlight in the skin?',
      choices: ['Vitamin A', 'Vitamin B', 'Vitamin C', 'Vitamin D'],
      answer: 3,
      explanation: 'Vitamin D is synthesized when skin is exposed to UVB rays.',
    },
  ]

  it('toDataFile exports category and questions in the exact curriculum bundle shape', () => {
    const file = toDataFile(sampleCategory, sampleQuestions)

    expect(file.unit).toBe('everyday-science')
    expect(file.kind).toBe('custom')
    expect(file.title).toBe('Everyday Science')
    expect(file.exam).toBe('CSS')
    expect(file.tagline).toBe('Basic physics and biology')
    expect(file.lessons).toHaveLength(1)
    expect(file.lessons[0].questions).toHaveLength(2)

    const firstQ = file.lessons[0].questions[0]
    expect(firstQ.prompt).toBe('Water boils at what temperature at sea level?')
    expect(firstQ.directive).toBe('Choose the correct temperature:')
    expect(firstQ.statements).toEqual(['Water expands upon freezing.', 'Boiling point depends on pressure.'])
    expect(firstQ.answer).toBe(0)
  })

  it('fromDataFile parses and maps a curriculum data file back to store records', () => {
    const filePayload = toDataFile(sampleCategory, sampleQuestions)
    const parsed = fromDataFile(filePayload)

    expect(parsed.category.title).toBe('Everyday Science')
    expect(parsed.category.exam).toBe('CSS')
    expect(parsed.questions).toHaveLength(2)
    expect(parsed.questions[0].prompt).toBe(sampleQuestions[0].prompt)
    expect(parsed.questions[0].answer).toBe(0)
    expect(parsed.questions[1].answer).toBe(3)
  })

  it('fromDataFile sets unkeyed items to answer: -1 for author editing', () => {
    const rawFile = {
      title: 'Staging Paper',
      lessons: [
        {
          questions: [
            {
              prompt: 'Question without key',
              choices: ['A', 'B'],
              answer: null,
            },
          ],
        },
      ],
    }

    const parsed = fromDataFile(rawFile)
    expect(parsed.questions[0].answer).toBe(-1)
  })

  it('fromDataFile throws error if file has no questions', () => {
    expect(() => fromDataFile({ lessons: [] })).toThrow('No questions found in that file.')
  })
})
