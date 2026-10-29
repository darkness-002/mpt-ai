import { useEffect, useState } from 'react'
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CloseIcon,
  UserIcon,
} from './icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import './PublicAuthModal.css'

export default function PublicAuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const { signIn, signUp, user } = useAuth()
  const [mode, setMode] = useState(initialMode) // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset form when modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setEmail('')
      setPassword('')
      setError(null)
      setMessage(null)
      setSubmitting(false)
    }
  }, [isOpen, initialMode])

  if (!isOpen) return null

  // If already logged in, close modal
  if (user) {
    onClose()
    return null
  }

  const handleSwitchMode = (newMode) => {
    setMode(newMode)
    setError(null)
    setMessage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Please enter a valid email address.')
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const res = await signIn(cleanEmail, password)
        if (res.error) {
          // Provide friendly user feedback
          const raw = res.error.message || ''
          let friendly = raw
          if (raw.toLowerCase().includes('invalid login credentials')) {
            friendly = 'Invalid email or password. Please try again.'
          } else if (raw.toLowerCase().includes('email not confirmed')) {
            friendly = 'Please check your inbox to verify your email before signing in.'
          }
          setError(friendly)
          setSubmitting(false)
          return
        }

        // Successfully authenticated! Modal closes and user stays on public view
        setSubmitting(false)
        onClose()
      } else {
        // Sign up student
        const res = await signUp(cleanEmail, password, '', 'student')
        if (res.error) {
          const raw = res.error.message || ''
          let friendly = raw
          if (raw.toLowerCase().includes('already registered')) {
            friendly = 'An account with this email already exists. Try signing in instead.'
          } else if (raw.toLowerCase().includes('password')) {
            friendly = 'Password is too weak. Please use at least 6 characters.'
          }
          setError(friendly)
          setSubmitting(false)
          return
        }

        // Check if session was granted right away
        if (res.data?.session) {
          setSubmitting(false)
          onClose()
        } else {
          // Email confirmation is required
          setSubmitting(false)
          setMessage('Account created! Please check your email inbox to confirm your account, then sign in.')
          setMode('signin')
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="public-auth-modal w-[95%] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="public-auth-modal__header">
          <div className="public-auth-modal__title-group">
            <div className="public-auth-modal__icon-badge">
              <UserIcon width="18" height="18" />
            </div>
            <div>
              <h2 className="public-auth-modal__title">
                {mode === 'signin' ? 'Sign In to MPT·AI' : 'Create Student Account'}
              </h2>
              <p className="public-auth-modal__subtitle">
                {mode === 'signin'
                  ? 'Access your saved progress, streaks, and bookmarks.'
                  : 'Sync your curriculum mastery and study streak across devices.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn public-auth-close-btn"
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon width="18" height="18" />
          </button>
        </header>

        {/* Segmented Mode Switcher */}
        <div className="public-auth-tabs">
          <button
            type="button"
            className={`public-auth-tab ${mode === 'signin' ? 'is-active' : ''}`}
            onClick={() => handleSwitchMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`public-auth-tab ${mode === 'signup' ? 'is-active' : ''}`}
            onClick={() => handleSwitchMode('signup')}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="public-auth-error-hint" role="alert">
            <AlertCircleIcon width="15" height="15" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="public-auth-success-hint" role="status">
            <CheckCircleIcon width="15" height="15" />
            <span>{message}</span>
          </div>
        )}

        {/* Credential Form */}
        <form className="public-auth-form" onSubmit={handleSubmit}>
          <div className="public-auth-field">
            <label htmlFor="public-auth-email" className="public-auth-label">
              Email Address
            </label>
            <input
              id="public-auth-email"
              type="email"
              className="public-auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="public-auth-field">
            <div className="public-auth-field-header">
              <label htmlFor="public-auth-password" className="public-auth-label">
                Password
              </label>
            </div>
            <input
              id="public-auth-password"
              type="password"
              className="public-auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary public-auth-submit"
            disabled={submitting}
          >
            {submitting ? (
              <span>Please wait…</span>
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <footer className="public-auth-modal__footer">
          {mode === 'signin' ? (
            <p>
              New to MPT·AI?{' '}
              <button
                type="button"
                className="public-auth-link"
                onClick={() => handleSwitchMode('signup')}
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                className="public-auth-link"
                onClick={() => handleSwitchMode('signin')}
              >
                Sign in here
              </button>
            </p>
          )}
        </footer>
      </div>
    </div>
  )
}
