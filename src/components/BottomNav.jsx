import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  SettingsIcon,
  TargetIcon,
  ZapIcon,
} from './icons.jsx'
import './BottomNav.css'

export default function BottomNav({ onOpenSettings }) {
  const location = useLocation()
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

  // Immersive modes: don't show navigation during focused lessons, exams, or speed runs
  const isImmersiveMode =
    location.pathname.startsWith('/lesson/') ||
    location.pathname.startsWith('/mock/') ||
    location.pathname === '/speed-run' ||
    location.pathname.startsWith('/admin') ||
    isDrillImmersive

  if (isImmersiveMode) return null

  return (
    <nav className="bottom-nav flex md:hidden fixed bottom-0 left-0 right-0 w-full z-50" aria-label="Mobile Navigation Dock">
      <div className="bottom-nav__dock w-full grid grid-cols-4 items-center">
        <NavLink
          to="/"
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
          end
        >
          <div className="bottom-nav__icon-box">
            <HomeIcon width="22" height="22" />
          </div>
          <span className="bottom-nav__label">Home</span>
        </NavLink>

        <NavLink
          to="/drill"
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
        >
          <div className="bottom-nav__icon-box">
            <TargetIcon width="22" height="22" />
          </div>
          <span className="bottom-nav__label">Drill</span>
        </NavLink>

        <NavLink
          to="/daily"
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
        >
          <div className="bottom-nav__icon-box">
            <ZapIcon width="22" height="22" />
          </div>
          <span className="bottom-nav__label">Daily Sprint</span>
        </NavLink>

        <button
          type="button"
          className="bottom-nav__item bottom-nav__btn"
          onClick={onOpenSettings}
          aria-label="Open Settings"
        >
          <div className="bottom-nav__icon-box">
            <SettingsIcon width="22" height="22" />
          </div>
          <span className="bottom-nav__label">Settings</span>
        </button>
      </div>
    </nav>
  )
}
