import React from 'react'
import { Link } from 'react-router-dom'
import { CheckIcon, LockIcon, BookmarkStarIcon, OMRBubbleIcon } from './icons.jsx'
import './LessonNode.css'

/**
 * LessonNode - "The Reading Lamp" Syllabus Path Node
 * Signature OMR motif with 4 distinct states:
 * 1. locked: muted, disabled, lock icon
 * 2. current: illuminated active desk lamp pulse, OMR index
 * 3. done: filled checkmark completion
 * 4. mastered: double brass-gold ring + gold star badge
 */
export default function LessonNode({ lesson, position, state, record }) {
  const isLocked = state === 'locked'
  const isMastered = state === 'mastered'
  const isDone = state === 'done'
  const isCurrent = state === 'current'

  const stateAriaLabels = {
    locked: 'Locked lesson',
    current: 'Current lesson - start now',
    done: 'Completed lesson',
    mastered: 'Mastered lesson - 100% correct',
  }

  const label = `${lesson.title} — ${stateAriaLabels[state] || state}`

  const nodeContent = (
    <div className="node-omr-wrapper">
      {/* Outer OMR Bubble Motif Ring */}
      <div className={`node-omr-ring ${isCurrent ? 'is-active-glow' : ''}`}>
        {isLocked && <LockIcon width="20" height="20" className="node-icon-locked" />}
        {isCurrent && <span className="node-index-number">{position}</span>}
        {isDone && <CheckIcon width="22" height="22" className="node-icon-done" />}
        {isMastered && <BookmarkStarIcon width="22" height="22" className="node-icon-mastered" />}
      </div>

      {/* Meta Label */}
      <div className="node-label-meta" dir={lesson.rtl ? 'rtl' : 'ltr'}>
        <span className={`node-title ${lesson.rtl ? 'urdu' : ''}`}>
          {lesson.title}
        </span>
        <span className="node-subtitle" dir="ltr">
          {record
            ? `Best ${record.bestScore}/${record.total}`
            : `${lesson.questions?.length ?? 0} MCQs`}
        </span>
      </div>
    </div>
  )

  if (isLocked) {
    return (
      <li className="reading-lesson-node is-locked" data-side={position % 2 ? 'left' : 'right'}>
        <div className="node-container is-disabled" aria-label={label} aria-disabled="true">
          {nodeContent}
        </div>
      </li>
    )
  }

  return (
    <li
      className={`reading-lesson-node is-${state}`}
      data-side={position % 2 ? 'left' : 'right'}
    >
      <Link
        to={`/lesson/${lesson.id}`}
        className="node-container"
        aria-label={label}
      >
        {nodeContent}
      </Link>
    </li>
  )
}
