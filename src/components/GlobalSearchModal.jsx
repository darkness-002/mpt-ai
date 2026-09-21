import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookIcon,
  CardsIcon,
  CloseIcon,
  FlameIcon,
  SearchIcon,
  SparklesIcon,
  StarIcon,
  TargetIcon,
  TimerIcon,
  TrophyIcon,
  ZapIcon,
} from './icons.jsx'
import { useContent } from '../content/contentContext.js'
import './GlobalSearchModal.css'

export default function GlobalSearchModal({ isOpen, onClose, onOpenFocus }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { tracks } = useContent()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // System navigation shortcuts
  const systemActions = useMemo(
    () => [
      {
        id: 'action-drill',
        title: 'Start Custom Drill',
        subtitle: 'Build a practice drill by subject, year, or question count',
        type: 'action',
        icon: TargetIcon,
        path: '/drill',
      },
      {
        id: 'action-flashcards',
        title: 'Flashcards Active Recall',
        subtitle: 'Rapid flip-card study mode for high-yield memory',
        type: 'action',
        icon: CardsIcon,
        path: '/flashcards',
      },
      {
        id: 'action-daily',
        title: 'Daily 10-MCQ Sprint',
        subtitle: "Today's curated 10-question challenge",
        type: 'action',
        icon: SparklesIcon,
        path: '/daily',
      },
      {
        id: 'action-readiness',
        title: 'Exam Readiness Diagnostic',
        subtitle: 'Check your syllabus coverage and qualifying odds',
        type: 'action',
        icon: TrophyIcon,
        path: '/readiness',
      },
      {
        id: 'action-speedrun',
        title: '60-Second Speed Run',
        subtitle: 'High-speed rapid-fire question challenge',
        type: 'action',
        icon: ZapIcon,
        path: '/speed-run',
      },
      {
        id: 'action-papers',
        title: 'Past Papers Vault',
        subtitle: 'Explore real official exam papers from 2013-2026',
        type: 'action',
        icon: BookIcon,
        path: '/papers',
      },
      {
        id: 'action-worksheet',
        title: 'Printable Worksheets & OMR Sheet',
        subtitle: 'Generate printable mock papers and blank OMR bubble sheets',
        type: 'action',
        icon: BookIcon,
        path: '/worksheet',
      },
      {
        id: 'action-planner',
        title: 'Exam Study Pacing Planner',
        subtitle: 'Target exam countdown and daily quota planner',
        type: 'action',
        icon: TimerIcon,
        path: '/planner',
      },
      {
        id: 'action-mistakes',
        title: 'Review SRS Mistakes',
        subtitle: 'Leitner spaced repetition queue for missed questions',
        type: 'action',
        icon: FlameIcon,
        path: '/mistakes',
      },
      {
        id: 'action-starred',
        title: 'Starred Questions Deck',
        subtitle: 'Review all bookmarked questions',
        type: 'action',
        icon: StarIcon,
        path: '/bookmarks',
      },
      {
        id: 'action-focus',
        title: 'Pomodoro Study Focus Timer',
        subtitle: 'Start a 25-minute study session with ambient noise',
        type: 'modal',
        icon: TimerIcon,
        action: () => {
          onClose()
          if (onOpenFocus) onOpenFocus()
        },
      },
    ],
    [onClose, onOpenFocus],
  )

  // Search across tracks and syllabus units
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return systemActions.slice(0, 6)
    }

    const matchedActions = systemActions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q),
    )

    const matchedUnits = []
    for (const track of tracks) {
      if (track.title.toLowerCase().includes(q)) {
        matchedUnits.push({
          id: `track-${track.id}`,
          title: track.title,
          subtitle: `Exam Track • ${track.units.length} Units`,
          type: 'track',
          icon: BookIcon,
          path: `/track/${track.id}`,
        })
      }
      for (const unit of track.units) {
        if (unit.title.toLowerCase().includes(q) || track.title.toLowerCase().includes(q)) {
          matchedUnits.push({
            id: `unit-${unit.id}`,
            title: unit.title,
            subtitle: `${track.title} • ${unit.lessons.length} Lessons`,
            type: 'unit',
            icon: TargetIcon,
            path: `/drill?trackId=${track.id}&unitId=${unit.id}&autoStart=true`,
          })
        }
      }
    }

    return [...matchedActions, ...matchedUnits].slice(0, 8)
  }, [query, systemActions, tracks])

  const handleSelect = (item) => {
    if (!item) return
    onClose()
    if (item.action) {
      item.action()
    } else if (item.path) {
      navigate(item.path)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, searchResults.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (searchResults[selectedIndex]) {
        handleSelect(searchResults[selectedIndex])
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop search-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal search-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Global Search and Commands"
      >
        <div className="search-input-wrap">
          <SearchIcon width="18" height="18" className="search-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search subjects, past papers, drills, flashcards... (or type a topic)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
          />
          <button type="button" className="icon-btn search-close-btn" onClick={onClose}>
            <CloseIcon width="16" height="16" />
          </button>
        </div>

        <div className="search-results-list">
          {searchResults.length === 0 ? (
            <div className="search-empty">
              No matching subjects or tools found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const Icon = item.icon
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  className={`search-result-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="search-result-icon">
                    <Icon width="16" height="16" />
                  </div>
                  <div className="search-result-body">
                    <div className="search-result-title">{item.title}</div>
                    <div className="search-result-sub">{item.subtitle}</div>
                  </div>
                  <span className="search-result-arrow">↵</span>
                </div>
              )
            })
          )}
        </div>

        <div className="search-footer-hints">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> Navigate
          </span>
          <span>
            <kbd>Enter</kbd> Select
          </span>
          <span>
            <kbd>ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>
  )
}
