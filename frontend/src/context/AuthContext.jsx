import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // ── INITIALISE ─────────────────────────────────────────────────────────────
  // On app load, check if tokens exist and fetch current user
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.clear()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password)
    localStorage.setItem('access_token',  res.data.access)
    localStorage.setItem('refresh_token', res.data.refresh)
    setUser(res.data.user)
    return res.data.user
  }, [])

  // ── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    try {
      if (refreshToken) await authAPI.logout(refreshToken)
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.clear()
      setUser(null)
      window.location.href = '/login'
    }
  }, [])

  // ── UPDATE USER ────────────────────────────────────────────────────────────
  const updateUser = useCallback((updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }))
  }, [])

  // ── ROLE HELPERS ───────────────────────────────────────────────────────────
  const isSuperAdmin = user?.role === 'superadmin'
  const isAdmin      = ['superadmin', 'admin'].includes(user?.role)
  const isManager    = ['superadmin', 'admin', 'manager'].includes(user?.role)
  const isUser       = user?.role === 'user'

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isSuperAdmin,
    isAdmin,
    isManager,
    isUser,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ── HOOK ───────────────────────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}