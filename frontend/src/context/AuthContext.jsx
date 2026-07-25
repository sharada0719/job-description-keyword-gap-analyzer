import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true) // initial session check

  // ── Persist tokens ──────────────────────────────────────────────────────────
  const saveTokens = useCallback(({ access_token, refresh_token }) => {
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
  }, [])

  const clearTokens = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }, [])

  // ── Hydrate user from existing token on mount ───────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .getMe()
      .then((userData) => setUser(userData))
      .catch(() => clearTokens())
      .finally(() => setLoading(false))
  }, [clearTokens])

  // ── Actions ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const tokens = await authApi.login({ email, password })
    saveTokens(tokens)
    const userData = await authApi.getMe()
    setUser(userData)
    return userData
  }, [saveTokens])

  const register = useCallback(async (email, fullName, password) => {
    const tokens = await authApi.register({ email, full_name: fullName, password })
    saveTokens(tokens)
    const userData = await authApi.getMe()
    setUser(userData)
    return userData
  }, [saveTokens])

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [clearTokens])

  const refreshProfile = useCallback(async () => {
    const userData = await authApi.getMe()
    setUser(userData)
    return userData
  }, [])

  const value = { user, loading, login, register, logout, refreshProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
