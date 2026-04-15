/**
 * useAuth hook unit tests
 *
 * Mocks auth.service to test hook behavior in isolation.
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'

// ─── Mock auth.service ────────────────────────────────────────────────────

vi.mock('../services/auth.service', () => ({
  loginWithEmail: vi.fn(),
  signupWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  logoutUser: vi.fn(),
}))

import {
  loginWithEmail,
  logoutUser,
  sendPasswordReset,
  signupWithEmail,
} from '../services/auth.service'

import { useAuth } from './useAuth'

const mockLogin = vi.mocked(loginWithEmail)
const mockSignup = vi.mocked(signupWithEmail)
const mockReset = vi.mocked(sendPasswordReset)
const mockLogout = vi.mocked(logoutUser)

// ─── Tests ────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().logout()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── login ─────────────────────────────────────────────────────────────

  it('login returns true and sets user in store on success', async () => {
    mockLogin.mockResolvedValue({
      session: {
        user: { id: 'u1', email: 'a@b.com' },
        access_token: 'tok',
      },
    } as never)

    const { result } = renderHook(() => useAuth())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.login({ email: 'a@b.com', password: 'pw' })
    })

    expect(success).toBe(true)
    expect(result.current.error).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.email).toBe('a@b.com')
  })

  it('login returns false and sets error on failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))

    const { result } = renderHook(() => useAuth())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.login({ email: 'a@b.com', password: 'bad' })
    })

    expect(success).toBe(false)
    expect(result.current.error?.message).toBe('Invalid credentials')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('login handles non-Error thrown values', async () => {
    mockLogin.mockRejectedValue('network failure')

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'pw' })
    })

    expect(result.current.error?.message).toBe('network failure')
  })

  it('login handles error objects without Error prototype', async () => {
    mockLogin.mockRejectedValue({ message: 'Too many requests', status: 429 })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'pw' })
    })

    expect(result.current.error?.message).toBe('Too many requests')
  })

  // ── signup ────────────────────────────────────────────────────────────

  it('signup returns true and sets user in store on success', async () => {
    mockSignup.mockResolvedValue({
      session: {
        user: { id: 'u2', email: 'new@b.com' },
        access_token: 'tok2',
      },
    } as never)

    const { result } = renderHook(() => useAuth())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.signup({ email: 'new@b.com', password: 'pw' })
    })

    expect(success).toBe(true)
    expect(result.current.error).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('signup returns false and sets error on failure', async () => {
    mockSignup.mockRejectedValue(new Error('Email taken'))

    const { result } = renderHook(() => useAuth())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.signup({ email: 'a@b.com', password: 'pw' })
    })

    expect(success).toBe(false)
    expect(result.current.error?.message).toBe('Email taken')
  })

  it('signup returns false when no session returned', async () => {
    mockSignup.mockResolvedValue({ session: null, user: null } as never)

    const { result } = renderHook(() => useAuth())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.signup({ email: 'a@b.com', password: 'pw' })
    })

    expect(success).toBe(false)
    expect(result.current.error?.message).toBe('No session returned. Please try again.')
  })

  // ── forgotPassword ────────────────────────────────────────────────────

  it('forgotPassword returns true and sets resetSent on success', async () => {
    mockReset.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.forgotPassword('a@b.com')
    })

    expect(success).toBe(true)
    expect(result.current.resetSent).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('forgotPassword returns false and sets error on failure', async () => {
    mockReset.mockRejectedValue(new Error('Rate limited'))

    const { result } = renderHook(() => useAuth())
    let success: boolean | undefined

    await act(async () => {
      success = await result.current.forgotPassword('a@b.com')
    })

    expect(success).toBe(false)
    expect(result.current.error?.message).toBe('Rate limited')
    expect(result.current.resetSent).toBe(false)
  })

  // ── logout ────────────────────────────────────────────────────────────

  it('logout clears store', async () => {
    useAuthStore.getState().setUser({ id: '1', email: 'a@b.com' }, 'tok')
    mockLogout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.logout()
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })
})
