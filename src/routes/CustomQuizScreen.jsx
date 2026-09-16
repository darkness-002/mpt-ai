import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BookIcon,
  CheckCircleIcon,
  CloseIcon,
  LightbulbIcon,
  SlashIcon,
  StarIcon,
  TargetIcon,
  TimerIcon,
  XCircleIcon,
} from '../components/icons.jsx'
import { useContent } from '../content/contentContext.js'
import { calculateScore, explainQuestion } from '../data/curriculum.js'
import { feedbackService } from '../lib/feedback.js'
import { shuffle } from '../lib/shuffle.js'
import { bookmarksStore } from '../storage/bookmarksStore.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { streakStore } from '../storage/streakStore.js'
import './CustomQuizScreen.css'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
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

  // Timer state for timed drill
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const headingRef = useRef(null)

  // Hide bottom navigation during active and finished drill states to ensure footer is never blocked
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

  const currentPoolSize =
    poolType === 'mistakes'
      ? mistakeCount
      : poolType === 'starred'
        ? bookmarkCount
        : availableTrackQuestionsCount

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

  const currentQ = activeQuestions[currentIndex]

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

  if (quizState === 'finished') {
    const finalScore = calculateScore(answers, 0)
    const missed = answers.filter((a) => !a.correct)

    return (
      <div className="custom-drill">
        <header className="custom-drill__header">
          <Link className="brand" to="/">
            <BookIcon width="22" height="22" />
            <span>MPT·AI</span>
          </Link>
          <h1>Custom Drill Complete!</h1>
        </header>

        <main className="custom-drill__results">
          <div className="drill-score-card">
            <h2>
              {finalScore.correct} / {activeQuestions.length} Correct
            </h2>
            <p>Accuracy: {Math.round((finalScore.correct / Math.max(1, activeQuestions.length)) * 100)}%</p>
          </div>

          {missed.length > 0 && (
            <section className="drill-review-section">
              <h3>Questions to Review ({missed.length})</h3>
              <ul className="drill-review-list">
                {missed.map(({ question: q, choice }) => (
                  <li key={q.id} className="drill-review-item">
                    {q.directive && <p className="drill-review-directive">{q.directive}</p>}
                    <p className={`drill-review-prompt${q.rtl ? ' urdu' : ''}`} dir={q.rtl ? 'rtl' : 'ltr'}>
                      {q.prompt}
                    </p>
                    {q.statements && (
                      <ol className="drill-statements drill-statements--review">
                        {q.statements.map((statement, i) => (
                          <li key={i}>
                            <span className="drill-statements__mark">{ROMAN[i] ?? i + 1}</span>
                            <span>{statement}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {q.closing && <p className="drill-review-closing">{q.closing}</p>}
                    <p className="drill-review-wrong">Your answer: {choice !== null && choice !== undefined ? q.choices[choice] : 'None'}</p>
                    <p className="drill-review-right">Correct answer: {q.choices[q.answer]}</p>
                    {explainQuestion(q) && <p className="drill-review-why">{explainQuestion(q)}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="drill-actions">
            <button className="btn" type="button" onClick={restartDrill}>
              Retake Same Drill
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

  if (quizState === 'active') {
    if (!currentQ) {
      return (
        <div className="custom-drill">
          <div className="drill-empty-notice" style={{ margin: '3rem auto', maxWidth: 480, textAlign: 'center' }}>
            <p>No questions available for this drill session.</p>
            <button type="button" className="btn btn--ghost" onClick={() => setQuizState('config')}>
              Back to Drill Setup
            </button>
          </div>
        </div>
      )
    }

    const isAnswerCorrect = isChecked && selectedChoice === currentQ.answer
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
            <span className="badge">
              Question {currentIndex + 1} of {activeQuestions.length}
            </span>
            {isTimed && (
              <span className="drill-timer">
                <TimerIcon width="16" height="16" /> {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, '0')}
              </span>
            )}
          </div>

          <button
            type="button"
            className={`icon-btn${bookmarked ? ' is-bookmarked' : ''}`}
            aria-label="Star question"
            onClick={toggleBookmark}
          >
            <StarIcon width="20" height="20" />
          </button>
        </header>

        <main className="drill-body">
          <p className="drill-unit-title">{currentQ.unitTitle || activeTrack?.title}</p>
          {currentQ.directive && <p className="drill-directive">{currentQ.directive}</p>}
          <h2
            className={`drill-prompt${currentQ.rtl ? ' urdu' : ''}`}
            dir={currentQ.rtl ? 'rtl' : 'ltr'}
            ref={headingRef}
          >
            {currentQ.prompt}
          </h2>

          {currentQ.statements && (
            <ol className="drill-statements">
              {currentQ.statements.map((statement, i) => (
                <li key={i}>
                  <span className="drill-statements__mark">{ROMAN[i] ?? i + 1}</span>
                  <span className={currentQ.rtl ? 'urdu' : undefined}>{statement}</span>
                </li>
              ))}
            </ol>
          )}

          {currentQ.closing && (
            <p className={`drill-closing${currentQ.rtl ? ' urdu' : ''}`} dir={currentQ.rtl ? 'rtl' : 'ltr'}>
              {currentQ.closing}
            </p>
          )}

          <ul className="choices">
            {currentQ.choices.map((choice, i) => {
              const isSelected = selectedChoice === i
              const isStruck = Boolean(eliminatedChoices[i])
              const isCorrectAnswer = i === currentQ.answer
              let tone = ''
              if (isChecked && isCorrectAnswer) tone = ' choice--correct'
              else if (isChecked && isSelected && !isCorrectAnswer) tone = ' choice--wrong'
              else if (isSelected) tone = ' choice--selected'
              if (isStruck) tone += ' choice--eliminated'

              const letter = LETTERS[i] ?? `${i + 1}`

              return (
                <li key={i} className="choice-row">
                  <button
                    type="button"
                    className={`choice${tone}${currentQ.rtl ? ' urdu' : ''}`}
                    dir={currentQ.rtl ? 'rtl' : 'ltr'}
                    onClick={() => !isChecked && !isStruck && setSelectedChoice(i)}
                    disabled={isChecked || isStruck}
                  >
                    <span className="choice__key">{letter}</span>
                    <span className="choice__text">{choice}</span>
                    {isChecked && isCorrectAnswer && (
                      <span className="choice__status-icon choice__status-icon--correct">
                        <CheckCircleIcon width="20" height="20" />
                      </span>
                    )}
                    {isChecked && isSelected && !isCorrectAnswer && (
                      <span className="choice__status-icon choice__status-icon--wrong">
                        <XCircleIcon width="20" height="20" />
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`strike-toggle${isStruck ? ' is-struck' : ''}`}
                    aria-label={isStruck ? 'Restore option' : 'Eliminate option'}
                    title={isStruck ? 'Restore option' : 'Eliminate option'}
                    onClick={() => toggleEliminate(i)}
                    disabled={isChecked}
                  >
                    <SlashIcon width="16" height="16" />
                  </button>
                </li>
              )
            })}
          </ul>
        </main>

        <footer className={`drill-footer${isChecked ? (isAnswerCorrect ? ' is-correct' : ' is-wrong') : ''}`}>
          {isChecked && (
            <div className="feedback-drawer">
              <div className="feedback-drawer__status">
                {isAnswerCorrect ? (
                  <div className="status-badge status-badge--correct">
                    <CheckCircleIcon width="24" height="24" />
                    <span>Correct! Great job.</span>
                  </div>
                ) : (
                  <div className="status-badge status-badge--wrong">
                    <XCircleIcon width="24" height="24" />
                    <span>Incorrect Choice</span>
                  </div>
                )}
              </div>

              {!isAnswerCorrect && (
                <div className="answer-comparison">
                  <div className="comparison-box comparison-box--wrong">
                    <span className="comparison-label">You Picked</span>
                    <span className={`comparison-text${currentQ.rtl ? ' urdu' : ''}`} dir={currentQ.rtl ? 'rtl' : 'ltr'}>
                      {selectedChoice !== null ? currentQ.choices[selectedChoice] : 'None'}
                    </span>
                  </div>
                  <div className="comparison-box comparison-box--correct">
                    <span className="comparison-label">Correct Answer</span>
                    <span className={`comparison-text${currentQ.rtl ? ' urdu' : ''}`} dir={currentQ.rtl ? 'rtl' : 'ltr'}>
                      {currentQ.choices[currentQ.answer]}
                    </span>
                  </div>
                </div>
              )}

              {explainQuestion(currentQ) && (
                <div className="explanation-card">
                  <div className="explanation-card__header">
                    <LightbulbIcon width="18" height="18" />
                    <span>Explanation & Context</span>
                  </div>
                  <p className={`explanation-card__text${currentQ.rtl ? ' urdu' : ''}`} dir={currentQ.rtl ? 'rtl' : 'ltr'}>
                    {explainQuestion(currentQ)}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            className={`btn btn--wide ${isChecked && !isAnswerCorrect ? 'btn--continue-wrong' : ''}`}
            type="button"
            onClick={isChecked ? advanceQuestion : checkAnswer}
            disabled={selectedChoice === null}
          >
            {isChecked ? (currentIndex === activeQuestions.length - 1 ? 'Finish Drill' : 'Continue (Enter)') : 'Check Answer (Enter)'}
          </button>
        </footer>
      </div>
    )
  }

  return (
    <div className="custom-drill">
      <header className="custom-drill__header">
        <div className="custom-drill__top">
          <Link className="brand" to="/">
            <BookIcon width="22" height="22" />
            <span>MPT·AI</span>
          </Link>
          <Link className="path-header__back" to="/">
            ← Back to Home
          </Link>
        </div>
        <div className="custom-drill__title">
          <TargetIcon width="28" height="28" style={{ color: 'var(--blue)' }} />
          <h1>Custom Practice Drill</h1>
        </div>
        <p className="custom-drill__blurb">
          Design your targeted practice session by combining specific subjects, past papers, or missed questions.
        </p>
      </header>

      <main className="custom-drill__form">
        {/* Question Source Pool */}
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

        {/* Track Selection - only if curriculum pool is selected */}
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

        {/* Units / Subjects Selection - only if curriculum pool is selected */}
        {poolType === 'all' && activeTrack && (
          <section className="drill-section">
            <div className="section-head">
              <label className="drill-label">
                3. Select Subjects / Units ({enabledUnits.length} of {activeTrack.units?.length ?? 0} selected)
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
                return (
                  <label key={u.id} className={`unit-checkbox-label ${isUnitChecked ? 'is-checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isUnitChecked}
                      onChange={() => toggleUnit(u.id)}
                    />
                    <span className={u.rtl ? 'urdu' : undefined}>{u.title}</span>
                  </label>
                )
              })}
            </div>
          </section>
        )}

        {/* Session Size & Timing */}
        <section className="drill-section">
          <label className="drill-label">
            {poolType === 'all' ? '4.' : '2.'} Session Size & Timing
          </label>
          <div className="size-selector">
            {[10, 15, 20, 30, 50].map((num) => (
              <button
                key={num}
                type="button"
                className={`scale-chip ${questionCount === num ? 'is-active' : ''}`}
                onClick={() => setQuestionCount(num)}
              >
                {num} MCQs
              </button>
            ))}
          </div>

          <div className="drill-toggle-row">
            <span>Timed Mode (1 min per question)</span>
            <input
              type="checkbox"
              checked={isTimed}
              onChange={(e) => setIsTimed(e.target.checked)}
            />
          </div>
        </section>

        {currentPoolSize === 0 && (
          <div className="drill-empty-notice">
            {poolType === 'mistakes' && 'You currently have no recorded mistakes. Complete lesson questions to build your mistake bank!'}
            {poolType === 'starred' && 'You haven’t starred any questions yet. Tap the star icon on any question to bookmark it.'}
            {poolType === 'all' && 'Please select at least one subject to generate questions.'}
          </div>
        )}

        <div className="drill-submit-wrap">
          <button
            className="btn btn--wide"
            type="button"
            onClick={() => startQuiz()}
            disabled={!ready || currentPoolSize === 0}
          >
            Start Custom Practice Drill ({Math.min(currentPoolSize, questionCount)} MCQs) →
          </button>
        </div>
      </main>
    </div>
  )
}
