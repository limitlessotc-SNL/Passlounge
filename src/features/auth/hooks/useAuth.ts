/**
 * useAuth Hook
 *
 * Provides login, signup, forgot password, and logout actions.
 * Bridges auth.service calls with the authStore.
 * Each action returns true on success, false on failure.
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

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message || fallback
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message) || fallback
  }
  if (typeof err === 'string') {
    return err
  }
  return fallback
}

export function useAuth() {
  const { setUser, setLoading, logout: clearStore } = useAuthStore()
  const [error, setError] = useState<AuthError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
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
          return true
        }
        setError({ message: 'No session returned. Please try again.' })
        return false
      } catch (err: unknown) {
        setError({ message: extractErrorMessage(err, 'Login failed') })
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [setUser],
  )

  const signup = useCallback(
    async (credentials: SignupCredentials): Promise<boolean> => {
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
          return true
        }
        setError({ message: 'No session returned. Please try again.' })
        return false
      } catch (err: unknown) {
        setError({ message: extractErrorMessage(err, 'Signup failed') })
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [setUser],
  )

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    setError(null)
    setIsSubmitting(true)
    setResetSent(false)
    try {
      await sendPasswordReset(email)
      setResetSent(true)
      return true
    } catch (err: unknown) {
      setError({ message: extractErrorMessage(err, 'Password reset failed') })
      return false
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
