import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  BookIcon,
  FlameIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SunIcon,
  TimerIcon,
  UserIcon,
} from './icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { settingsStore, THEMES } from '../storage/settingsStore.js'
import { streakStore } from '../storage/streakStore.js'
import './AppHeader.css'

export default function AppHeader({ onOpenSearch, onOpenSettings, onOpenFocus, onOpenAuth }) {
  const { user, profile, isStaff } = useAuth()
  const location = useLocation()
  const [streak, setStreak] = useState(() => streakStore.load())
  const [currentTheme, setCurrentTheme] = useState(() => settingsStore.load().theme)

  // Immersive modes: don't show header inside lessons or full mock exams
  const isImmersive =
    location.pathname.startsWith('/lesson/') ||
    location.pathname.startsWith('/mock/') ||
    location.pathname === '/speed-run'

  useEffect(() => {
    setStreak(streakStore.load())
  }, [location.pathname])

  if (isImmersive) return null

  const handleCycleTheme = () => {
    const current = settingsStore.load()
    let next = THEMES.DARK
    if (current.theme === THEMES.LIGHT) next = THEMES.DARK
    else if (current.theme === THEMES.DARK) next = THEMES.ZEN
    else if (current.theme === THEMES.ZEN) next = THEMES.MIDNIGHT
    else if (current.theme === THEMES.MIDNIGHT) next = THEMES.LIGHT
    else next = THEMES.LIGHT

    const updated = { ...current, theme: next }
    settingsStore.save(updated)
    setCurrentTheme(next)
  }

  const themeDisplayNames = {
    [THEMES.LIGHT]: 'Light',
    [THEMES.DARK]: 'Dark',
    [THEMES.ZEN]: 'Zen',
    [THEMES.MIDNIGHT]: 'Midnight',
  }

  const displayRole = user
    ? (profile?.role === 'admin'
        ? 'Admin'
        : profile?.role === 'editor'
        ? 'Editor'
        : profile?.role === 'reviewer'
        ? 'Reviewer'
        : profile?.role === 'contributor' && user.user_metadata?.role !== 'student'
        ? 'Contributor'
        : 'Student')
    : 'Guest'

  const isStaffUser = Boolean(user && isStaff)

  return (
    <header className="site-header w-full max-w-full box-border px-4 md:px-8">
      <div className="site-header__container w-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Brand */}
        <Link to="/" className="site-header__brand flex items-center gap-2.5 min-w-0" aria-label="MPT-AI Home">
          <div className="site-brand-badge shrink-0">
            <BookIcon width="18" height="18" />
          </div>
          <div className="site-brand-text min-w-0 flex flex-col">
            <span className="site-brand-title truncate">
              MPT<span className="brand-accent">·</span>AI
            </span>
            <span className="site-brand-tag hidden sm:block truncate">Civil Service Prep</span>
          </div>
        </Link>

        {/* Clean, Non-Cluttered Desktop Navigation */}
        <nav className="header-desktop-nav hidden md:flex" aria-label="Main Navigation">
          <NavLink to="/" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`} end>
            Curriculum
          </NavLink>
          <NavLink to="/drill" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
            Practice Drill
          </NavLink>
          <NavLink to="/daily" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
            Daily Sprint
          </NavLink>
          <NavLink to="/mistakes" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
            Mistakes Bank
          </NavLink>
          {isStaffUser && (
            <NavLink to="/admin" className="header-nav-link header-nav-link--admin" title="Admin & Staff Portal">
              <ShieldCheckIcon width="14" height="14" />
              <span>Admin Portal</span>
            </NavLink>
          )}
        </nav>

        {/* Global Search Bar Button (Desktop only) */}
        <button
          type="button"
          className="header-search-trigger hidden md:flex"
          onClick={onOpenSearch}
          title="Search topics, questions, syllabus (Ctrl+K)"
          aria-label="Global Search"
        >
          <SearchIcon width="15" height="15" className="header-search-icon" />
          <span className="header-search-text">Search topics…</span>
          <kbd className="header-search-kbd">Ctrl K</kbd>
        </button>

        {/* Action Controls */}
        <div className="site-header__controls flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Daily Streak (hidden on mobile, visible on sm: and up) */}
          <Link to="/daily" className="header-streak-pill hidden sm:flex" title="Daily Streak">
            <FlameIcon width="16" height="16" className="header-streak-flame" />
            <span className="header-streak-count">{streak.currentStreak}</span>
          </Link>

          {/* Pomodoro Focus Timer (Desktop only) */}
          <button
            type="button"
            className="icon-btn header-tool-btn hidden md:inline-flex min-h-[44px] min-w-[44px]"
            onClick={onOpenFocus}
            title="Focus Timer"
            aria-label="Focus Timer"
          >
            <TimerIcon width="18" height="18" />
          </button>

          {/* Quick Theme Switcher (Mobile & Desktop) */}
          <button
            type="button"
            className="icon-btn header-tool-btn inline-flex min-h-[44px] min-w-[44px]"
            onClick={handleCycleTheme}
            title={`Theme: ${themeDisplayNames[currentTheme] || currentTheme}. Click to cycle.`}
            aria-label="Switch Theme"
          >
            {currentTheme === 'light' || currentTheme === 'zen' || currentTheme === 'ivory' || currentTheme === 'sepia' ? (
              <SunIcon width="18" height="18" />
            ) : (
              <MoonIcon width="18" height="18" />
            )}
          </button>

          {/* Public Student Auth / Profile Button (Mobile & Desktop) */}
          {!user ? (
            <button
              type="button"
              className="header-auth-btn inline-flex min-h-[44px] min-w-[44px]"
              onClick={onOpenAuth}
              title="Sign In or Create Account"
              aria-label="Sign In"
            >
              <UserIcon width="15" height="15" />
              <span className="header-auth-btn__text hidden sm:inline">Sign In</span>
            </button>
          ) : (
            <button
              type="button"
              className="header-user-btn inline-flex min-h-[44px] min-w-[44px]"
              onClick={onOpenSettings}
              title={`Logged in as ${user.email} (${displayRole}). Click to manage account.`}
              aria-label="Account Settings"
            >
              <div className="header-user-avatar">
                {user.email ? user.email.charAt(0).toUpperCase() : 'S'}
              </div>
              <span className="header-user-email hidden md:inline">
                {user.email ? user.email.split('@')[0] : 'Student'}
              </span>
            </button>
          )}

          {/* Admin / Staff Shortcut (Desktop only) */}
          {isStaffUser && (
            <Link
              to="/admin"
              className="header-admin-badge-btn hidden md:inline-flex min-h-[44px]"
              title="Open Admin & Staff Portal"
              aria-label="Admin Portal"
            >
              <ShieldCheckIcon width="14" height="14" />
              <span className="header-admin-badge-btn__text">Admin</span>
            </Link>
          )}

          {/* Settings (Desktop only) */}
          <button
            type="button"
            className="icon-btn header-tool-btn hidden md:inline-flex min-h-[44px] min-w-[44px]"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="App Settings"
          >
            <SettingsIcon width="18" height="18" />
          </button>
        </div>
      </div>
    </header>
  )
}
