import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CardsIcon,
  CheckCircleIcon,
  NotesIcon,
  RotateCcwIcon,
  StarIcon,
  FlameIcon,
} from '../components/icons.jsx'
import QuestionTTS from '../components/QuestionTTS.jsx'
import NoteModal from '../components/NoteModal.jsx'
import { useContent } from '../content/contentContext.js'
import { bookmarksStore } from '../storage/bookmarksStore.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { notesStore } from '../storage/notesStore.js'
import { shuffle } from '../lib/shuffle.js'
import './FlashcardsScreen.css'

export default function FlashcardsScreen() {
  const { tracks } = useContent()
  const [deckType, setDeckType] = useState('all') // 'all' | 'starred' | 'mistakes' | trackId
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [cardStats, setCardStats] = useState({ mastered: 0, review: 0 })
  const [noteModalQuestion, setNoteModalQuestion] = useState(null)
  const [activeNote, setActiveNote] = useState('')
  const [loading, setLoading] = useState(true)

  // Load question pool based on deckType
  useEffect(() => {
    let active = true
    setLoading(true)

    const loadPool = async () => {
      let pool = []
      if (deckType === 'starred') {
        const bookmarks = await bookmarksStore.getAll()
        pool = bookmarks.map((b) => b.question).filter(Boolean)
      } else if (deckType === 'mistakes') {
        const mistakes = await mistakesStore.getAll()
        pool = mistakes.map((m) => m.question).filter(Boolean)
      } else if (deckType === 'all') {
        pool = tracks.flatMap((t) =>
          t.units.flatMap((u) =>
            u.lessons.flatMap((l) =>
              l.questions.map((q) => ({ ...q, trackTitle: t.title, unitTitle: u.title })),
            ),
          ),
        )
      } else {
        // Specific track
        const track = tracks.find((t) => t.id === deckType)
        if (track) {
          pool = track.units.flatMap((u) =>
            u.lessons.flatMap((l) =>
              l.questions.map((q) => ({ ...q, trackTitle: track.title, unitTitle: u.title })),
            ),
          )
        }
      }

      if (active) {
        setQuestions(shuffle(pool))
        setCurrentIndex(0)
        setIsFlipped(false)
        setCardStats({ mastered: 0, review: 0 })
        setLoading(false)
      }
    }

    loadPool()
    return () => {
      active = false
    }
  }, [deckType, tracks])

  const currentQ = questions[currentIndex]

  // Fetch candidate note for the active question
  useEffect(() => {
    if (!currentQ) {
      setActiveNote('')
      return
    }
    let active = true
    notesStore.getNote(currentQ.id).then((n) => {
      if (active) setActiveNote(n || '')
    })
    return () => {
      active = false
    }
  }, [currentQ])

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setIsFlipped(false)
    }
  }, [currentIndex, questions.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setIsFlipped(false)
    }
  }, [currentIndex])

  const handleRate = useCallback((quality) => {
    if (quality === 'easy') {
      setCardStats((s) => ({ ...s, mastered: s.mastered + 1 }))
    } else if (quality === 'hard') {
      setCardStats((s) => ({ ...s, review: s.review + 1 }))
    }
    handleNext()
  }, [handleNext])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        setIsFlipped((f) => !f)
      } else if (e.key === '1') {
        handleRate('hard')
      } else if (e.key === '2') {
        handleRate('good')
      } else if (e.key === '3') {
        handleRate('easy')
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, handleRate])

  const handleRestart = () => {
    setQuestions(shuffle(questions))
    setCurrentIndex(0)
    setIsFlipped(false)
    setCardStats({ mastered: 0, review: 0 })
  }

  return (
    <div className="flashcards-page">
      <div className="flashcards-header">
        <Link to="/" className="back-link">
          <ArrowLeftIcon width="16" height="16" />
          <span>Curriculum</span>
        </Link>
        <div className="flashcards-title-wrap">
          <CardsIcon width="22" height="22" style={{ color: 'var(--blue)' }} />
          <h1>Active Recall Flashcards</h1>
        </div>
      </div>

      {/* Deck Selector Tabs */}
      <div className="deck-selector-bar">
        <button
          type="button"
          className={`deck-tab ${deckType === 'all' ? 'is-active' : ''}`}
          onClick={() => setDeckType('all')}
        >
          All Syllabus
        </button>
        <button
          type="button"
          className={`deck-tab ${deckType === 'starred' ? 'is-active' : ''}`}
          onClick={() => setDeckType('starred')}
        >
          <StarIcon width="13" height="13" /> Starred Deck
        </button>
        <button
          type="button"
          className={`deck-tab ${deckType === 'mistakes' ? 'is-active' : ''}`}
          onClick={() => setDeckType('mistakes')}
        >
          <FlameIcon width="13" height="13" /> Mistakes SRS
        </button>
        {tracks.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`deck-tab ${deckType === t.id ? 'is-active' : ''}`}
            onClick={() => setDeckType(t.id)}
          >
            {t.title}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flashcards-empty">Loading flashcards deck…</div>
      ) : questions.length === 0 ? (
        <div className="flashcards-empty">
          <CardsIcon width="36" height="36" style={{ color: 'var(--muted)', marginBottom: '0.75rem' }} />
          <h3>No flashcards found in this deck</h3>
          <p>
            {deckType === 'starred'
              ? 'Star questions during lessons or drills to review them here.'
              : deckType === 'mistakes'
              ? 'Missed questions will automatically appear in your review deck.'
              : 'Try selecting another deck.'}
          </p>
        </div>
      ) : (
        <div className="flashcards-stage">
          {/* Card Meta & Progress Bar */}
          <div className="flashcards-progress-wrap">
            <span className="flashcards-count">
              Card <strong>{currentIndex + 1}</strong> of {questions.length}
            </span>
            <div className="flashcards-meter">
              <div
                className="flashcards-meter__fill"
                style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
              />
            </div>
            <div className="flashcards-stats-pill">
              <span className="stat-green">✓ {cardStats.mastered} Mastered</span>
              <span className="stat-red">↺ {cardStats.review} Repeat</span>
            </div>
          </div>

          {/* 3D Flip Card Container */}
          <div
            className={`flashcard ${isFlipped ? 'is-flipped' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
            dir={currentQ?.rtl ? 'rtl' : 'ltr'}
          >
            <div className="flashcard__inner">
              {/* Front Side: Question */}
              <div className="flashcard__face flashcard__front">
                <div className="card-badge-row">
                  <span className="card-topic-pill">
                    {currentQ?.trackTitle || 'Question'} {currentQ?.unitTitle ? `• ${currentQ.unitTitle}` : ''}
                  </span>
                  <div className="card-tools" onClick={(e) => e.stopPropagation()}>
                    <QuestionTTS question={currentQ} />
                    <button
                      type="button"
                      className={`note-btn ${activeNote ? 'has-note' : ''}`}
                      onClick={() => setNoteModalQuestion(currentQ)}
                      title="Add or view study note"
                    >
                      <NotesIcon width="14" height="14" />
                      <span>{activeNote ? 'Note' : '+Note'}</span>
                    </button>
                  </div>
                </div>

                {currentQ?.directive && (
                  <div className="card-directive">{currentQ.directive}</div>
                )}

                <h2 className={`card-prompt ${currentQ?.rtl ? 'urdu' : ''}`}>
                  {currentQ?.prompt}
                </h2>

                {currentQ?.statements && currentQ.statements.length > 0 && (
                  <div className="card-statements">
                    {currentQ.statements.map((s, i) => (
                      <div key={i} className="statement-line">
                        {s}
                      </div>
                    ))}
                  </div>
                )}

                <div className="card-hint-bottom">
                  <span>Tap card or press <kbd>Space</kbd> to flip & reveal answer</span>
                </div>
              </div>

              {/* Back Side: Answer & Explanation */}
              <div className="flashcard__face flashcard__back">
                <div className="card-badge-row">
                  <span className="card-answer-badge">
                    <CheckCircleIcon width="15" height="15" /> Correct Answer
                  </span>
                  <div className="card-tools" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`note-btn ${activeNote ? 'has-note' : ''}`}
                      onClick={() => setNoteModalQuestion(currentQ)}
                    >
                      <NotesIcon width="14" height="14" />
                      <span>{activeNote ? 'Edit Note' : '+Note'}</span>
                    </button>
                  </div>
                </div>

                <div className={`card-correct-choice ${currentQ?.rtl ? 'urdu' : ''}`}>
                  <strong>{currentQ?.choices[currentQ?.answer]}</strong>
                </div>

                {currentQ?.explanation && (
                  <div className="card-explanation">
                    <strong>Explanation:</strong>
                    <p>{currentQ.explanation}</p>
                  </div>
                )}

                {activeNote && (
                  <div className="card-user-note">
                    <NotesIcon width="14" height="14" style={{ color: 'var(--gold)', flexShrink: 0 }} />
                    <div className="user-note-text">
                      <strong>My Study Note:</strong> {activeNote}
                    </div>
                  </div>
                )}

                <div className="card-hint-bottom">
                  <span>Tap card or press <kbd>Space</kbd> to flip back</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rating & Advance Actions */}
          <div className="flashcards-controls">
            <button
              type="button"
              className="btn btn--small btn--ghost rating-btn is-hard"
              onClick={() => handleRate('hard')}
              title="Press 1"
            >
              <span>↺ Hard (1)</span>
            </button>
            <button
              type="button"
              className="btn btn--small btn--ghost rating-btn is-good"
              onClick={() => handleRate('good')}
              title="Press 2"
            >
              <span>Good (2)</span>
            </button>
            <button
              type="button"
              className="btn btn--small rating-btn is-easy"
              onClick={() => handleRate('easy')}
              title="Press 3"
            >
              <span>✓ Easy (3)</span>
            </button>
            <button
              type="button"
              className="icon-btn restart-btn"
              onClick={handleRestart}
              title="Reshuffle & Restart Deck"
            >
              <RotateCcwIcon width="18" height="18" />
            </button>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {noteModalQuestion && (
        <NoteModal
          isOpen={!!noteModalQuestion}
          onClose={() => {
            setNoteModalQuestion(null)
            if (currentQ) {
              notesStore.getNote(currentQ.id).then((n) => setActiveNote(n || ''))
            }
          }}
          question={noteModalQuestion}
        />
      )}
    </div>
  )
}
