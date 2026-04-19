/**
 * CPRAnalysisScreen unit tests
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
}))

vi.mock('@/features/onboarding/services/student.service', () => ({
  upsertStudent: vi.fn().mockResolvedValue({ id: 'stu-1' }),
}))

import { getLatestCPRReport } from '../services/cpr.service'
import { CPRAnalysisScreen } from './CPRAnalysisScreen'

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

function renderScreen(initialPath = '/cpr/analysis') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CPRAnalysisScreen />
    </MemoryRouter>,
  )
}

describe('CPRAnalysisScreen', () => {
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

  // ── Empty state ───────────────────────────────────────────────────

  it('renders empty state when no CPR report exists', async () => {
    mockGetLatest.mockResolvedValue(null)
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText(/no cpr on file/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /upload cpr/i })).toBeInTheDocument()
  })

  it('empty-state Upload button navigates to /cpr/entry', async () => {
    mockGetLatest.mockResolvedValue(null)
    const user = userEvent.setup()
    renderScreen()

    await waitFor(() => screen.getByRole('button', { name: /upload cpr/i }))
    await user.click(screen.getByRole('button', { name: /upload cpr/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/cpr/entry')
  })

  // ── Populated ─────────────────────────────────────────────────────

  it('renders the breakdown heading and summary counts', async () => {
    useCPRStore.getState().setLatest(sampleReport)
    renderScreen()

    expect(screen.getByText(/what your results/i)).toBeInTheDocument()
    // 2 below, 3 near, 3 above in sampleReport
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
  })

  it('renders every NCSBN category with its overview', async () => {
    useCPRStore.getState().setLatest(sampleReport)
    renderScreen()

    // Overview paragraphs mention key concepts — sample a few
    expect(screen.getByText(/care coordination/i)).toBeInTheDocument()
    expect(screen.getByText(/medications, iv therapy/i)).toBeInTheDocument()
  })

  it('renders level-specific advice for each answered category', async () => {
    useCPRStore.getState().setLatest(sampleReport)
    renderScreen()

    // Every answered category should render a "What to do" block
    const adviceHeadings = screen.getAllByText(/what to do/i)
    expect(adviceHeadings.length).toBe(8)
  })

  it('Continue navigates to dashboard in non-onboarding mode', async () => {
    useCPRStore.getState().setLatest(sampleReport)
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /back to dashboard/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('Continue navigates to /onboarding/confidence when from=onboarding', async () => {
    useCPRStore.getState().setLatest(sampleReport)
    const user = userEvent.setup()
    renderScreen('/cpr/analysis?from=onboarding')

    await user.click(screen.getByRole('button', { name: /continue onboarding/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding/confidence')
  })

  it('auto-loads latest when store is empty and hook returns a row', async () => {
    mockGetLatest.mockResolvedValue(sampleReport)
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText(/what your results/i)).toBeInTheDocument()
    })
  })

  it('sorts categories weakest-first (below before near before above)', async () => {
    useCPRStore.getState().setLatest(sampleReport)
    renderScreen()

    // Find the two "Below" categories' labels and make sure they appear
    // before an "Above" category in document order.
    const managementEl = screen.getByText(/^management of care$/i)
    const safetyEl = screen.getByText(/^safety and infection control$/i)

    const bits = Array.from(document.querySelectorAll('*'))
    const mgmtIdx = bits.indexOf(managementEl)
    const safetyIdx = bits.indexOf(safetyEl)

    // Management (below) should appear before Safety (above)
    expect(mgmtIdx).toBeLessThan(safetyIdx)
  })
})
