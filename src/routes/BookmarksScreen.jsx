import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  BookmarkStarIcon,
  CheckCircleIcon,
  CloseIcon,
  CopyIcon,
  NotesIcon,
  SearchIcon,
  Volume2Icon,
} from '../components/icons.jsx'
import QuestionTTS from '../components/QuestionTTS.jsx'
import NoteModal from '../components/NoteModal.jsx'
import { bookmarksStore } from '../storage/bookmarksStore.js'
import { notesStore } from '../storage/notesStore.js'
import './BookmarksScreen.css'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTrack, setSelectedTrack] = useState('all')
  const [notesMap, setNotesMap] = useState({})
  const [noteModalQuestion, setNoteModalQuestion] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  const reload = useCallback(async () => {
    const list = await bookmarksStore.getAll()
    setBookmarks(list)

    // Load notes for all bookmarked questions
    const allNotes = await notesStore.getAll()
    const map = {}
    allNotes.forEach((n) => {
      map[n.id] = n.text
    })
    setNotesMap(map)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    reload().then(() => {
      if (!active) setLoading(false)
    })
    return () => {
      active = false
    }
  }, [reload])

  const handleRemove = async (questionId) => {
    await bookmarksStore.toggleBookmark({ id: questionId })
    await reload()
    showToast('Question removed from bookmarks')
  }

  const handleCopy = (question) => {
    const choicesText = question.choices
      .map((c, i) => `${LETTERS[i]}. ${c}`)
      .join('\n')
    const textToCopy = `Question: ${question.prompt}\n\n${choicesText}\n\nAnswer: ${LETTERS[question.answer]}. ${question.choices[question.answer]}${question.explanation ? `\n\nExplanation: ${question.explanation}` : ''}`

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Question copied to clipboard')
      }).catch(() => {
        showToast('Failed to copy to clipboard')
      })
    }
  }

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  // Extract unique tracks available in bookmarks
  const trackOptions = useMemo(() => {
    const tracks = new Map()
    bookmarks.forEach(({ question }) => {
      const trackId = question.trackId || 'general'
      const trackTitle = question.trackTitle || (trackId === 'css-mpt' ? 'CSS MPT' : trackId === 'pms-prelims' ? 'PMS Prelims' : 'General Syllabus')
      tracks.set(trackId, { id: trackId, title: trackTitle, count: (tracks.get(trackId)?.count || 0) + 1 })
    })
    return Array.from(tracks.values())
  }, [bookmarks])

  // Filter bookmarks by search and track
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(({ question }) => {
      if (selectedTrack !== 'all' && (question.trackId || 'general') !== selectedTrack) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchPrompt = question.prompt.toLowerCase().includes(q)
        const matchChoices = question.choices.some((c) => c.toLowerCase().includes(q))
        const matchExplanation = question.explanation?.toLowerCase().includes(q)
        const matchNote = notesMap[question.id]?.toLowerCase().includes(q)
        if (!matchPrompt && !matchChoices && !matchExplanation && !matchNote) {
          return false
        }
      }
      return true
    })
  }, [bookmarks, selectedTrack, searchQuery, notesMap])

  if (loading) {
    return (
      <div className="bookmarks-screen">
        <div className="bookmarks-loading">Loading bookmarked questions…</div>
      </div>
    )
  }

  return (
    <div className="bookmarks-screen">
      <header className="bookmarks-screen__header">
        <div className="bookmarks-screen__top">
          <Link className="back-link" to="/">
            <ArrowLeftIcon width="16" height="16" />
            <span>Curriculum</span>
          </Link>
          <span className="bookmarks-count-pill">
            <BookmarkStarIcon width="14" height="14" style={{ color: 'var(--gold-text)' }} />
            <span>{bookmarks.length} Bookmarks</span>
          </span>
        </div>

        <div className="bookmarks-title-row">
          <div className="bookmarks-icon-badge" aria-hidden="true">
            <BookmarkStarIcon width="24" height="24" style={{ color: 'var(--gold-text)' }} />
          </div>
          <div>
            <h1>Starred Questions</h1>
            <p className="bookmarks-screen__blurb">
              High-yield and tricky MCQs bookmarked during your study sessions for quick revision.
            </p>
          </div>
        </div>
      </header>

      {/* Search & Filter Bar */}
      {bookmarks.length > 0 && (
        <div className="bookmarks-controls-card">
          <div className="bookmarks-search-box">
            <SearchIcon width="16" height="16" className="search-icon" />
            <input
              type="text"
              placeholder="Search in bookmarked questions, choices, or personal notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bookmarks-search-input"
              aria-label="Search bookmarks"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <CloseIcon width="14" height="14" />
              </button>
            )}
          </div>

          {/* Track Filter Chips */}
          <div className="bookmarks-track-chips" role="tablist" aria-label="Filter by Track">
            <button
              type="button"
              className={`track-chip ${selectedTrack === 'all' ? 'is-active' : ''}`}
              onClick={() => setSelectedTrack('all')}
            >
              All ({bookmarks.length})
            </button>
            {trackOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`track-chip ${selectedTrack === t.id ? 'is-active' : ''}`}
                onClick={() => setSelectedTrack(t.id)}
              >
                {t.title} ({t.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bookmarks List or Empty State */}
      <main className="bookmarks-screen__body">
        {bookmarks.length === 0 ? (
          <div className="bookmarks-empty">
            <div className="bookmarks-empty-icon" aria-hidden="true">
              <BookmarkStarIcon width="44" height="44" style={{ color: 'var(--gold-text)' }} />
            </div>
            <h2>No Starred Questions Yet</h2>
            <p>
              Tap the star icon on any question card in lessons or practice drills to save it here for rapid revision.
            </p>
            <Link className="btn btn--primary" to="/">
              Explore Curriculum
            </Link>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="bookmarks-empty">
            <SearchIcon width="36" height="36" style={{ color: 'var(--muted)', marginBottom: '0.75rem' }} />
            <h2>No Bookmarks Match Your Search</h2>
            <p>Try clearing your keyword search or selecting &quot;All&quot; tracks to view all starred questions.</p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setSearchQuery('')
                setSelectedTrack('all')
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <ul className="bookmarks-list">
            {filteredBookmarks.map(({ id, question, savedAt }) => {
              const note = notesMap[id]
              return (
                <li key={id} className="bookmark-card">
                  {/* Card Meta & Header */}
                  <div className="bookmark-card__top">
                    <div className="bookmark-meta-tags">
                      {question.trackTitle && (
                        <span className="bookmark-topic-pill">
                          {question.trackTitle} {question.unitTitle ? `• ${question.unitTitle}` : ''}
                        </span>
                      )}
                      <span className="bookmark-date-pill">
                        Saved {new Date(savedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Tools Cluster: TTS, Note, Copy, Unbookmark */}
                    <div className="bookmark-tools">
                      <QuestionTTS question={question} />

                      <button
                        type="button"
                        className={`tool-btn ${note ? 'has-note' : ''}`}
                        onClick={() => setNoteModalQuestion(question)}
                        title={note ? 'View / Edit Personal Note' : 'Add Study Note'}
                        aria-label="Add or view study note"
                      >
                        <NotesIcon width="15" height="15" />
                        <span>{note ? 'Note' : '+Note'}</span>
                      </button>

                      <button
                        type="button"
                        className="tool-btn icon-only"
                        onClick={() => handleCopy(question)}
                        title="Copy question to clipboard"
                        aria-label="Copy question"
                      >
                        <CopyIcon width="15" height="15" />
                      </button>

                      <button
                        type="button"
                        className="tool-btn tool-btn--unstar"
                        onClick={() => handleRemove(id)}
                        title="Remove bookmark"
                        aria-label="Remove bookmark"
                      >
                        <BookmarkStarIcon width="15" height="15" style={{ color: 'var(--gold-text)' }} />
                      </button>
                    </div>
                  </div>

                  {/* Directive (if any) */}
                  {question.directive && (
                    <div className="bookmark-directive">{question.directive}</div>
                  )}

                  {/* Question Stem */}
                  <h3
                    className={`bookmark-card__prompt ${question.rtl ? 'urdu' : ''}`}
                    dir={question.rtl ? 'rtl' : 'ltr'}
                  >
                    {question.prompt}
                  </h3>

                  {/* Statements (if any) */}
                  {question.statements && question.statements.length > 0 && (
                    <ol className="bookmark-statements" dir={question.rtl ? 'rtl' : 'ltr'}>
                      {question.statements.map((s, i) => (
                        <li key={i}>
                          <span className="statement-num">{LETTERS[i] || i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {/* Choices List */}
                  <ul className="bookmark-choices" dir={question.rtl ? 'rtl' : 'ltr'}>
                    {question.choices.map((c, i) => {
                      const isCorrect = i === question.answer
                      return (
                        <li
                          key={i}
                          className={`bookmark-choice ${isCorrect ? 'is-correct' : ''}`}
                        >
                          <span className="choice-omr-bubble" aria-hidden="true">
                            {LETTERS[i] ?? i + 1}
                          </span>
                          <span className={`choice-text ${question.rtl ? 'urdu' : ''}`}>{c}</span>
                          {isCorrect && (
                            <span className="correct-tag">
                              <CheckCircleIcon width="13" height="13" /> Correct Key
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="bookmark-card__explanation">
                      <strong>Explanation:</strong>
                      <p>{question.explanation}</p>
                    </div>
                  )}

                  {/* Personal Study Note */}
                  {note && (
                    <div className="bookmark-card__user-note">
                      <NotesIcon width="14" height="14" style={{ color: 'var(--gold-text)', flexShrink: 0 }} />
                      <div className="user-note-content">
                        <strong>My Note:</strong> {note}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {/* Note Modal */}
      {noteModalQuestion && (
        <NoteModal
          isOpen={!!noteModalQuestion}
          onClose={() => {
            setNoteModalQuestion(null)
            reload()
          }}
          question={noteModalQuestion}
        />
      )}

      {/* Feedback Toast */}
      {toastMessage && (
        <div className="bookmarks-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
