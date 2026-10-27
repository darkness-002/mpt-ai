import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase, fetchUserProfile } from '../lib/supabase.js'
import { evaluatePermissions } from './rbac.js'

const AuthContext = createContext(null)

const STORAGE_DEV_ROLE = 'mpt-ai-dev-role'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Dev / Demo role override for testing RBAC without requiring manual database edits
  const [devRole, setDevRoleState] = useState(() => {
    return localStorage.getItem(STORAGE_DEV_ROLE) || 'admin'
  })

  const setDevRole = (role) => {
    setDevRoleState(role)
    localStorage.setItem(STORAGE_DEV_ROLE, role)
  }

  // Fetch Supabase session and user profile
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      if (!isSupabaseConfigured()) {
        // Offline / Unconfigured mode: default to devRole
        if (mounted) setLoading(false)
        return
      }

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
        }

        if (initialSession?.user) {
          const userProf = await fetchUserProfile(initialSession.user.id)
          if (mounted && userProf) {
            setProfile(userProf)
          }
        }
      } catch (err) {
        console.warn('Error reading auth session:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          if (!mounted) return
          setSession(newSession)
          setUser(newSession?.user ?? null)

          if (newSession?.user) {
            const userProf = await fetchUserProfile(newSession.user.id)
            if (mounted) setProfile(userProf)
          } else {
            if (mounted) setProfile(null)
          }
        },
      )

      return () => {
        mounted = false
        subscription?.unsubscribe()
      }
    }

    return () => {
      mounted = false
    }
  }, [])

  // Calculate active effective role:
  // If Supabase profile has a real role, use that; otherwise fall back to devRole.
  const activeRole = useMemo(() => {
    if (profile?.role) return profile.role
    return devRole || 'admin'
  }, [profile, devRole])

  // RBAC Permission checks
  const permissions = useMemo(() => evaluatePermissions(activeRole, profile), [activeRole, profile])

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase credentials not configured in environment.' } }
    }
    const res = await supabase.auth.signInWithPassword({ email, password })
    if (res.data?.user) {
      const p = await fetchUserProfile(res.data.user.id)
      setProfile(p)
    }
    return res
  }

  const signUp = async (email, password, fullName = '', requestedRole = 'contributor') => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase credentials not configured in environment.' } }
    }
    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          requested_role: requestedRole,
        },
      },
    })
    return res
  }

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const value = {
    user,
    session,
    profile,
    role: activeRole,
    devRole,
    setDevRole,
    loading,
    isConfigured: isSupabaseConfigured(),
    ...permissions,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
