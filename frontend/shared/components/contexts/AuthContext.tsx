'use client'

/**
 * CRIT-03: AuthContext — Secure Access Token Management
 *
 * The access token lives ONLY in React state (in-memory).
 * It is NEVER stored in localStorage or a non-httponly cookie.
 *
 * Session restoration on page reload:
 *   mount → POST /api/auth/refresh (browser sends httponly refresh token cookie automatically)
 *         → store new access token in memory
 *         → all subsequent API calls use the in-memory token
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import api, { setInMemoryToken, getActiveApiUrl, serverPool, refreshToken } from '@/core/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number
  username: string
  preferred_name?: string
  email: string
  preferred_language: string
  is_active: boolean
  waitlist_status?: string
  waitlist_number?: number | null
}

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  loading: boolean
  setToken: (token: string, username?: string) => void
  clearAuth: () => void
  refreshUser: () => Promise<AuthUser | null>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  loading: true,
  setToken: () => {},
  clearAuth: () => {},
  refreshUser: async () => null,
})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const didRestore = useRef(false)

  const setToken = useCallback((newToken: string, username?: string) => {
    setTokenState(newToken)
    setInMemoryToken(newToken)
    if (username) localStorage.setItem('mb_username', username)
  }, [])

  const clearAuth = useCallback(() => {
    setTokenState(null)
    setUser(null)
    setInMemoryToken(null)
  }, [])

  // Restore session on mount via httponly cookie
  useEffect(() => {
    if (didRestore.current) return
    didRestore.current = true

    const restore = async () => {
      try {
        const refreshedToken = await refreshToken()
        if (refreshedToken) {
          const username = typeof window !== 'undefined' ? localStorage.getItem('mb_username') || undefined : undefined
          setToken(refreshedToken, username)
        }
      } catch {
        // No valid session — user must log in
      } finally {
        setLoading(false)
      }
    }

    restore()
  }, [setToken])

  // Synchronize React state when token is refreshed by interceptor or other modules
  useEffect(() => {
    const handleTokenRefreshed = (e: any) => {
      const newToken = e?.detail?.token
      const username = e?.detail?.username
      if (newToken) {
        setTokenState(newToken)
        if (username) localStorage.setItem('mb_username', username)
      }
    }

    window.addEventListener('mythri:auth_token_refreshed', handleTokenRefreshed)
    return () => window.removeEventListener('mythri:auth_token_refreshed', handleTokenRefreshed)
  }, [])

  // Proactive background refresh:
  // Access tokens expire in 30 minutes. Refresh every 20 minutes so active conversations never disconnect.
  useEffect(() => {
    if (!token) return

    const REFRESH_INTERVAL_MS = 20 * 60 * 1000 // 20 minutes
    const interval = setInterval(async () => {
      try {
        await refreshToken()
      } catch {
        // Transient network failure; next call or next interval will retry
      }
    }, REFRESH_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [token])

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data)
      const customName = data.preferred_name || data.username
      if (customName) {
        localStorage.setItem('mb_username', customName)
      }
      return data
    } catch {
      return null
    }
  }, [])

  // Fetch user identity when token changes
  useEffect(() => {
    if (!token) { setUser(null); return }
    let cancelled = false
    refreshUser().catch(() => {})
    return () => { cancelled = true }
  }, [token, refreshUser])

  return (
    <AuthContext.Provider value={{ token, user, loading, setToken, clearAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
