import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookIcon, CheckIcon } from '../components/icons.jsx'
import { mistakesStore } from '../storage/mistakesStore.js'
import './MistakesScreen.css'

export default function MistakesScreen() {
  const [mistakes, setMistakes] = useState([])
  const [dueList, setDueList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState(null)
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

  const check = () => {
    if (selected === null || checked || !currentItem) return
    const isCorrect = selected === question.answer
    setChecked(true)
    mistakesStore.recordReviewResult(currentItem.id, isCorrect)
    setReviewedCount((c) => c + 1)
  }

  const advance = () => {
    if (currentIndex >= dueList.length - 1) {
      setSessionFinished(true)
    } else {
      setCurrentIndex((i) => i + 1)
      setSelected(null)
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
                let tone = ''
                if (checked && isAnswer) tone = ' choice--correct'
                else if (checked && isSelected) tone = ' choice--wrong'
                else if (isSelected) tone = ' choice--selected'

                return (
                  <li key={i}>
                    <button
                      type="button"
                      className={`choice${tone}${question.rtl ? ' urdu' : ''}`}
                      dir={question.rtl ? 'rtl' : 'ltr'}
                      onClick={() => !checked && setSelected(i)}
                      disabled={checked}
                    >
                      <span className="choice__key">{i + 1}</span>
                      <span className="choice__text">{choice}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mistakes-practice__footer">
              {checked && (
                <div className="feedback">
                  <p className="feedback__title">
                    {selected === question.answer ? (
                      <span style={{ color: 'var(--green-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckIcon width="20" height="20" /> Correct! Next review interval increased.
                      </span>
                    ) : (
                      <span style={{ color: 'var(--red-dark)' }}>
                        Incorrect. Correct answer: {question.choices[question.answer]}
                      </span>
                    )}
                  </p>
                  {question.explanation && <p className="feedback__why">{question.explanation}</p>}
                </div>
              )}

              <button
                className="btn btn--wide"
                type="button"
                onClick={checked ? advance : check}
                disabled={selected === null}
              >
                {checked ? (currentIndex === dueList.length - 1 ? 'Finish Session' : 'Next Question') : 'Check'}
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
