import { beforeEach, describe, expect, it } from 'vitest'
import { buildCustomTracks } from '../src/content/buildCustom.js'
import { contentStore } from '../src/storage/contentStore.js'
import { createCategory } from '../src/lib/supabase.js'
import { THEMES, THEME_LIST, settingsStore } from '../src/storage/settingsStore.js'

describe('Draft-to-Live Approval Pipeline', () => {
  let mockStorage = {}

  beforeEach(async () => {
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
    await contentStore.clear()
  })

  it('defaults newly saved question status to pending', async () => {
    const q = await contentStore.saveQuestion({
      prompt: 'Who was the first Governor-General of Pakistan?',
      choices: ['Liaquat Ali Khan', 'Muhammad Ali Jinnah', 'Khawaja Nazimuddin', 'Ghulam Muhammad'],
      answer: 1,
      explanation: 'Quaid-e-Azam Muhammad Ali Jinnah served as the first Governor-General.',
      categoryId: 'pakistan-affairs',
      exam_target: ['CSS', 'PMS'],
    })

    expect(q.status).toBe('pending')
    expect(q.exam_target).toEqual(['CSS', 'PMS'])
  })

  it('excludes pending drafts from student live practice in buildCustomTracks', () => {
    const categories = [
      { id: 'cat-history', title: 'Pakistan Affairs', exam: 'CSS', hue: 160 },
    ]

    const questions = [
      {
        id: 'q-live',
        categoryId: 'cat-history',
        prompt: 'Approved live question',
        choices: ['A', 'B', 'C', 'D'],
        answer: 0,
        status: 'approved',
        order: 1,
      },
      {
        id: 'q-pending',
        categoryId: 'cat-history',
        prompt: 'Pending draft question',
        choices: ['A', 'B', 'C', 'D'],
        answer: 0,
        status: 'pending',
        order: 2,
      },
      {
        id: 'q-rejected',
        categoryId: 'cat-history',
        prompt: 'Rejected question',
        choices: ['A', 'B', 'C', 'D'],
        answer: 0,
        status: 'rejected',
        order: 3,
      },
    ]

    const tracks = buildCustomTracks(categories, questions)
    expect(tracks).toHaveLength(1)
    const unit = tracks[0].units[0]

    // Only the approved question should be in the student's lesson
    expect(unit.questionCount).toBe(1)
    expect(unit.lessons[0].questions).toHaveLength(1)
    expect(unit.lessons[0].questions[0].id).toBe('q-live')
  })

  it('allows reviewer to approve pending draft, promoting it to approved status', async () => {
    const created = await contentStore.saveQuestion({
      id: 'q-test-draft',
      prompt: 'Draft question awaiting approval',
      choices: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4'],
      answer: 2,
      categoryId: 'english',
      status: 'pending',
    })
    expect(created.status).toBe('pending')

    const updated = await contentStore.updateQuestionStatus('q-test-draft', 'approved')
    expect(updated).not.toBeNull()
    expect(updated.status).toBe('approved')

    const loaded = await contentStore.load()
    const target = loaded.questions.find((q) => q.id === 'q-test-draft')
    expect(target.status).toBe('approved')
  })

  it('dynamically creates a new subject/category and links a staged question', async () => {
    const res = await createCategory({
      title: 'Sociology',
      examTrack: 'CSS',
      tagline: 'Social structure and dynamics in Pakistan',
    })
    expect(res.data).toBeDefined()
    expect(res.data.id).toBe('sociology')

    const savedCat = await contentStore.saveCategory({
      id: res.data.id,
      title: 'Sociology',
      exam: 'CSS',
      tagline: 'Social structure and dynamics in Pakistan',
    })
    expect(savedCat.id).toBe('sociology')

    const question = await contentStore.saveQuestion({
      prompt: 'Who coined the term "Sociology"?',
      choices: ['Karl Marx', 'Auguste Comte', 'Max Weber', 'Emile Durkheim'],
      answer: 1,
      explanation: 'Auguste Comte coined the term Sociology in 1838.',
      categoryId: savedCat.id,
      status: 'pending',
      exam_target: ['CSS'],
    })

    expect(question.categoryId).toBe('sociology')
    expect(question.status).toBe('pending')
  })

  it('supports exactly 4 refreshed themes including fixed Dark and deep Midnight', () => {
    expect(THEME_LIST).toHaveLength(4)
    expect(THEME_LIST.map((t) => t.id)).toEqual([
      THEMES.LIGHT,
      THEMES.DARK,
      THEMES.ZEN,
      THEMES.MIDNIGHT,
    ])

    settingsStore.save({ theme: THEMES.MIDNIGHT })
    expect(settingsStore.load().theme).toBe('midnight')

    settingsStore.save({ theme: THEMES.DARK })
    expect(settingsStore.load().theme).toBe('dark')

    settingsStore.save({ theme: THEMES.ZEN })
    expect(settingsStore.load().theme).toBe('zen')

    settingsStore.save({ theme: THEMES.LIGHT })
    expect(settingsStore.load().theme).toBe('light')
  })
})
