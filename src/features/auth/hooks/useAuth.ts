/**
 * useAuth Hook
 *
 * Provides login, signup, forgot password, and logout actions.
 * Bridges auth.service calls with the authStore.
 *
 * Owner: Junior Engineer 1
 */

import { useCallback, useState } from 'react'

import { useAuthStore } from '@/store/authStore'
import type { AuthError, LoginCredentials, SignupCredentials } from '@/types'

import {
  loginWithEmail,
  logoutUser,
  sendPasswordReset,
  signupWithEmail,
} from '../services/auth.service'

export function useAuth() {
  const { setUser, setLoading, logout: clearStore } = useAuthStore()
  const [error, setError] = useState<AuthError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setError(null)
      setIsSubmitting(true)
      try {
        const data = await loginWithEmail(credentials)
        const session = data.session
        if (session?.user) {
          setUser(
            { id: session.user.id, email: session.user.email ?? '' },
            session.access_token,
          )
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Login failed'
        setError({ message })
      } finally {
        setIsSubmitting(false)
      }
    },
    [setUser],
  )

  const signup = useCallback(
    async (credentials: SignupCredentials) => {
      setError(null)
      setIsSubmitting(true)
      try {
        const data = await signupWithEmail(credentials)
        const session = data.session
        if (session?.user) {
          setUser(
            { id: session.user.id, email: session.user.email ?? '' },
            session.access_token,
          )
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Signup failed'
        setError({ message })
      } finally {
        setIsSubmitting(false)
      }
    },
    [setUser],
  )

  const forgotPassword = useCallback(async (email: string) => {
    setError(null)
    setIsSubmitting(true)
    setResetSent(false)
    try {
      await sendPasswordReset(email)
      setResetSent(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Password reset failed'
      setError({ message })
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await logoutUser()
    } finally {
      clearStore()
    }
  }, [setLoading, clearStore])

  return { login, signup, forgotPassword, logout, error, isSubmitting, resetSent }
}
