/**
 * ProfileTab unit tests
 */

import { render, screen, waitFor } from '@testing-library/react'
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

// Mock student.service for edit mode
vi.mock('@/features/onboarding/services/student.service', () => ({
  upsertStudent: vi.fn().mockResolvedValue({ id: 'u1' }),
  saveOnboardingToAuth: vi.fn().mockResolvedValue(undefined),
}))

import {
  saveOnboardingToAuth,
  upsertStudent,
} from '@/features/onboarding/services/student.service'

import { ProfileTab } from './ProfileTab'

const mockUpsert = vi.mocked(upsertStudent)
const mockSaveAuth = vi.mocked(saveOnboardingToAuth)

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
      supaStudentId: 'u1',
      isAuthenticated: true,
      isLoading: false,
    })
    useStudentStore.getState().setNickname('Keisha')
    useStudentStore.getState().setDailyCards(35)
    useStudentStore.getState().setTestDate(null, 0)
    useStudentStore.getState().setTesterType('first_time')
    useStudentStore.getState().setConfidence('confident')
  })

  afterEach(() => {
    useAuthStore.getState().logout()
    useStudentStore.getState().reset()
  })

  // ── View mode ─────────────────────────────────────────────────────

  it('renders Profile header', () => {
    renderTab()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('renders nickname', () => {
    renderTab()
    expect(screen.getAllByText(/nurse keisha/i).length).toBeGreaterThanOrEqual(1)
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

  it('renders Test Date "Not set" when no date', () => {
    renderTab()
    expect(screen.getByText('Test Date')).toBeInTheDocument()
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('renders test date when set', () => {
    useStudentStore.getState().setTestDate('2026-07-15', 85)
    renderTab()
    expect(screen.getByText('2026-07-15')).toBeInTheDocument()
  })

  it('renders projected test-ready date', () => {
    renderTab()
    expect(screen.getByText('Projected Test-Ready')).toBeInTheDocument()
    const dateEl = screen.getByText(/\w+ \d+, \d{4}/)
    expect(dateEl).toBeInTheDocument()
  })

  it('renders coming soon section', () => {
    renderTab()
    expect(screen.getByText(/badges, xp history/i)).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })

  it('renders Edit Profile button', () => {
    renderTab()
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
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

  // ── Edit mode toggle ──────────────────────────────────────────────

  it('clicking Edit Profile enters edit mode', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))

    expect(screen.getByText('Save Changes')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('edit mode shows nickname input', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))

    const input = screen.getByPlaceholderText(/nurse keisha/i) as HTMLInputElement
    expect(input.value).toBe('Keisha')
  })

  it('edit mode shows daily commitment presets', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))

    expect(screen.getByRole('button', { name: '25' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '35' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '50' })).toBeInTheDocument()
  })

  it('edit mode shows current daily cards as selected', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))

    const btn35 = screen.getByRole('button', { name: '35' })
    expect(btn35.className).toContain('selected')
  })

  it('edit mode shows test date input', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))

    expect(screen.getByLabelText(/test date/i)).toBeInTheDocument()
  })

  it('edit mode hides view-mode settings card', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))

    expect(screen.queryByText('35 cards/day')).not.toBeInTheDocument()
  })

  // ── Cancel flow ───────────────────────────────────────────────────

  it('clicking Cancel reverts to view mode', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    await user.click(screen.getByText('Cancel'))

    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
  })

  it('Cancel does not save changes', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    const input = screen.getByPlaceholderText(/nurse keisha/i)
    await user.clear(input)
    await user.type(input, 'Changed')
    await user.click(screen.getByText('Cancel'))

    expect(useStudentStore.getState().nickname).toBe('Keisha')
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  // ── Save flow ─────────────────────────────────────────────────────

  it('Save writes new nickname to store', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    const input = screen.getByPlaceholderText(/nurse keisha/i)
    await user.clear(input)
    await user.type(input, 'Jamal')
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(useStudentStore.getState().nickname).toBe('Jamal')
    })
  })

  it('Save writes new daily commitment to store', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    await user.click(screen.getByRole('button', { name: '50' }))
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(useStudentStore.getState().dailyCards).toBe(50)
    })
  })

  it('Save writes new test date to store', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    const dateInput = screen.getByLabelText(/test date/i) as HTMLInputElement
    await user.clear(dateInput)
    await user.type(dateInput, '2026-08-01')
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(useStudentStore.getState().testDate).toBe('2026-08-01')
    })
  })

  it('Save calls upsertStudent with updated values', async () => {
    mockUpsert.mockResolvedValue({
      id: 'u1',
      nickname: 'Jamal',
      tester_type: 'first_time',
      confidence: 'confident',
      test_date: null,
      daily_cards: 50,
      onboarded: true,
    })
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    const input = screen.getByPlaceholderText(/nurse keisha/i)
    await user.clear(input)
    await user.type(input, 'Jamal')
    await user.click(screen.getByRole('button', { name: '50' }))
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'u1',
          nickname: 'Jamal',
          daily_cards: 50,
          onboarded: true,
        }),
      )
    })
  })

  it('Save calls saveOnboardingToAuth to persist auth metadata', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(mockSaveAuth).toHaveBeenCalled()
    })
  })

  it('Save returns to view mode on success', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    })
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument()
  })

  it('trimmed empty nickname becomes "Nurse"', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    const input = screen.getByPlaceholderText(/nurse keisha/i)
    await user.clear(input)
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(useStudentStore.getState().nickname).toBe('Nurse')
    })
  })

  // ── Error states ──────────────────────────────────────────────────

  it('shows error when upsertStudent fails', async () => {
    mockUpsert.mockRejectedValue(new Error('Network down'))
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText(/network down/i)).toBeInTheDocument()
    })
  })

  it('stays in edit mode when save fails', async () => {
    mockUpsert.mockRejectedValue(new Error('Nope'))
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText(/nope/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('shows error when no student id (not signed in)', async () => {
    useAuthStore.setState({ supaStudentId: null })
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText(/not signed in/i)).toBeInTheDocument()
    })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('disables buttons while saving', async () => {
    // Create a promise we control to freeze saving state
    let resolve!: () => void
    mockUpsert.mockImplementation(() => new Promise<never>((r) => { resolve = r as unknown as () => void }))
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('Edit Profile'))
    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText(/saving/i)).toBeInTheDocument()
    })
    const cancelBtn = screen.getByText('Cancel') as HTMLButtonElement
    expect(cancelBtn.disabled).toBe(true)

    // Let it complete for cleanup
    resolve()
  })
})
