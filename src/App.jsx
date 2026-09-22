import { Suspense, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import AppHeader from './components/AppHeader.jsx'
import BottomNav from './components/BottomNav.jsx'
import GlobalSearchModal from './components/GlobalSearchModal.jsx'
import FocusTimerModal from './components/FocusTimerModal.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { settingsStore } from './storage/settingsStore.js'
import './App.css'

export default function App() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const [showSearch, setShowSearch] = useState(false)
  const [showFocus, setShowFocus] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Initialize theme & typography settings on app launch and follow OS theme changes
  useEffect(() => {
    settingsStore.apply(settingsStore.load())

    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined

    const handler = () => {
      const current = settingsStore.load()
      if (current.theme === 'system') {
        settingsStore.apply(current)
      }
    }

    if (media.addEventListener) {
      media.addEventListener('change', handler)
      return () => media.removeEventListener('change', handler)
    } else if (media.addListener) {
      media.addListener(handler)
      return () => media.removeListener(handler)
    }
  }, [])

  // Global Ctrl+K / Cmd+K listener for instant search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch((s) => !s)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // "Downloaded for offline" is informational — it must never linger over a lesson.
  useEffect(() => {
    if (!offlineReady) return undefined
    const timer = setTimeout(() => setOfflineReady(false), 5000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  return (
    <div className="app">
      {/* Modern Top Header Navigation with Search & Tools */}
      <AppHeader
        onOpenSearch={() => setShowSearch(true)}
        onOpenFocus={() => setShowFocus(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <Suspense fallback={<div className="lesson lesson--loading" style={{ minHeight: '60vh' }}>Loading…</div>}>
        <Outlet />
      </Suspense>

      <BottomNav />

      {/* Global Dialogs & Tool Modals */}
      <GlobalSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onOpenFocus={() => setShowFocus(true)}
      />

      <FocusTimerModal
        isOpen={showFocus}
        onClose={() => setShowFocus(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {(offlineReady || needRefresh) && (
        <div className="toast" role="status">
          <span>
            {needRefresh
              ? 'A new version of MPT-AI is available.'
              : 'Downloaded — MPT-AI now works offline.'}
          </span>
          {needRefresh && (
            <button
              className="btn btn--small"
              type="button"
              onClick={() => updateServiceWorker(true)}
            >
              Reload
            </button>
          )}
          <button
            className="btn btn--small btn--ghost"
            type="button"
            onClick={() => {
              setOfflineReady(false)
              setNeedRefresh(false)
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
