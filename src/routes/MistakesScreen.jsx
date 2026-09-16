import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookIcon,
  CheckCircleIcon,
  LightbulbIcon,
  SlashIcon,
  XCircleIcon,
} from '../components/icons.jsx'
import { fireConfetti } from '../lib/confetti.js'
import { playCelebrationSound, playSuccessSound, playWrongSound, triggerHaptic } from '../lib/sound.js'
import { mistakesStore } from '../storage/mistakesStore.js'
import { settingsStore } from '../storage/settingsStore.js'
import './MistakesScreen.css'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function MistakesScreen() {
  const [mistakes, setMistakes] = useState([])
  const [dueList, setDueList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [eliminated, setEliminated] = useState({})
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)

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

    const settings = settingsStore.load()
    if (settings.soundEnabled) {
      if (isCorrect) playSuccessSound()
      else playWrongSound()
    }
    if (settings.hapticsEnabled) {
      triggerHaptic(isCorrect ? 40 : [40, 80, 40])
    }
  }

  const advance = () => {
    if (currentIndex >= dueList.length - 1) {
      setSessionFinished(true)
      fireConfetti()
      const settings = settingsStore.load()
      if (settings.soundEnabled) playCelebrationSound()
    } else {
      setCurrentIndex((i) => i + 1)
      setSelected(null)
      setEliminated({})
      setChecked(false)
    }
  }

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear your mistakes bank?')) {
      await mistakesStore.clear()
      await reload()
    }
  }

  const masteredCount = mistakes.filter((m) => m.mastered).length

  if (loading) {
    return <div className="lesson lesson--loading">Loading your mistakes bank…</div>
  }

  return (
    <div className="mistakes-screen">
      <header className="mistakes-screen__header">
        <div className="mistakes-screen__top">
          <Link className="brand" to="/">
            <BookIcon width="22" height="22" />
            <span>MPT·AI</span>
          </Link>
          <Link className="path-header__back" to="/">
            ← Back to Home
          </Link>
        </div>
        <h1>Mistakes Bank & SRS</h1>
        <p className="mistakes-screen__blurb">
          Spaced Repetition automatically schedules questions you missed until you master them.
        </p>

        <div className="mistakes-stats">
          <div className="mistakes-stat">
            <span className="mistakes-stat__val">{mistakes.length}</span>
            <span className="mistakes-stat__lbl">Total Recorded</span>
          </div>
          <div className="mistakes-stat">
            <span className="mistakes-stat__val mistakes-stat--warn">{dueList.length}</span>
            <span className="mistakes-stat__lbl">Due for Review</span>
          </div>
          <div className="mistakes-stat">
            <span className="mistakes-stat__val mistakes-stat--green">{masteredCount}</span>
            <span className="mistakes-stat__lbl">Mastered (Streak ≥ 2)</span>
          </div>
        </div>
      </header>

      <main className="mistakes-screen__body">
        {sessionFinished ? (
          <div className="mistakes-card mistakes-card--done">
            <h2>Session Complete!</h2>
            <p>You reviewed {reviewedCount} question{reviewedCount === 1 ? '' : 's'}.</p>
            <div className="mistakes-actions">
              <button className="btn" type="button" onClick={reload}>
                Refresh Due List
              </button>
              <Link className="btn btn--ghost" to="/">
                Return to Curriculum
              </Link>
            </div>
          </div>
        ) : dueList.length === 0 ? (
          <div className="mistakes-card">
            <h2>All caught up!</h2>
            <p>
              {mistakes.length === 0
                ? 'No mistakes recorded yet! As you complete lessons or mock exams, questions you miss will appear here automatically.'
                : 'No mistakes are currently due for review according to your Spaced Repetition schedule.'}
            </p>
            <div className="mistakes-actions">
              <Link className="btn" to="/">
                Explore Lessons
              </Link>
            </div>
          </div>
        ) : question ? (
          <div className="mistakes-practice">
            <div className="mistakes-practice__bar">
              <span className="badge">
                Reviewing {currentIndex + 1} of {dueList.length}
              </span>
              <span className="mistakes-practice__streak">
                Current SRS streak: <strong>{currentItem.streak ?? 0}</strong>
              </span>
            </div>

            <h2 className={`mistakes-practice__prompt${question.rtl ? ' urdu' : ''}`} dir={question.rtl ? 'rtl' : 'ltr'}>
              {question.prompt}
            </h2>

            {question.statements && (
              <ol className="statements">
                {question.statements.map((s, i) => (
                  <li key={i}>
                    <span className="statements__mark">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            )}

            <ul className="choices">
              {question.choices.map((choice, i) => {
                const isSelected = selected === i
                const isAnswer = i === question.answer
                const isStruck = Boolean(eliminated[i])
                let tone = ''
                if (checked && isAnswer) tone = ' choice--correct'
                else if (checked && isSelected && !isAnswer) tone = ' choice--wrong'
                else if (isSelected) tone = ' choice--selected'
                if (isStruck) tone += ' choice--eliminated'

                const letter = LETTERS[i] ?? `${i + 1}`

                return (
                  <li key={i} className="choice-row">
                    <button
                      type="button"
                      className={`choice${tone}${question.rtl ? ' urdu' : ''}`}
                      dir={question.rtl ? 'rtl' : 'ltr'}
                      onClick={() => !checked && !isStruck && setSelected(i)}
                      disabled={checked || isStruck}
                    >
                      <span className="choice__key">{letter}</span>
                      <span className="choice__text">{choice}</span>
                      {checked && isAnswer && (
                        <span className="choice__status-icon choice__status-icon--correct">
                          <CheckCircleIcon width="20" height="20" />
                        </span>
                      )}
                      {checked && isSelected && !isAnswer && (
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
                      disabled={checked}
                    >
                      <SlashIcon width="16" height="16" />
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className={`mistakes-practice__footer${checked ? (selected === question.answer ? ' is-correct' : ' is-wrong') : ''}`}>
              {checked && (
                <div className="feedback-drawer">
                  <div className="feedback-drawer__status">
                    {selected === question.answer ? (
                      <div className="status-badge status-badge--correct">
                        <CheckCircleIcon width="24" height="24" />
                        <span>Mastered item advanced! Next interval increased.</span>
                      </div>
                    ) : (
                      <div className="status-badge status-badge--wrong">
                        <XCircleIcon width="24" height="24" />
                        <span>Incorrect — Reset to Leitner Stage 1</span>
                      </div>
                    )}
                  </div>

                  {selected !== question.answer && (
                    <div className="answer-comparison">
                      <div className="comparison-box comparison-box--wrong">
                        <span className="comparison-label">You Picked</span>
                        <span className={`comparison-text${question.rtl ? ' urdu' : ''}`} dir={question.rtl ? 'rtl' : 'ltr'}>
                          {question.choices[selected]}
                        </span>
                      </div>
                      <div className="comparison-box comparison-box--correct">
                        <span className="comparison-label">Correct Answer</span>
                        <span className={`comparison-text${question.rtl ? ' urdu' : ''}`} dir={question.rtl ? 'rtl' : 'ltr'}>
                          {question.choices[question.answer]}
                        </span>
                      </div>
                    </div>
                  )}

                  {question.explanation && (
                    <div className="explanation-card">
                      <div className="explanation-card__header">
                        <LightbulbIcon width="18" height="18" />
                        <span>Explanation & Context</span>
                      </div>
                      <p className={`explanation-card__text${question.rtl ? ' urdu' : ''}`} dir={question.rtl ? 'rtl' : 'ltr'}>
                        {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                className={`btn btn--wide ${checked && selected !== question.answer ? 'btn--continue-wrong' : ''}`}
                type="button"
                onClick={checked ? advance : check}
                disabled={selected === null}
              >
                {checked ? (currentIndex === dueList.length - 1 ? 'Finish Session' : 'Continue') : 'Check Answer'}
              </button>
            </div>
          </div>
        ) : null}

        {mistakes.length > 0 && (
          <div className="mistakes-footer-action">
            <button className="btn btn--ghost btn--small" type="button" onClick={handleClearAll}>
              Clear All Mistakes
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
