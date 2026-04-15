/**
 * auth.service unit tests
 *
 * Mocks the Supabase client to test each service function in isolation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock Supabase ────────────────────────────────────────────────────────

const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

import {
  getSession,
  loginWithEmail,
  logoutUser,
  sendPasswordReset,
  signupWithEmail,
} from './auth.service'

// ─── Tests ────────────────────────────────────────────────────────────────

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── loginWithEmail ────────────────────────────────────────────────────

  describe('loginWithEmail', () => {
    it('returns data on success', async () => {
      const fakeData = { session: { access_token: 'tok' }, user: { id: '1' } }
      mockSignInWithPassword.mockResolvedValue({ data: fakeData, error: null })

      const result = await loginWithEmail({ email: 'a@b.com', password: 'pw' })

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pw',
      })
      expect(result).toEqual(fakeData)
    })

    it('throws on error', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: new Error('Invalid credentials'),
      })

      await expect(
        loginWithEmail({ email: 'a@b.com', password: 'bad' }),
      ).rejects.toThrow('Invalid credentials')
    })
  })

  // ── signupWithEmail ───────────────────────────────────────────────────

  describe('signupWithEmail', () => {
    it('returns data on success', async () => {
      const fakeData = { session: null, user: { id: '2' } }
      mockSignUp.mockResolvedValue({ data: fakeData, error: null })

      const result = await signupWithEmail({ email: 'a@b.com', password: 'pw' })

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pw',
      })
      expect(result).toEqual(fakeData)
    })

    it('throws on error', async () => {
      mockSignUp.mockResolvedValue({
        data: null,
        error: new Error('Email taken'),
      })

      await expect(
        signupWithEmail({ email: 'a@b.com', password: 'pw' }),
      ).rejects.toThrow('Email taken')
    })
  })

  // ── sendPasswordReset ─────────────────────────────────────────────────

  describe('sendPasswordReset', () => {
    it('resolves on success', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null })

      await expect(sendPasswordReset('a@b.com')).resolves.toBeUndefined()
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('a@b.com')
    })

    it('throws on error', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        error: new Error('Rate limited'),
      })

      await expect(sendPasswordReset('a@b.com')).rejects.toThrow('Rate limited')
    })
  })

  // ── logoutUser ────────────────────────────────────────────────────────

  describe('logoutUser', () => {
    it('resolves on success', async () => {
      mockSignOut.mockResolvedValue({ error: null })

      await expect(logoutUser()).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      mockSignOut.mockResolvedValue({ error: new Error('Network error') })

      await expect(logoutUser()).rejects.toThrow('Network error')
    })
  })

  // ── getSession ────────────────────────────────────────────────────────

  describe('getSession', () => {
    it('returns session on success', async () => {
      const fakeSession = { access_token: 'tok', user: { id: '1' } }
      mockGetSession.mockResolvedValue({
        data: { session: fakeSession },
        error: null,
      })

      const result = await getSession()

      expect(result).toEqual(fakeSession)
    })

    it('returns null when no session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await getSession()

      expect(result).toBeNull()
    })

    it('throws on error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Expired'),
      })

      await expect(getSession()).rejects.toThrow('Expired')
    })
  })
})
