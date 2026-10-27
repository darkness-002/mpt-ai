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
    let next = THEMES.MIDNIGHT
    if (current.theme === THEMES.LIGHT) next = THEMES.MIDNIGHT
    else if (current.theme === THEMES.MIDNIGHT || current.theme === 'dark') next = THEMES.IVORY
    else if (current.theme === THEMES.IVORY || current.theme === 'sepia') next = THEMES.OLED
    else if (current.theme === THEMES.OLED) next = THEMES.LIGHT
    else next = THEMES.LIGHT

    const updated = { ...current, theme: next }
    settingsStore.save(updated)
    setCurrentTheme(next)
  }

  const themeDisplayNames = {
    [THEMES.LIGHT]: 'Minimal Light',
    [THEMES.MIDNIGHT]: 'Midnight Slate',
    [THEMES.IVORY]: 'Warm Ivory',
    [THEMES.OLED]: 'OLED Console',
    dark: 'Midnight Slate',
    sepia: 'Warm Ivory',
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

        {/* Clean, Non-Cluttered Desktop Navigation */}
        <nav className="header-desktop-nav" aria-label="Main Navigation">
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
        </nav>

        {/* Global Search Bar Button */}
        <button
          type="button"
          className="header-search-trigger"
          onClick={onOpenSearch}
          title="Search topics, questions, syllabus (Ctrl+K)"
          aria-label="Global Search"
        >
          <SearchIcon width="15" height="15" className="header-search-icon" />
          <span className="header-search-text">Search topics…</span>
          <kbd className="header-search-kbd">Ctrl K</kbd>
        </button>

        {/* Action Controls */}
        <div className="site-header__controls">
          {/* Daily Streak */}
          <Link to="/daily" className="header-streak-pill" title="Daily Streak">
            <FlameIcon width="16" height="16" className="header-streak-flame" />
            <span className="header-streak-count">{streak.currentStreak}</span>
          </Link>

          {/* Pomodoro Focus Timer */}
          <button
            type="button"
            className="icon-btn header-tool-btn"
            onClick={onOpenFocus}
            title="Focus Timer"
            aria-label="Focus Timer"
          >
            <TimerIcon width="18" height="18" />
          </button>

          {/* Quick Theme Switcher */}
          <button
            type="button"
            className="icon-btn header-tool-btn"
            onClick={handleCycleTheme}
            title={`Theme: ${themeDisplayNames[currentTheme] || currentTheme}. Click to cycle.`}
            aria-label="Switch Theme"
          >
            {currentTheme === 'light' || currentTheme === 'ivory' || currentTheme === 'sepia' ? (
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
