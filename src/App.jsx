import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import BottomNav from './components/BottomNav.jsx'
import { settingsStore } from './storage/settingsStore.js'
import './App.css'

export default function App() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // Initialize theme & typography settings on app launch
  useEffect(() => {
    settingsStore.apply(settingsStore.load())
  }, [])

  // "Downloaded for offline" is informational — it must never linger over a lesson.
  useEffect(() => {
    if (!offlineReady) return undefined
    const timer = setTimeout(() => setOfflineReady(false), 5000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  return (
    <div className="app">
      <Suspense fallback={<div className="lesson lesson--loading" style={{ minHeight: '60vh' }}>Loading…</div>}>
        <Outlet />
      </Suspense>

      <BottomNav />

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
