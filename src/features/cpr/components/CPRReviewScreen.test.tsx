/**
 * CPRReviewScreen unit tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CPR_CATEGORIES } from '@/config/cpr-categories'
import { useAuthStore } from '@/store/authStore'
import { useCPRStore } from '@/store/cprStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../services/cpr.service', () => ({
  getLatestCPRReport: vi.fn(),
  insertCPRReport: vi.fn(),
  uploadCPRPhoto: vi.fn(),
}))

import { insertCPRReport } from '../services/cpr.service'
import { CPRReviewScreen } from './CPRReviewScreen'

const mockInsert = vi.mocked(insertCPRReport)

function renderScreen(initialPath = '/cpr/review') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CPRReviewScreen />
    </MemoryRouter>,
  )
}

function fillAllCategories() {
  for (const c of CPR_CATEGORIES) {
    useCPRStore.getState().setCategoryResult(c.id, 'near')
  }
}

describe('CPRReviewScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'stu-1', email: 't@t.com' },
      supaStudentId: 'stu-1',
      isAuthenticated: true,
      isLoading: false,
    })
  })

  afterEach(() => {
    useCPRStore.setState({
      draft: { attempt_date: null, overall_result: null, image_path: null, categories: {} },
      latest: null,
      isLoading: false,
      isSaving: false,
      error: null,
    })
    useAuthStore.getState().logout()
  })

  it('renders summary title and 8 category rows', () => {
    fillAllCategories()
    renderScreen()

    expect(screen.getByText(/looks good\?/i)).toBeInTheDocument()
    for (const c of CPR_CATEGORIES) {
      expect(screen.getByText(c.label)).toBeInTheDocument()
    }
  })

  it('shows attempt date and overall result from draft', () => {
    useCPRStore.getState().setAttemptDate('2026-03-01')
    useCPRStore.getState().setOverallResult('fail')
    fillAllCategories()
    renderScreen()

    expect(screen.getByText('2026-03-01')).toBeInTheDocument()
    expect(screen.getByText('FAIL')).toBeInTheDocument()
  })

  it('shows "Not set" placeholders when draft values missing', () => {
    fillAllCategories()
    renderScreen()
    expect(screen.getAllByText(/not set/i).length).toBeGreaterThanOrEqual(2)
  })

  it('Save button is disabled when categories incomplete', () => {
    renderScreen()
    const btn = screen.getByRole('button', { name: /save cpr/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('Save calls insertCPRReport and navigates to / on success (non-onboarding)', async () => {
    fillAllCategories()
    mockInsert.mockResolvedValue({
      id: 'r-1', student_id: 'stu-1', attempt_date: null, overall_result: null,
      image_path: null, categories: {}, created_at: '2026-04-19',
    })
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /save cpr/i }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith('stu-1', expect.any(Object))
    })
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('Save navigates to /onboarding/confidence when from=onboarding', async () => {
    fillAllCategories()
    mockInsert.mockResolvedValue({
      id: 'r-1', student_id: 'stu-1', attempt_date: null, overall_result: null,
      image_path: null, categories: {}, created_at: '2026-04-19',
    })
    const user = userEvent.setup()
    renderScreen('/cpr/review?from=onboarding')

    await user.click(screen.getByRole('button', { name: /save cpr/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding/confidence')
    })
  })

  it('shows error message when insert fails', async () => {
    fillAllCategories()
    mockInsert.mockRejectedValue(new Error('DB down'))
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /save cpr/i }))

    await waitFor(() => {
      expect(screen.getByText(/db down/i)).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('Back navigates to /cpr/entry (preserves onboarding query)', async () => {
    const user = userEvent.setup()
    renderScreen('/cpr/review?from=onboarding')

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/cpr/entry?from=onboarding')
  })
})
