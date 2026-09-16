import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChartIcon,
  BookIcon,
  SettingsIcon,
  StarIcon,
  TargetIcon,
  FlameIcon,
} from './icons.jsx'
import SettingsModal from './SettingsModal.jsx'
import { mistakesStore } from '../storage/mistakesStore.js'
import './BottomNav.css'

export default function BottomNav() {
  const location = useLocation()
  const [showSettings, setShowSettings] = useState(false)
  const [dueMistakesCount, setDueMistakesCount] = useState(0)
  const [isDrillImmersive, setIsDrillImmersive] = useState(
    () => typeof document !== 'undefined' && document.body.dataset.immersive === 'true',
  )

  // Listen for changes to document.body.dataset.immersive
  useEffect(() => {
    const check = () => {
      setIsDrillImmersive(document.body.dataset.immersive === 'true')
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-immersive'] })
    return () => observer.disconnect()
  }, [])

  // Hide bottom nav during active lessons, mock exams, or custom drill practice to maximize screen focus
  const isImmersiveMode =
    location.pathname.startsWith('/lesson/') ||
    location.pathname.startsWith('/mock/') ||
    isDrillImmersive

  useEffect(() => {
    let active = true
    const checkMistakes = () => {
      mistakesStore.getDue().then((due) => {
        if (active) setDueMistakesCount(due.length)
      })
    }
    checkMistakes()
    const interval = setInterval(checkMistakes, 15000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [location.pathname])

  if (isImmersiveMode) return null

  return (
    <>
      <nav className="bottom-nav" aria-label="Main Navigation">
        <NavLink to="/" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`} end>
          <BookIcon width="20" height="20" />
          <span>Curriculum</span>
        </NavLink>

        <NavLink to="/drill" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <TargetIcon width="20" height="20" />
          <span>Custom Drill</span>
        </NavLink>

        <NavLink to="/mistakes" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <div className="bottom-nav__icon-wrap">
            <FlameIcon width="20" height="20" />
            {dueMistakesCount > 0 && <span className="bottom-nav__badge">{dueMistakesCount}</span>}
          </div>
          <span>Mistakes</span>
        </NavLink>

        <NavLink to="/bookmarks" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <StarIcon width="20" height="20" />
          <span>Starred</span>
        </NavLink>

        <NavLink to="/analytics" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <BarChartIcon width="20" height="20" />
          <span>Analytics</span>
        </NavLink>

        <button
          type="button"
          className="bottom-nav__item bottom-nav__btn"
          onClick={() => setShowSettings(true)}
          aria-label="Open Settings"
        >
          <SettingsIcon width="20" height="20" />
          <span>Settings</span>
        </button>
      </nav>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  )
}
