import { describe, expect, it } from 'vitest'
import { exportQuestionsToCsv, parseCsvQuestions } from '../src/lib/csvHelper.js'

describe('csvHelper', () => {
  it('correctly exports questions to valid CSV format', () => {
    const questions = [
      {
        prompt: 'What is the capital of Pakistan?',
        choices: ['Karachi', 'Islamabad', 'Lahore', 'Peshawar'],
        answer: 1,
        explanation: 'Islamabad became capital in 1967.',
        _subject: 'Pakistan Affairs',
      },
    ]

    const csv = exportQuestionsToCsv(questions)
    expect(csv).toContain('Prompt,Choice A,Choice B')
    expect(csv).toContain('"What is the capital of Pakistan?"')
    expect(csv).toContain('"Islamabad"')
    expect(csv).toContain('"B"')
    expect(csv).toContain('"Islamabad became capital in 1967."')
  })

  it('correctly parses CSV text into structured questions', () => {
    const csvData = `Prompt,Choice A,Choice B,Choice C,Choice D,Correct Answer,Explanation,Subject
"Which gas is most abundant in the atmosphere?","Oxygen","Nitrogen","Carbon Dioxide","Argon","B","Nitrogen is approx 78%","General Science"`

    const parsed = parseCsvQuestions(csvData)
    expect(parsed.length).toBe(1)
    expect(parsed[0].prompt).toBe('Which gas is most abundant in the atmosphere?')
    expect(parsed[0].choices.length).toBe(4)
    expect(parsed[0].choices[1]).toBe('Nitrogen')
    expect(parsed[0].answer).toBe(1)
    expect(parsed[0].explanation).toBe('Nitrogen is approx 78%')
  })
})
