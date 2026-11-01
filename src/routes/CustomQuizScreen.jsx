import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CloseIcon,
  BookmarkStarIcon,
  TargetIcon,
  TimerIcon,
  RotateCcwIcon,
  CheckCircleIcon,
} from '../components/icons.jsx'
import MCQCard from '../components/MCQCard.jsx'
import NoteModal from '../components/NoteModal.jsx'
import OMRSheet from '../components/OMRSheet.jsx'
import { useContent } from '../content/contentContext.js'
import { calculateScore, explainQuestion } from '../data/curriculum.js'
import { feedbackService } from '../lib/feedback.js'
import { shuffle } from '../lib/shuffle.js'
import { bookmarksStore } from '../storage/bookmarksStore.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { notesStore } from '../storage/notesStore.js'
import { streakStore } from '../storage/streakStore.js'
import './CustomQuizScreen.css'

const CHOICE_KEYS = ['1', '2', '3', '4', 'a', 'b', 'c', 'd', 'A', 'B', 'C', 'D']

export default function CustomQuizScreen() {
  const { tracks, ready } = useContent()
  const [searchParams] = useSearchParams()
  const paramTrackId = searchParams.get('trackId')
  const paramUnitId = searchParams.get('unitId')
  const paramAutoStart = searchParams.get('autoStart') === 'true'
  const paramCount = Number(searchParams.get('count'))

  const [selectedTrackId, setSelectedTrackId] = useState(() => paramTrackId || '')
  const activeTrack = tracks.find((t) => t.id === (selectedTrackId || paramTrackId)) ?? tracks[0]
  const activeTrackId = activeTrack?.id ?? ''

  // Units selection map: default is all checked unless specified or explicitly modified
  const [selectedUnits, setSelectedUnits] = useState(() => {
    if (paramUnitId) return { [paramUnitId]: true, _onlyExplicit: true }
    return {}
  })

  const [poolType, setPoolType] = useState('all') // 'all' | 'mistakes' | 'starred'
  const [questionCount, setQuestionCount] = useState(paramCount > 0 ? paramCount : 15)
  const [isTimed, setIsTimed] = useState(false)
  const [mistakeCount, setMistakeCount] = useState(0)
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const autoStartedRef = useRef(false)

  // Active quiz states
  const [quizState, setQuizState] = useState('config') // 'config' | 'active' | 'finished'
  const [activeQuestions, setActiveQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [eliminatedChoices, setEliminatedChoices] = useState({})
  const [isChecked, setIsChecked] = useState(false)
  const [answers, setAnswers] = useState([])
  const [bookmarked, setBookmarked] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [hasNote, setHasNote] = useState(false)

  // Timer state for timed drill
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  const currentQ = activeQuestions[currentIndex]

  useEffect(() => {
    if (!currentQ) return
    let active = true
    notesStore.getNote(currentQ.id).then((text) => {
      if (active) setHasNote(Boolean(text))
    })
    return () => {
      active = false
    }
  }, [currentQ])

  // Hide bottom navigation during active and finished drill states
  useEffect(() => {
    if (quizState === 'active' || quizState === 'finished') {
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
  }, [quizState])

  // Load mistake and bookmark counts for pool selection tabs
  useEffect(() => {
    let active = true
    Promise.all([mistakesStore.getAll(), bookmarksStore.getAll()]).then(([m, b]) => {
      if (active) {
        setMistakeCount(m.length)
        setBookmarkCount(b.length)
      }
    })
    return () => {
      active = false
    }
  }, [quizState])

  const handleTrackChange = (trackId) => {
    setSelectedTrackId(trackId)
    setSelectedUnits({})
  }

  const isUnitSelected = (unitId) => {
    if (selectedUnits._onlyExplicit) {
      return Boolean(selectedUnits[unitId])
    }
    return selectedUnits[unitId] ?? true
  }

  const toggleUnit = (unitId) => {
    setSelectedUnits((prev) => {
      if (prev._onlyExplicit) {
        return {
          ...prev,
          [unitId]: !prev[unitId],
        }
      }
      const next = { _onlyExplicit: true }
      activeTrack?.units?.forEach((u) => {
        next[u.id] = u.id === unitId ? !(prev[u.id] ?? true) : (prev[u.id] ?? true)
      })
      return next
    })
  }

  const selectAllUnits = () => {
    setSelectedUnits({})
  }

  const deselectAllUnits = () => {
    const none = { _onlyExplicit: true }
    activeTrack?.units?.forEach((u) => {
      none[u.id] = false
    })
    setSelectedUnits(none)
  }

  // Calculate available units and question count based on current settings
  const enabledUnits = (activeTrack?.units ?? []).filter((u) => isUnitSelected(u.id))
  const availableTrackQuestionsCount = enabledUnits.reduce(
    (acc, u) => acc + (u.questionCount ?? u.lessons?.reduce((n, l) => n + (l.questions?.length ?? 0), 0) ?? 0),
    0,
  )

  const launchSession = useCallback((candidatePool) => {
    if (!candidatePool || candidatePool.length === 0) {
      alert('No questions available to start the drill.')
      return
    }
    const countToTake = Math.min(candidatePool.length, questionCount)
    const shuffled = shuffle(candidatePool).slice(0, countToTake)
    setActiveQuestions(shuffled)
    setCurrentIndex(0)
    setSelectedChoice(null)
    setEliminatedChoices({})
    setIsChecked(false)
    setAnswers([])
    setQuizState('active')

    if (isTimed) {
      setRemainingSeconds(shuffled.length * 60) // 1 minute per question
    }
  }, [isTimed, questionCount])

  const startQuiz = useCallback((overrideUnits = null) => {
    const isOverrideValid = Array.isArray(overrideUnits) && overrideUnits.length > 0
    const unitsToUse = isOverrideValid ? overrideUnits : enabledUnits

    if (poolType === 'mistakes') {
      mistakesStore.getAll().then((allMistakes) => {
        const pool = allMistakes
          .map((m) => m.question)
          .filter((q) => q && Array.isArray(q.choices) && q.choices.length > 0)
        if (pool.length === 0) {
          alert('No missed questions in your bank yet. Complete regular lessons first to review mistakes here!')
          return
        }
        launchSession(pool)
      })
      return
    }

    if (poolType === 'starred') {
      bookmarksStore.getAll().then((allBookmarks) => {
        const pool = allBookmarks
          .map((b) => b.question)
          .filter((q) => q && Array.isArray(q.choices) && q.choices.length > 0)
        if (pool.length === 0) {
          alert('No starred questions yet. Star questions during lessons or exams to practice them here!')
          return
        }
        launchSession(pool)
      })
      return
    }

    if (!unitsToUse || unitsToUse.length === 0) {
      alert('No subjects selected. Please check at least one subject to begin.')
      return
    }

    const candidatePool = unitsToUse.flatMap((u) =>
      (u.lessons ?? []).flatMap((l) =>
        (l.questions ?? []).map((q) => ({
          ...q,
          unitId: u.id,
          unitTitle: u.title,
          rtl: u.rtl ?? q.rtl,
        })),
      ),
    )

    if (candidatePool.length === 0) {
      alert('No questions available in the selected subjects.')
      return
    }

    launchSession(candidatePool)
  }, [enabledUnits, launchSession, poolType])

  // Automatic drill launch when navigating from 1-Click Weak-Area button or deep-link
  useEffect(() => {
    if (paramAutoStart && ready && activeTrack && !autoStartedRef.current && quizState === 'config') {
      const targetUnits = paramUnitId
        ? activeTrack.units?.filter((u) => u.id === paramUnitId) ?? []
        : enabledUnits

      if (targetUnits.length > 0) {
        autoStartedRef.current = true
        const timer = setTimeout(() => {
          startQuiz(targetUnits)
        }, 0)
        return () => clearTimeout(timer)
      }
    }
  }, [paramAutoStart, ready, activeTrack, paramUnitId, quizState, enabledUnits, startQuiz])

  const restartDrill = () => {
    if (!activeQuestions || activeQuestions.length === 0) {
      setQuizState('config')
      return
    }
    const reshuffled = shuffle(activeQuestions)
    setActiveQuestions(reshuffled)
    setCurrentIndex(0)
    setSelectedChoice(null)
    setEliminatedChoices({})
    setIsChecked(false)
    setAnswers([])
    setQuizState('active')
    if (isTimed) {
      setRemainingSeconds(reshuffled.length * 60)
    }
  }

  // Timer countdown
  useEffect(() => {
    if (quizState !== 'active' || !isTimed) return
    const interval = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval)
          setQuizState('finished')
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [quizState, isTimed])

  // Bookmark status sync
  useEffect(() => {
    if (!currentQ) return
    let active = true
    bookmarksStore.isBookmarked(currentQ.id).then((is) => {
      if (active) setBookmarked(is)
    })
    return () => {
      active = false
    }
  }, [currentQ])

  const toggleBookmark = async () => {
    if (!currentQ) return
    const newState = await bookmarksStore.toggleBookmark(currentQ, {
      trackId: activeTrack?.id,
      unitId: currentQ.unitId,
    })
    setBookmarked(newState)
  }

  const toggleEliminate = (choiceIndex) => {
    setEliminatedChoices((prev) => ({
      ...prev,
      [choiceIndex]: !prev[choiceIndex],
    }))
  }

  const checkAnswer = () => {
    if (selectedChoice === null || isChecked || !currentQ) return
    const isCorrect = selectedChoice === currentQ.answer
    setIsChecked(true)
    setAnswers((prev) => [...prev, { question: currentQ, choice: selectedChoice, correct: isCorrect }])

    if (isCorrect) {
      feedbackService.onCorrect()
      mistakesStore.recordReviewResult(currentQ.id, true)
    } else {
      feedbackService.onWrong()
      mistakesStore.recordMistake(currentQ, {
        trackId: activeTrack?.id,
        unitId: currentQ.unitId,
      })
    }
  }

  const advanceQuestion = () => {
    if (currentIndex >= activeQuestions.length - 1) {
      streakStore.recordAnswers(activeQuestions.length)
      setQuizState('finished')
      const totalCorrect = answers.filter((a) => a.correct).length
      if (totalCorrect / activeQuestions.length >= 0.8) {
        feedbackService.celebrate()
      }
    } else {
      setCurrentIndex((i) => i + 1)
      setSelectedChoice(null)
      setEliminatedChoices({})
      setIsChecked(false)
    }
  }

  const handlersRef = useRef({ checkAnswer, advanceQuestion, isChecked, currentQ, eliminatedChoices })
  useEffect(() => {
    handlersRef.current = { checkAnswer, advanceQuestion, isChecked, currentQ, eliminatedChoices }
  })

  // Keyboard navigation support
  useEffect(() => {
    if (quizState !== 'active') return undefined
    const onKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return
      const {
        checkAnswer: doCheck,
        advanceQuestion: doAdvance,
        isChecked: checked,
        currentQ: q,
        eliminatedChoices: elim,
      } = handlersRef.current

      if (CHOICE_KEYS.includes(event.key) && !checked) {
        let i = -1
        if (['1', '2', '3', '4'].includes(event.key)) {
          i = Number(event.key) - 1
        } else {
          i = ['a', 'b', 'c', 'd'].indexOf(event.key.toLowerCase())
        }
        if (i >= 0 && i < (q?.choices?.length ?? 0) && !elim[i]) {
          setSelectedChoice(i)
        }
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (checked) doAdvance()
        else doCheck()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [quizState])

  // Finished Mode
  if (quizState === 'finished') {
    const finalScore = calculateScore(answers, 0)
    const missed = answers.filter((a) => !a.correct)
    const pct = Math.round((finalScore.correct / Math.max(1, activeQuestions.length)) * 100)

    return (
      <div className="custom-drill custom-drill--finished">
        <header className="custom-drill__header">
          <Link className="path-back-btn" to="/">
            ← Home Desk
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Custom Drill Complete</h1>
        </header>

        <main className="custom-drill__results">
          <div className="drill-score-card">
            <span className="font-mono text-2xl font-extrabold text-[var(--text)]">
              {finalScore.correct} / {activeQuestions.length} Correct
            </span>
            <p className="font-mono text-sm text-[var(--muted)]">Accuracy: {pct}%</p>
          </div>

          {missed.length > 0 && (
            <section className="drill-review-section">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
                Review Missed Questions ({missed.length})
              </h3>
              <ul className="drill-review-list flex flex-col gap-3">
                {missed.map(({ question: q, choice }) => (
                  <li key={q.id} className="drill-review-item p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left">
                    <p className={`font-semibold text-base text-[var(--text)] mb-2 ${q.rtl ? 'urdu' : ''}`} dir={q.rtl ? 'rtl' : 'ltr'}>
                      {q.prompt}
                    </p>
                    <p className="text-xs font-mono text-[var(--red-text)]">
                      Your answer: {choice !== null && choice !== undefined ? q.choices[choice] : 'None'}
                    </p>
                    <p className="text-xs font-mono text-[var(--green-text)] font-bold">
                      Correct answer: {q.choices[q.answer]}
                    </p>
                    {explainQuestion(q) && (
                      <p className={`text-xs text-[var(--muted)] mt-2 pt-2 border-t border-[var(--border)] ${q.rtl ? 'urdu' : ''}`}>
                        {explainQuestion(q)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="drill-actions flex flex-wrap gap-3 justify-center mt-6">
            <button className="btn btn--primary" type="button" onClick={restartDrill}>
              <RotateCcwIcon width="16" height="16" />
              <span>Retake Drill</span>
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setQuizState('config')}>
              Configure New Drill
            </button>
            <Link className="btn btn--ghost" to="/">
              Back to Curriculum
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Active Drill Mode
  if (quizState === 'active') {
    if (!currentQ) {
      return (
        <div className="custom-drill p-8 text-center">
          <p className="text-sm text-[var(--muted)] mb-4">No questions available for this drill session.</p>
          <button type="button" className="btn btn--ghost" onClick={() => setQuizState('config')}>
            Back to Drill Setup
          </button>
        </div>
      )
    }

    const isAnswerCorrect = isChecked && selectedChoice === currentQ.answer
    const isCSS = activeTrack?.exam?.includes('CSS') ?? true
    const penalty = isCSS ? 0 : 0.25

    return (
      <div className="custom-drill custom-drill--active">
        <header className="drill-topbar">
          <button
            type="button"
            className="icon-btn"
            aria-label="Exit drill"
            onClick={() => setQuizState('config')}
          >
            <CloseIcon width="20" height="20" />
          </button>

          <div className="drill-topbar__center">
            <span className="badge font-mono">
              Q{currentIndex + 1} of {activeQuestions.length}
            </span>
            {isTimed && (
              <span className="drill-timer font-mono">
                <TimerIcon width="14" height="14" />
                {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
              </span>
            )}
          </div>

          <button
            type="button"
            className={`icon-btn bookmark-btn ${bookmarked ? 'is-bookmarked' : ''}`}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark question'}
            onClick={toggleBookmark}
          >
            <BookmarkStarIcon width="18" height="18" />
          </button>
        </header>

        <main className="drill-body">
          <MCQCard
            question={currentQ}
            selectedChoice={selectedChoice}
            eliminatedChoices={eliminatedChoices}
            checked={isChecked}
            bookmarked={bookmarked}
            hasNote={hasNote}
            penalty={penalty}
            onSelectChoice={(idx) => !isChecked && setSelectedChoice(idx)}
            onToggleEliminate={toggleEliminate}
            onToggleBookmark={toggleBookmark}
            onOpenNotes={() => setShowNoteModal(true)}
            explanation={explainQuestion(currentQ)}
            unitLabel={currentQ.unitTitle || activeTrack?.title}
          />
        </main>

        <footer className="drill-footer">
          <button
            className={`btn btn--wide ${isChecked && !isAnswerCorrect ? 'btn--continue-wrong' : 'btn--primary'}`}
            type="button"
            onClick={isChecked ? advanceQuestion : checkAnswer}
            disabled={selectedChoice === null}
          >
            {isChecked ? (currentIndex === activeQuestions.length - 1 ? 'Finish Drill' : 'Continue (Enter)') : 'Check Answer (Enter)'}
          </button>
        </footer>

        {/* Floating OMR Response Matrix */}
        <OMRSheet
          totalQuestions={activeQuestions.length}
          currentIndex={currentIndex}
          selectedAnswers={{ [currentIndex]: selectedChoice }}
          onSelectAnswer={(_, optIdx) => {
            if (!isChecked) setSelectedChoice(optIdx)
          }}
        />

        {showNoteModal && (
          <NoteModal
            isOpen={showNoteModal}
            onClose={() => {
              setShowNoteModal(false)
              if (currentQ) {
                notesStore.getNote(currentQ.id).then((text) => setHasNote(Boolean(text)))
              }
            }}
            question={currentQ}
          />
        )}
      </div>
    )
  }

  // Config Mode
  return (
    <div className="custom-drill custom-drill--config">
      <header className="custom-drill__header">
        <div className="custom-drill__top">
          <Link className="path-back-btn" to="/">
            ← Home Desk
          </Link>
        </div>
        <div className="custom-drill__title">
          <TargetIcon width="28" height="28" style={{ color: 'var(--primary)' }} />
          <h1>Custom Practice Drill</h1>
        </div>
        <p className="custom-drill__blurb">
          Design your targeted practice session by combining specific subjects, past papers, or missed questions.
        </p>
      </header>

      <main className="custom-drill__form">
        {/* 1. Question Pool Source */}
        <section className="drill-section">
          <label className="drill-label">1. Question Pool Source</label>
          <div className="pool-selector">
            <button
              type="button"
              className={`pill-btn ${poolType === 'all' ? 'is-selected' : ''}`}
              onClick={() => setPoolType('all')}
            >
              All Curriculum Questions
            </button>
            <button
              type="button"
              className={`pill-btn ${poolType === 'mistakes' ? 'is-selected' : ''}`}
              onClick={() => setPoolType('mistakes')}
            >
              Missed Questions ({mistakeCount})
            </button>
            <button
              type="button"
              className={`pill-btn ${poolType === 'starred' ? 'is-selected' : ''}`}
              onClick={() => setPoolType('starred')}
            >
              Starred Questions ({bookmarkCount})
            </button>
          </div>
        </section>

        {/* 2. Select Exam Track (Curriculum pool only) */}
        {poolType === 'all' && (
          <section className="drill-section">
            <label className="drill-label">2. Select Exam Track</label>
            <div className="track-pills">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`pill-btn ${activeTrackId === t.id ? 'is-selected' : ''}`}
                  onClick={() => handleTrackChange(t.id)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 3. Subjects Checklist (Curriculum pool only) */}
        {poolType === 'all' && activeTrack && (
          <section className="drill-section">
            <div className="section-head">
              <label className="drill-label">
                3. Select Subject Units ({enabledUnits.length} of {activeTrack.units?.length ?? 0} selected)
              </label>
              <div className="unit-bulk-actions">
                <button type="button" className="text-btn" onClick={selectAllUnits}>
                  Select All
                </button>
                ·
                <button type="button" className="text-btn" onClick={deselectAllUnits}>
                  Clear
                </button>
              </div>
            </div>

            <div className="units-checkbox-grid">
              {activeTrack.units?.map((u) => {
                const isUnitChecked = isUnitSelected(u.id)
                const qCount = u.questionCount ?? u.lessons?.reduce((n, l) => n + (l.questions?.length ?? 0), 0) ?? 0

                return (
                  <label key={u.id} className={`unit-checkbox-card ${isUnitChecked ? 'is-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isUnitChecked}
                      onChange={() => toggleUnit(u.id)}
                    />
                    <div className="unit-checkbox-meta">
                      <span className={`unit-name ${u.rtl ? 'urdu' : ''}`}>{u.title}</span>
                      <span className="unit-count font-mono">{qCount} MCQs</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </section>
        )}

        {/* 4. Question Count Chips */}
        <section className="drill-section">
          <label className="drill-label">
            {poolType === 'all' ? '4.' : '2.'} Number of Questions
          </label>
          <div className="count-chips-row">
            {[5, 10, 15, 20, 30, 50].map((num) => (
              <button
                key={num}
                type="button"
                className={`count-chip font-mono ${questionCount === num ? 'is-selected' : ''}`}
                onClick={() => setQuestionCount(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </section>

        {/* 5. Timed Mode Toggle */}
        <section className="drill-section">
          <label className="drill-label">
            {poolType === 'all' ? '5.' : '3.'} Mode Option
          </label>
          <label className="timed-toggle-label">
            <input
              type="checkbox"
              checked={isTimed}
              onChange={(e) => setIsTimed(e.target.checked)}
            />
            <div className="timed-toggle-text">
              <strong>Timed Practice Drill (1 min / question)</strong>
              <span>Enforces countdown timer pressure matching actual exam speed.</span>
            </div>
          </label>
        </section>

        {/* Launch Button */}
        <div className="drill-start-row">
          <button
            type="button"
            className="btn btn--primary btn--wide"
            onClick={() => startQuiz()}
          >
            Start Practice Drill ({questionCount} MCQs) →
          </button>
        </div>
      </main>
    </div>
  )
}
