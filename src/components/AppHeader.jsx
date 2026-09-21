import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  BookIcon,
  FlameIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  TimerIcon,
} from './icons.jsx'
import { settingsStore, THEMES } from '../storage/settingsStore.js'
import { streakStore } from '../storage/streakStore.js'
import './AppHeader.css'

export default function AppHeader({ onOpenSearch, onOpenSettings, onOpenFocus }) {
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
    if (current.theme === THEMES.DARK) next = THEMES.SEPIA
    else if (current.theme === THEMES.SEPIA) next = THEMES.LIGHT
    else if (current.theme === THEMES.LIGHT) next = THEMES.OLED
    else if (current.theme === THEMES.OLED) next = THEMES.SYSTEM
    else next = THEMES.DARK

    const updated = { ...current, theme: next }
    settingsStore.save(updated)
    setCurrentTheme(next)
  }

  return (
    <header className="site-header">
      <div className="site-header__container">
        {/* Brand */}
        <Link to="/" className="site-header__brand" aria-label="MPT-AI Home">
          <div className="site-brand-badge">
            <BookIcon width="18" height="18" />
          </div>
          <div className="site-brand-text">
            <span className="site-brand-title">
              MPT<span className="brand-accent">·</span>AI
            </span>
            <span className="site-brand-tag">Civil Service Prep</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="header-desktop-nav" aria-label="Main Desktop Navigation">
          <NavLink to="/" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`} end>
            Curriculum
          </NavLink>
          <NavLink to="/drill" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
            Drill
          </NavLink>
          <NavLink to="/daily" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
            Daily
          </NavLink>
          <NavLink to="/flashcards" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
            Flashcards
          </NavLink>
          <NavLink to="/readiness" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
            Readiness
          </NavLink>
          <NavLink to="/papers" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
            Past Papers
          </NavLink>
        </nav>

        {/* Global Search Bar Button */}
        <button
          type="button"
          className="header-search-trigger"
          onClick={onOpenSearch}
          title="Search topics, questions, past papers (Ctrl+K)"
          aria-label="Global Search"
        >
          <SearchIcon width="15" height="15" className="header-search-icon" />
          <span className="header-search-text">Search topics or tools…</span>
          <kbd className="header-search-kbd">Ctrl K</kbd>
        </button>

        {/* Action Controls */}
        <div className="site-header__controls">
          {/* Daily Streak Pill */}
          <Link to="/daily" className="header-streak-pill" title="Daily Streak & Challenge">
            <FlameIcon width="16" height="16" className="header-streak-flame" />
            <span className="header-streak-count">{streak.currentStreak}</span>
          </Link>

          {/* Pomodoro Focus Timer */}
          <button
            type="button"
            className="icon-btn header-tool-btn"
            onClick={onOpenFocus}
            title="Pomodoro Study Focus Timer"
            aria-label="Study Timer"
          >
            <TimerIcon width="18" height="18" />
          </button>

          {/* Quick Theme Switcher */}
          <button
            type="button"
            className="icon-btn header-tool-btn"
            onClick={handleCycleTheme}
            title={`Theme: ${currentTheme}. Click to cycle themes.`}
            aria-label="Switch Theme"
          >
            {currentTheme === 'light' || currentTheme === 'sepia' ? (
              <SunIcon width="18" height="18" />
            ) : (
              <MoonIcon width="18" height="18" />
            )}
          </button>

          {/* Settings */}
          <button
            type="button"
            className="icon-btn header-tool-btn"
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
