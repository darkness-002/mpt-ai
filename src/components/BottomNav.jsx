import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChartIcon,
  BookIcon,
  CardsIcon,
  FlameIcon,
  StarIcon,
  TargetIcon,
  SparklesIcon,
  TrophyIcon,
  ZapIcon,
  CalendarIcon,
  PrinterIcon,
  CloseIcon,
} from './icons.jsx'
import { mistakesStore } from '../storage/mistakesStore.js'
import './BottomNav.css'

export default function BottomNav() {
  const location = useLocation()
  const [dueMistakesCount, setDueMistakesCount] = useState(0)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
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

  // Close more menu on route change
  useEffect(() => {
    setShowMoreMenu(false)
  }, [location.pathname])

  // Hide bottom nav completely during active lessons, mock exams, or speed runs
  const isImmersiveMode =
    location.pathname.startsWith('/lesson/') ||
    location.pathname.startsWith('/mock/') ||
    location.pathname === '/speed-run' ||
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
      <nav className="bottom-nav is-visible" aria-label="Main Navigation">
        <NavLink to="/" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`} end>
          <BookIcon width="20" height="20" />
          <span>Curriculum</span>
        </NavLink>

        <NavLink to="/drill" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <TargetIcon width="20" height="20" />
          <span>Drill</span>
        </NavLink>

        <NavLink to="/flashcards" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
          <CardsIcon width="20" height="20" />
          <span>Flashcards</span>
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

        {/* More Tools Menu Drawer Trigger */}
        <button
          type="button"
          className={`bottom-nav__item bottom-nav__btn ${showMoreMenu ? 'is-active' : ''}`}
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          aria-label="More study tools and features"
        >
          <SparklesIcon width="20" height="20" />
          <span>More</span>
        </button>
      </nav>

      {/* More Tools Sliding Sheet / Dialog */}
      {showMoreMenu && (
        <div className="more-menu-backdrop" onClick={() => setShowMoreMenu(false)}>
          <div className="more-menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="more-menu-header">
              <span className="more-menu-title">Exam Tools & Features</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowMoreMenu(false)}
                aria-label="Close menu"
              >
                <CloseIcon width="18" height="18" />
              </button>
            </div>

            <div className="more-menu-grid">
              <NavLink to="/daily" className="more-menu-tile" onClick={() => setShowMoreMenu(false)}>
                <div className="tile-icon-wrap is-gold">
                  <SparklesIcon width="20" height="20" />
                </div>
                <div className="tile-text">
                  <strong>Daily Sprint</strong>
                  <span>10 MCQ challenge</span>
                </div>
              </NavLink>

              <NavLink to="/readiness" className="more-menu-tile" onClick={() => setShowMoreMenu(false)}>
                <div className="tile-icon-wrap is-green">
                  <TrophyIcon width="20" height="20" />
                </div>
                <div className="tile-text">
                  <strong>Readiness Score</strong>
                  <span>Qualifying diagnosis</span>
                </div>
              </NavLink>

              <NavLink to="/speed-run" className="more-menu-tile" onClick={() => setShowMoreMenu(false)}>
                <div className="tile-icon-wrap is-purple">
                  <ZapIcon width="20" height="20" />
                </div>
                <div className="tile-text">
                  <strong>60s Speed Run</strong>
                  <span>Rapid fire test</span>
                </div>
              </NavLink>

              <NavLink to="/papers" className="more-menu-tile" onClick={() => setShowMoreMenu(false)}>
                <div className="tile-icon-wrap is-blue">
                  <BookIcon width="20" height="20" />
                </div>
                <div className="tile-text">
                  <strong>Past Papers Vault</strong>
                  <span>2013–2026 exams</span>
                </div>
              </NavLink>

              <NavLink to="/worksheet" className="more-menu-tile" onClick={() => setShowMoreMenu(false)}>
                <div className="tile-icon-wrap is-blue">
                  <PrinterIcon width="20" height="20" />
                </div>
                <div className="tile-text">
                  <strong>Print Worksheets</strong>
                  <span>OMR & exam print</span>
                </div>
              </NavLink>

              <NavLink to="/planner" className="more-menu-tile" onClick={() => setShowMoreMenu(false)}>
                <div className="tile-icon-wrap is-green">
                  <CalendarIcon width="20" height="20" />
                </div>
                <div className="tile-text">
                  <strong>Study Planner</strong>
                  <span>Target countdown</span>
                </div>
              </NavLink>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
