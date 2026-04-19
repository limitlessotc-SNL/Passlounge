/**
 * CPRCard unit tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useCPRStore } from '@/store/cprStore'
import type { CPRReport } from '@/types'

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

import { getLatestCPRReport } from '../services/cpr.service'
import { CPRCard } from './CPRCard'

const mockGetLatest = vi.mocked(getLatestCPRReport)

const sampleReport: CPRReport = {
  id: 'r-1',
  student_id: 'stu-1',
  attempt_date: '2026-02-15',
  overall_result: 'fail',
  image_path: null,
  categories: {
    management_of_care: 'below',
    safety_and_infection_control: 'above',
    health_promotion_and_maintenance: 'near',
    psychosocial_integrity: 'above',
    basic_care_and_comfort: 'below',
    pharmacological_and_parenteral_therapies: 'near',
    reduction_of_risk_potential: 'above',
    physiological_adaptation: 'near',
  },
  created_at: '2026-02-15T00:00:00Z',
}

function renderCard() {
  return render(
    <MemoryRouter>
      <CPRCard />
    </MemoryRouter>,
  )
}

describe('CPRCard', () => {
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

  it('renders empty state when no report exists', async () => {
    mockGetLatest.mockResolvedValue(null)

    renderCard()

    await waitFor(() => {
      expect(screen.getByTestId('cpr-card-empty')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /upload cpr/i })).toBeInTheDocument()
  })

  it('empty-state Upload button navigates to /cpr/upload', async () => {
    mockGetLatest.mockResolvedValue(null)
    const user = userEvent.setup()

    renderCard()

    await waitFor(() => screen.getByRole('button', { name: /upload cpr/i }))
    await user.click(screen.getByRole('button', { name: /upload cpr/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/cpr/upload')
  })

  it('renders weak-area chips when report has below-passing categories', async () => {
    mockGetLatest.mockResolvedValue(sampleReport)

    renderCard()

    await waitFor(() => {
      expect(screen.getByText(/focus areas/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Management')).toBeInTheDocument()
    expect(screen.getByText('Basic Care')).toBeInTheDocument()
  })

  it('renders strength chips when report has above-passing categories', async () => {
    mockGetLatest.mockResolvedValue(sampleReport)

    renderCard()

    await waitFor(() => {
      expect(screen.getByText(/strengths/i)).toBeInTheDocument()
    })
    expect(screen.getByText('Safety')).toBeInTheDocument()
    expect(screen.getByText('Psychosocial')).toBeInTheDocument()
  })

  it('shows attempt date in the header', async () => {
    mockGetLatest.mockResolvedValue(sampleReport)
    renderCard()
    await waitFor(() => {
      expect(screen.getByText('2026-02-15')).toBeInTheDocument()
    })
  })

  it('Re-upload button routes to the CPR flow without onboarding flag', async () => {
    mockGetLatest.mockResolvedValue(sampleReport)
    const user = userEvent.setup()
    renderCard()

    await waitFor(() => screen.getByRole('button', { name: /re-upload cpr/i }))
    await user.click(screen.getByRole('button', { name: /re-upload cpr/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/cpr/upload')
  })

  it('does not render anything while loading with no prior latest', () => {
    mockGetLatest.mockReturnValue(new Promise(() => { /* pending */ }))

    const { container } = renderCard()
    expect(container.querySelector('[data-testid="cpr-card-empty"]')).toBeNull()
    expect(container.querySelector('[data-testid="cpr-card"]')).toBeNull()
  })
})
