import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftIcon,
  TrashIcon,
  RotateCcwIcon,
  SparklesIcon,
  SearchIcon,
  CheckCircleIcon,
  FlameIcon,
} from '../components/icons.jsx'
import MCQCard from '../components/MCQCard.jsx'
import { Modal, Button } from '../components/UIPrimitives.jsx'
import { explainQuestion } from '../data/curriculum.js'
import { feedbackService } from '../lib/feedback.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import './MistakesScreen.css'

export default function MistakesScreen() {
  const [mistakes, setMistakes] = useState([])
  const [dueList, setDueList] = useState([])
  const [viewMode, setViewMode] = useState('review') // 'review' | 'browse'
  const [browseFilter, setBrowseFilter] = useState('all') // 'all' | 'due' | 'mastered'
  const [searchQuery, setSearchQuery] = useState('')

  // Review session state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [eliminated, setEliminated] = useState({})
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const reload = useCallback(async () => {
    const all = await mistakesStore.getAll()
    const due = await mistakesStore.getDue()
    setMistakes(all)
    setDueList(due)
    setCurrentIndex(0)
    setSelected(null)
    setEliminated({})
    setChecked(false)
    setSessionFinished(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true
    Promise.all([mistakesStore.getAll(), mistakesStore.getDue()]).then(([all, due]) => {
      if (!mounted) return
      setMistakes(all)
      setDueList(due)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const currentItem = dueList[currentIndex]
  const question = currentItem?.question
  const isPracticing = viewMode === 'review' && dueList.length > 0 && Boolean(question) && !sessionFinished

  // Hide bottom navigation during active mistake practice
  useEffect(() => {
    if (isPracticing) {
      document.body.dataset.immersive = 'true'
      document.body.classList.add('is-immersive-drill')
    } else {
      delete document.body.dataset.immersive
      document.body.classList.remove('is-immersive-drill')
    }
    return () => {
      delete document.body.dataset.immersive
      document.body.classList.remove('is-immersive-drill')
    }
  }, [isPracticing])

  const toggleEliminate = (choiceIndex) => {
    setEliminated((prev) => ({
      ...prev,
      [choiceIndex]: !prev[choiceIndex],
    }))
  }

  const check = () => {
    if (selected === null || checked || !currentItem) return
    const isCorrect = selected === question.answer
    setChecked(true)
    mistakesStore.recordReviewResult(currentItem.id, isCorrect)
    setReviewedCount((c) => c + 1)

    if (isCorrect) {
      feedbackService.onCorrect()
    } else {
      feedbackService.onWrong()
    }
  }

  const advance = () => {
    if (currentIndex >= dueList.length - 1) {
      setSessionFinished(true)
      feedbackService.celebrate()
    } else {
      setCurrentIndex((i) => i + 1)
      setSelected(null)
      setEliminated({})
      setChecked(false)
    }
  }

  const handleRemoveSingle = async (id, e) => {
    e.stopPropagation()
    await mistakesStore.remove(id)
    await reload()
  }

  const handleClearAll = async () => {
    await mistakesStore.clear()
    setShowClearConfirm(false)
    await reload()
  }

  // Leitner Boxes Distribution
  const box1Count = mistakes.filter((m) => (m.streak ?? 0) === 0 && !m.mastered).length
  const box2Count = mistakes.filter((m) => (m.streak ?? 0) === 1 && !m.mastered).length
  const masteredCount = mistakes.filter((m) => m.mastered).length

  // Filtered browse list
  const filteredBrowseList = useMemo(() => {
    return mistakes.filter((item) => {
      if (browseFilter === 'due') {
        const isDue = (item.nextReviewAt ?? 0) <= Date.now() && !item.mastered
        if (!isDue) return false
      }
      if (browseFilter === 'mastered') {
        if (!item.mastered) return false
      }
      if (searchQuery.trim()) {
        const qText = item.question?.prompt?.toLowerCase() || ''
        const match = qText.includes(searchQuery.toLowerCase())
        if (!match) return false
      }
      return true
    })
  }, [mistakes, browseFilter, searchQuery])

  if (loading) {
    return (
      <div className="mistakes-screen" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p className="text-sm font-semibold text-[var(--muted)]">Loading your Leitner SRS Mistakes Bank…</p>
      </div>
    )
  }

  return (
    <div className="mistakes-screen">
      <header className="mistakes-screen__header">
        <div className="mistakes-screen__top">
          <Link className="path-back-btn" to="/">
            <ArrowLeftIcon width="16" height="16" />
            <span>Curriculum Desk</span>
          </Link>

          {/* Mode Switcher Tabs */}
          <div className="mistakes-mode-tabs" role="tablist">
            <button
              type="button"
              className={`mode-tab-btn ${viewMode === 'review' ? 'is-active' : ''}`}
              onClick={() => setViewMode('review')}
            >
              Review Due ({dueList.length})
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${viewMode === 'browse' ? 'is-active' : ''}`}
              onClick={() => setViewMode('browse')}
            >
              Browse All ({mistakes.length})
            </button>
          </div>
        </div>

        <div className="mistakes-title-wrap">
          <h1>Mistakes Bank</h1>
          <p className="mistakes-screen__blurb">
            Spaced repetition review of questions you answered incorrectly 
          </p>
        </div>

        {/* Leitner SRS Box Diagnostic Stats */}
        <div className="leitner-srs-strip">
          <div className="leitner-box">
            <span className="leitner-box__num font-mono">{box1Count}</span>
            <span className="leitner-box__label">Stage 1 (Daily)</span>
          </div>
          <div className="leitner-arrow" aria-hidden="true">→</div>
          <div className="leitner-box">
            <span className="leitner-box__num font-mono">{box2Count}</span>
            <span className="leitner-box__label">Stage 2 (3 Days)</span>
          </div>
          <div className="leitner-arrow" aria-hidden="true">→</div>
          <div className="leitner-box leitner-box--mastered">
            <span className="leitner-box__num font-mono text-[var(--gold-text)]">{masteredCount}</span>
            <span className="leitner-box__label">Mastered (Stage 3)</span>
          </div>
        </div>
      </header>

      <main className="mistakes-screen__body">
        {viewMode === 'review' ? (
          sessionFinished ? (
            <div className="mistakes-card mistakes-card--done">
              <SparklesIcon width="40" height="40" style={{ color: 'var(--gold-text)' }} />
              <h2>Review Session Complete!</h2>
              <p>You reviewed {reviewedCount} missed question{reviewedCount === 1 ? '' : 's'}. Next intervals have been updated in your Leitner schedule.</p>
              <div className="mistakes-actions">
                <Button variant="primary" onClick={reload}>
                  Refresh Due List
                </Button>
                <Link className="btn btn--ghost" to="/">
                  Back to Desk
                </Link>
              </div>
            </div>
          ) : dueList.length === 0 ? (
            <div className="mistakes-card">
              <CheckCircleIcon width="44" height="44" style={{ color: 'var(--green-text)' }} />
              <h2>All caught up!</h2>
              <p>
                {mistakes.length === 0
                  ? 'No mistakes recorded yet. As you solve questions in lessons or mock exams, any missed items will appear here automatically.'
                  : 'No questions are currently due for review according to your Leitner Spaced Repetition intervals.'}
              </p>
              <div className="mistakes-actions">
                <Link className="btn btn--primary" to="/">
                  Explore Lessons →
                </Link>
                {mistakes.length > 0 && (
                  <Button variant="ghost" onClick={() => setViewMode('browse')}>
                    Browse All Recorded Mistakes
                  </Button>
                )}
              </div>
            </div>
          ) : question ? (
            <div className="mistakes-practice">
              <div className="mistakes-practice__bar">
                <span className="badge font-mono">
                  Reviewing {currentIndex + 1} of {dueList.length}
                </span>
                <span className="mistakes-practice__streak font-mono">
                  Leitner Streak: <strong>{currentItem.streak ?? 0}</strong>
                </span>
              </div>

              <MCQCard
                question={question}
                selectedChoice={selected}
                eliminatedChoices={eliminated}
                checked={checked}
                bookmarked={false}
                hasNote={false}
                penalty={0}
                onSelectChoice={(idx) => !checked && setSelected(idx)}
                onToggleEliminate={toggleEliminate}
                explanation={explainQuestion(question)}
                unitLabel={question.unitTitle || 'Mistakes Bank'}
              />

              <div className="mistakes-practice__footer">
                <button
                  className={`btn btn--wide ${checked && selected !== question.answer ? 'btn--continue-wrong' : 'btn--primary'}`}
                  type="button"
                  onClick={checked ? advance : check}
                  disabled={selected === null}
                >
                  {checked ? (currentIndex === dueList.length - 1 ? 'Finish Session' : 'Continue (Enter)') : 'Check Answer (Enter)'}
                </button>
              </div>
            </div>
          ) : null
        ) : (
          /* Browse & Filter Mode */
          <div className="mistakes-browse-mode">
            <div className="browse-filter-bar">
              <div className="browse-search-wrap">
                <SearchIcon width="16" height="16" className="search-icon" />
                <input
                  type="text"
                  placeholder="Search questions in bank…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="browse-search-input"
                />
              </div>

              <div className="browse-filter-tabs">
                {[
                  { id: 'all', label: `All (${mistakes.length})` },
                  { id: 'due', label: `Due (${dueList.length})` },
                  { id: 'mastered', label: `Mastered (${masteredCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`browse-tab ${browseFilter === tab.id ? 'is-active' : ''}`}
                    onClick={() => setBrowseFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredBrowseList.length === 0 ? (
              <div className="mistakes-card" style={{ marginTop: '1.5rem' }}>
                <p>No questions matching your search and filter criteria.</p>
              </div>
            ) : (
              <div className="browse-list-grid">
                {filteredBrowseList.map((item) => (
                  <div key={item.id} className="browse-item-card">
                    <div className="browse-item-header">
                      <div className="flex items-center gap-2">
                        <span className={`streak-badge font-mono ${item.mastered ? 'is-mastered' : ''}`}>
                          {item.mastered ? '★ Mastered' : `Box ${(item.streak ?? 0) + 1}`}
                        </span>
                        <span className="wrong-count font-mono text-xs text-[var(--muted)]">
                          Missed {item.wrongCount ?? 1}x
                        </span>
                      </div>
                      <button
                        type="button"
                        className="remove-mistake-btn"
                        onClick={(e) => handleRemoveSingle(item.id, e)}
                        title="Remove from Mistakes Bank"
                        aria-label="Remove question from mistakes bank"
                      >
                        <TrashIcon width="14" height="14" />
                      </button>
                    </div>

                    <p className={`browse-item-stem ${item.question?.rtl ? 'urdu' : ''}`} dir={item.question?.rtl ? 'rtl' : 'ltr'}>
                      {item.question?.prompt}
                    </p>

                    <div className="browse-item-answer">
                      <span className="ans-label">Correct:</span>
                      <span className={`ans-text ${item.question?.rtl ? 'urdu' : ''}`}>
                        {item.question?.choices?.[item.question?.answer]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mistakes.length > 0 && (
          <div className="mistakes-footer-action">
            <button
              className="btn btn--ghost btn--small text-[var(--red-text)]"
              type="button"
              onClick={() => setShowClearConfirm(true)}
            >
              Clear Entire Mistakes Bank
            </button>
          </div>
        )}
      </main>

      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Entire Mistakes Bank?"
      >
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.5, margin: '0 0 1.5rem' }}>
          This will permanently delete all {mistakes.length} recorded mistakes and reset your Leitner Spaced Repetition progress. Regular lesson progress and bookmarks will remain intact.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="small" onClick={() => setShowClearConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="small" onClick={handleClearAll}>
            Yes, Clear Bank
          </Button>
        </div>
      </Modal>
    </div>
  )
}
