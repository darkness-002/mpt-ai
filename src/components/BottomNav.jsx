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
  const [isVisible, setIsVisible] = useState(false)
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

  // Scroll listener: reveal bottom nav when user scrolls down past the top header
  useEffect(() => {
    const updateVisibility = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop
      const isScrollable = document.documentElement.scrollHeight > window.innerHeight + 80
      
      // On scrollable pages, show bottom nav once scrolled past top header (> 70px).
      // On short non-scrollable pages, keep it visible for easy navigation.
      if (!isScrollable || scrollY > 70) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    window.addEventListener('resize', updateVisibility, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [location.pathname])

  // Hide bottom nav completely during active lessons or mock exams
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
      <nav className={`bottom-nav ${isVisible ? 'is-visible' : ''}`} aria-label="Main Navigation">
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

