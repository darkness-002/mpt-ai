import { useEffect, useState } from 'react'
import { CloseIcon, NotesIcon } from './icons.jsx'
import { notesStore } from '../storage/notesStore.js'
import './NoteModal.css'

export default function NoteModal({ isOpen, onClose, question }) {
  const [noteText, setNoteText] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (!isOpen || !question) return
    let active = true
    notesStore.getNote(question.id).then((text) => {
      if (active) {
        setNoteText(text || '')
        setIsSaved(false)
      }
    })
    return () => {
      active = false
    }
  }, [isOpen, question])

  if (!isOpen || !question) return null

  const handleSave = async () => {
    await notesStore.saveNote(question.id, noteText, question)
    setIsSaved(true)
    setTimeout(() => {
      setIsSaved(false)
      onClose()
    }, 600)
  }

  const handleDelete = async () => {
    await notesStore.deleteNote(question.id)
    setNoteText('')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal note-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="note-modal-title"
      >
        <div className="note-modal__header">
          <div className="note-modal__title-wrap">
            <NotesIcon width="18" height="18" style={{ color: 'var(--gold)' }} />
            <h2 id="note-modal-title">Study Note & Mnemonic</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon width="18" height="18" />
          </button>
        </div>

        <p className="note-modal__prompt">
          <strong>Q:</strong> {question.prompt}
        </p>

        <label htmlFor="candidate-note-input" className="note-modal__label">
          Personal notes, formula reminders, or memory keys:
        </label>
        <textarea
          id="candidate-note-input"
          className="note-modal__textarea"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="e.g. Remember: Treaty of Lausanne signed 1923; replace Treaty of Sèvres (1920)..."
          rows={5}
          autoFocus
        />

        <div className="note-modal__footer">
          {noteText && (
            <button
              type="button"
              className="btn btn--small btn--ghost"
              style={{ color: 'var(--red)' }}
              onClick={handleDelete}
            >
              Clear Note
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--small btn--primary"
              onClick={handleSave}
            >
              {isSaved ? 'Saved!' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
