/**
 * AuthProvider unit tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'

// ─── Mock Supabase ────────────────────────────────────────────────────────

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (_cb: unknown) => mockOnAuthStateChange(_cb),
    },
  },
}))

// Mock dataLoader — AuthProvider calls it on restore/sign-in
const mockLoadUserData = vi.fn().mockResolvedValue(undefined)
vi.mock('@/features/data/services/dataLoader.service', () => ({
  loadUserData: (id: string) => mockLoadUserData(id),
}))

import { AuthProvider } from './AuthProvider'

// ─── Tests ────────────────────────────────────────────────────────────────

describe('AuthProvider', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ isLoading: true, isAuthenticated: false, user: null, token: null, supaStudentId: null })
    useStudentStore.getState().reset()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  afterEach(() => {
    useAuthStore.getState().logout()
    useStudentStore.getState().reset()
  })

  it('renders children', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <div>App Content</div>
      </AuthProvider>,
    )

    expect(screen.getByText('App Content')).toBeInTheDocument()
  })

  it('restores session and sets auth state on mount', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-123',
            email: 'test@test.com',
            user_metadata: { nickname: 'Nurse Dev', onboarded: true, daily_cards: 25 },
          },
          access_token: 'tok-abc',
        },
      },
    })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    expect(useAuthStore.getState().user?.email).toBe('test@test.com')
    expect(useAuthStore.getState().token).toBe('tok-abc')
    expect(useAuthStore.getState().supaStudentId).toBe('user-123')
    expect(useStudentStore.getState().nickname).toBe('Nurse Dev')
    expect(useStudentStore.getState().onboarded).toBe(true)
    expect(useStudentStore.getState().dailyCards).toBe(25)
  })

  it('sets loading to false when no session found', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('sets loading to false when getSession throws', async () => {
    mockGetSession.mockRejectedValue(new Error('Network error'))

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  it('subscribes to onAuthStateChange', () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function))
  })

  it('unsubscribes on unmount', () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { unmount } = render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('handles auth state change to signed in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    // Simulate the onAuthStateChange callback
    const callback = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: { user: { id: string; email: string }; access_token: string } | null,
    ) => void

    callback('SIGNED_IN', {
      user: { id: 'new-user', email: 'new@test.com' },
      access_token: 'new-tok',
    })

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })

    expect(useAuthStore.getState().user?.id).toBe('new-user')
  })

  it('handles auth state change to signed out', async () => {
    // Start authenticated
    useAuthStore.getState().setUser({ id: '1', email: 'a@b.com' }, 'tok')
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    const callback = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: null,
    ) => void

    callback('SIGNED_OUT', null)

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  // ── Data loader integration ────────────────────────────────────────

  it('calls loadUserData after restoring session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-xyz', email: 'x@y.com', user_metadata: {} },
          access_token: 'tok',
        },
      },
    })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(mockLoadUserData).toHaveBeenCalledWith('user-xyz')
    })
  })

  it('does not call loadUserData when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    // Wait a tick for any async side effects
    await waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    expect(mockLoadUserData).not.toHaveBeenCalled()
  })

  it('calls loadUserData on SIGNED_IN event (fresh login)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    mockLoadUserData.mockClear()

    const callback = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: { user: { id: string; email: string }; access_token: string } | null,
    ) => void

    callback('SIGNED_IN', {
      user: { id: 'fresh-user', email: 'fresh@test.com' },
      access_token: 'tok',
    })

    expect(mockLoadUserData).toHaveBeenCalledWith('fresh-user')
  })

  it('does not call loadUserData on TOKEN_REFRESHED event', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    render(
      <AuthProvider>
        <div>App</div>
      </AuthProvider>,
    )

    mockLoadUserData.mockClear()

    const callback = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: { user: { id: string; email: string }; access_token: string } | null,
    ) => void

    callback('TOKEN_REFRESHED', {
      user: { id: 'same-user', email: 'x@y.com' },
      access_token: 'new-tok',
    })

    expect(mockLoadUserData).not.toHaveBeenCalled()
  })
})
