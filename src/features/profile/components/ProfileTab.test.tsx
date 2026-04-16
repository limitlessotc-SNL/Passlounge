/**
 * ProfileTab unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'

// Mock useAuth
const mockLogout = vi.fn()

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}))

import { ProfileTab } from './ProfileTab'

function renderTab() {
  return render(
    <MemoryRouter>
      <ProfileTab />
    </MemoryRouter>,
  )
}

describe('ProfileTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'u1', email: 'nurse@test.com' },
      isAuthenticated: true,
      isLoading: false,
    })
    useStudentStore.getState().setNickname('Keisha')
    useStudentStore.getState().setDailyCards(35)
  })

  afterEach(() => {
    useAuthStore.getState().logout()
    useStudentStore.getState().reset()
  })

  it('renders Profile header', () => {
    renderTab()

    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('renders nickname', () => {
    renderTab()

    expect(screen.getByText('Nurse Keisha')).toBeInTheDocument()
  })

  it('renders initial in avatar', () => {
    renderTab()

    expect(screen.getByText('K')).toBeInTheDocument()
  })

  it('renders email', () => {
    renderTab()

    expect(screen.getByText('nurse@test.com')).toBeInTheDocument()
  })

  it('renders daily commitment', () => {
    renderTab()

    expect(screen.getByText('Daily Commitment')).toBeInTheDocument()
    expect(screen.getByText('35 cards/day')).toBeInTheDocument()
  })

  it('renders projected test-ready date', () => {
    renderTab()

    expect(screen.getByText('Projected Test-Ready')).toBeInTheDocument()
    // Should render a date string like "Jun 12, 2026"
    const dateEl = screen.getByText(/\w+ \d+, \d{4}/)
    expect(dateEl).toBeInTheDocument()
  })

  it('renders coming soon section', () => {
    renderTab()

    expect(screen.getByText(/badges, xp history/i)).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })

  it('renders sign out button', () => {
    renderTab()

    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('calls logout when sign out is clicked', async () => {
    mockLogout.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Sign Out'))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('renders default initial when no nickname', () => {
    useStudentStore.getState().setNickname('')
    renderTab()

    expect(screen.getByText('N')).toBeInTheDocument()
  })

  it('renders default nickname when empty', () => {
    useStudentStore.getState().setNickname('')
    renderTab()

    expect(screen.getByText('Nurse Nurse')).toBeInTheDocument()
  })
})
