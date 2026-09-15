import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookIcon, CloseIcon, StarIcon } from '../components/icons.jsx'
import { bookmarksStore } from '../storage/bookmarksStore.js'
import './BookmarksScreen.css'

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const list = await bookmarksStore.getAll()
    setBookmarks(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    bookmarksStore.getAll().then((list) => {
      if (active) {
        setBookmarks(list)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const handleRemove = async (questionId) => {
    await bookmarksStore.toggleBookmark({ id: questionId })
    await reload()
  }

  if (loading) {
    return <div className="lesson lesson--loading">Loading bookmarked questions…</div>
  }

  return (
    <div className="bookmarks-screen">
      <header className="bookmarks-screen__header">
        <div className="bookmarks-screen__top">
          <Link className="brand" to="/">
            <BookIcon width="22" height="22" />
            <span>MPT·AI</span>
          </Link>
          <Link className="path-header__back" to="/">
            ← Back to Home
          </Link>
        </div>
        <h1>Starred Questions</h1>
        <p className="bookmarks-screen__blurb">
          Questions you bookmarked during practice sessions for quick reference and revision.
        </p>
      </header>

      <main className="bookmarks-screen__body">
        {bookmarks.length === 0 ? (
          <div className="bookmarks-empty">
            <StarIcon width="48" height="48" style={{ color: 'var(--muted)', opacity: 0.5, marginBottom: '1rem' }} />
            <h2>No saved questions yet</h2>
            <p>
              When practicing lessons, tap the star icon on any tricky question to save it here for revision.
            </p>
            <Link className="btn" to="/">
              Go to Curriculum
            </Link>
          </div>
        ) : (
          <ul className="bookmarks-list">
            {bookmarks.map(({ id, question, savedAt }) => (
              <li key={id} className="bookmark-card">
                <div className="bookmark-card__top">
                  <span className="badge">Saved {new Date(savedAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Remove bookmark"
                    onClick={() => handleRemove(id)}
                  >
                    <CloseIcon width="16" height="16" />
                  </button>
                </div>

                <h3 className={`bookmark-card__prompt${question.rtl ? ' urdu' : ''}`} dir={question.rtl ? 'rtl' : 'ltr'}>
                  {question.prompt}
                </h3>

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

                <ul className="bookmark-choices">
                  {question.choices.map((c, i) => (
                    <li key={i} className={`bookmark-choice ${i === question.answer ? 'is-correct' : ''}`}>
                      <span className="choice-marker">{i + 1}</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>

                {question.explanation && (
                  <p className="bookmark-card__why">
                    <strong>Explanation:</strong> {question.explanation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
