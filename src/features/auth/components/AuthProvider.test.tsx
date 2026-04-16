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
})
