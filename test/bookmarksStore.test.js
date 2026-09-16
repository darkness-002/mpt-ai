import { beforeEach, describe, expect, it } from 'vitest'
import { bookmarksStore } from '../src/storage/bookmarksStore.js'

describe('bookmarksStore', () => {
  beforeEach(async () => {
    await bookmarksStore.clear()
  })

  it('toggles bookmark on and off for a question', async () => {
    const question = {
      id: 'bm-q-1',
      prompt: 'Who wrote Hamlet?',
      choices: ['Shakespeare', 'Milton', 'Chaucer'],
      answer: 0,
    }

    expect(await bookmarksStore.isBookmarked('bm-q-1')).toBe(false)

    // First toggle adds bookmark
    const added = await bookmarksStore.toggleBookmark(question, { trackId: 'english', unitId: 'lit' })
    expect(added).toBe(true)
    expect(await bookmarksStore.isBookmarked('bm-q-1')).toBe(true)

    const list = await bookmarksStore.getAll()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('bm-q-1')
    expect(list[0].trackId).toBe('english')

    // Second toggle removes bookmark
    const removed = await bookmarksStore.toggleBookmark(question)
    expect(removed).toBe(false)
    expect(await bookmarksStore.isBookmarked('bm-q-1')).toBe(false)
    expect(await bookmarksStore.getAll()).toHaveLength(0)
  })
})
