import { beforeEach, describe, expect, it } from 'vitest'
import { parsePlainTextQuestions } from '../src/lib/browserPdfParser.js'
import { FONT_SCALES, THEMES, settingsStore } from '../src/storage/settingsStore.js'

describe('settingsStore', () => {
  let mockStorage = {}

  beforeEach(() => {
    mockStorage = {}
    globalThis.localStorage = {
      getItem: (key) => mockStorage[key] ?? null,
      setItem: (key, val) => {
        mockStorage[key] = String(val)
      },
      removeItem: (key) => {
        delete mockStorage[key]
      },
      clear: () => {
        mockStorage = {}
      },
    }
  })

  it('loads default settings when empty', () => {
    const s = settingsStore.load()
    expect(s.theme).toBe(THEMES.SYSTEM)
    expect(s.fontScale).toBe(FONT_SCALES.NORMAL)
    expect(s.soundEnabled).toBe(true)
    expect(s.hapticsEnabled).toBe(true)
  })

  it('saves and reloads modified settings', () => {
    settingsStore.save({
      theme: THEMES.OLED,
      fontScale: FONT_SCALES.LARGE,
      soundEnabled: false,
      hapticsEnabled: true,
      examTargetName: 'PMS Prelims',
      examTargetDate: '2026-12-01',
    })

    const reloaded = settingsStore.load()
    expect(reloaded.theme).toBe(THEMES.OLED)
    expect(reloaded.fontScale).toBe(FONT_SCALES.LARGE)
    expect(reloaded.soundEnabled).toBe(false)
    expect(reloaded.examTargetName).toBe('PMS Prelims')
  })
})

describe('browser text MCQ parser', () => {
  it('parses formatted plain text MCQ block correctly', () => {
    const raw = `
1. What is the capital of Pakistan?
A) Karachi
B) Islamabad
C) Lahore
D) Peshawar
Answer: B
Explanation: Islamabad is the federal capital.

2. Which river is the longest in Pakistan?
A) Ravi
B) Jhelum
C) Indus
D) Chenab
Answer: C
    `

    const parsed = parsePlainTextQuestions(raw)
    expect(parsed.length).toBe(2)

    expect(parsed[0].prompt).toBe('What is the capital of Pakistan?')
    expect(parsed[0].choices).toEqual(['Karachi', 'Islamabad', 'Lahore', 'Peshawar'])
    expect(parsed[0].answer).toBe(1)
    expect(parsed[0].explanation).toBe('Islamabad is the federal capital.')

    expect(parsed[1].prompt).toBe('Which river is the longest in Pakistan?')
    expect(parsed[1].answer).toBe(2)
  })

  it('ignores malformed blocks with fewer than 2 choices', () => {
    const raw = `
1. Incomplete question
Only one choice
Answer: A
    `
    const parsed = parsePlainTextQuestions(raw)
    expect(parsed.length).toBe(0)
  })
})
