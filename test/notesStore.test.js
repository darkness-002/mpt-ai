import { beforeEach, describe, expect, it } from 'vitest'
import { notesStore } from '../src/storage/notesStore.js'

describe('notesStore', () => {
  beforeEach(async () => {
    await notesStore.clear()
  })

  it('saves, retrieves, and clears candidate notes on questions', async () => {
    const questionId = 'eng-q-101'
    const noteText = 'Remember: ephemeral means short-lived / transient.'

    expect(await notesStore.getNote(questionId)).toBe('')

    // Save note
    await notesStore.saveNote(questionId, noteText, { id: questionId, prompt: 'Ephemeral means?' })
    expect(await notesStore.getNote(questionId)).toBe(noteText)

    const all = await notesStore.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(questionId)
    expect(all[0].text).toBe(noteText)

    // Delete note
    await notesStore.deleteNote(questionId)
    expect(await notesStore.getNote(questionId)).toBe('')
    expect(await notesStore.getAll()).toHaveLength(0)
  })
})
