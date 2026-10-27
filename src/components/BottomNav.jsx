import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BookIcon,
  FlameIcon,
  StarIcon,
  TargetIcon,
  ZapIcon,
} from './icons.jsx'
import { mistakesStore } from '../storage/mistakesStore.js'
import './BottomNav.css'

export default function BottomNav() {
  const location = useLocation()
  const [dueMistakesCount, setDueMistakesCount] = useState(0)
  const [isDrillImmersive, setIsDrillImmersive] = useState(
    () => typeof document !== 'undefined' && document.body.dataset.immersive === 'true',
  )

  useEffect(() => {
    const check = () => {
      setIsDrillImmersive(document.body.dataset.immersive === 'true')
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-immersive'] })
    return () => observer.disconnect()
  }, [])

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
    <nav className="bottom-nav is-visible" aria-label="Main Mobile Navigation">
      <NavLink to="/" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`} end>
        <BookIcon width="20" height="20" />
        <span>Curriculum</span>
      </NavLink>

      <NavLink to="/drill" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
        <TargetIcon width="20" height="20" />
        <span>Drill</span>
      </NavLink>

      <NavLink to="/daily" className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}>
        <ZapIcon width="20" height="20" />
        <span>Daily</span>
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
    </nav>
  )
}
