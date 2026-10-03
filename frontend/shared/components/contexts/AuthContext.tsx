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
import axios from 'axios'
import { setInMemoryToken, API_URL } from '@/core/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number
  username: string
  email: string
  preferred_language: string
  is_active: boolean
}

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  loading: boolean
  setToken: (token: string, username?: string) => void
  clearAuth: () => void
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
        const { data } = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )
        if (data.access_token) {
          setToken(data.access_token, data.username)
        }
      } catch {
        // No valid session
      } finally {
        setLoading(false)
      }
    }

    restore()
  }, [setToken])

  // Fetch user identity when token changes
  useEffect(() => {
    if (!token) { setUser(null); return }
    let cancelled = false
    axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    }).then(({ data }) => { if (!cancelled) setUser(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token])

  return (
    <AuthContext.Provider value={{ token, user, loading, setToken, clearAuth }}>
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
