// src/features/session/components/NGNSessionScreen.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/features/ngn/ngn.service', () => ({
  fetchAllNGNCards: vi.fn(),
}))

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}))

import { fetchAllNGNCards } from '@/features/ngn/ngn.service'
import type { NGNCard } from '@/features/ngn/ngn.types'
import { useAuthStore } from '@/store/authStore'

import { NGNSessionScreen } from './NGNSessionScreen'

const mockFetch = vi.mocked(fetchAllNGNCards)

const matrixCard: NGNCard = {
  id: 'mc1',
  title: 'Sepsis matrix',
  scenario: 'A 64yo patient with sepsis.',
  question: 'Classify each finding.',
  type: 'matrix',
  nclex_category: 'Physiological Adaptation',
  difficulty_level: 4,
  scoring_rule: '0/1',
  max_points: 2,
  content: {
    columns: ['Anticipated', 'Unanticipated'],
    rows: [
      { label: 'Fever',       correct_col: 0 },
      { label: 'Bradycardia', correct_col: 1 },
    ],
  },
  rationale: 'Sepsis presents with...',
  source: 'Saunders 8th ed.',
}

function renderAt(initial = '/session/ngn-play') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/session/ngn-play" element={<NGNSessionScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockReset()
  mockFetch.mockResolvedValue([matrixCard])
  useAuthStore.setState({
    user: { id: 'stu-1', email: 't@t.com' },
    supaStudentId: 'stu-1',
    token: 'tok',
    isAuthenticated: true,
    isLoading: false,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  useAuthStore.getState().logout()
})

describe('NGNSessionScreen', () => {
  it('renders the loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    renderAt()
    expect(screen.getByTestId('ngn-session-loading')).toBeTruthy()
  })

  it('shows the empty-pool error when no NGN cards exist', async () => {
    mockFetch.mockResolvedValue([])
    renderAt()
    await waitFor(() => {
      expect(screen.getByTestId('ngn-session-error')).toBeTruthy()
    })
    expect(screen.getByText(/No NGN cards available/i)).toBeTruthy()
  })

  it('shows the active card screen once cards load', async () => {
    renderAt()
    await waitFor(() => {
      expect(screen.getByTestId('ngn-session-screen')).toBeTruthy()
    })
    // The NGN card body renders inside, so the question text is visible.
    expect(screen.getByText(/Classify each finding/)).toBeTruthy()
  })

  it('renders the exit button and opens the exit modal', async () => {
    renderAt()
    await waitFor(() => screen.getByTestId('ngn-session-exit-btn'))
    fireEvent.click(screen.getByTestId('ngn-session-exit-btn'))
    // ExitModal is mounted; assert its confirmation title is present
    expect(screen.getByText(/Exit Session\?/i)).toBeTruthy()
  })

  it('reads the count param and caps to pool size', async () => {
    mockFetch.mockResolvedValue([matrixCard, { ...matrixCard, id: 'mc2', title: 'b' }])
    renderAt('/session/ngn-play?count=20')
    // Pool only has 2 cards so the HUD shows 1 / 2
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeTruthy()
    })
  })

  it('reads mode=test param and renders without the study HUD', async () => {
    renderAt('/session/ngn-play?mode=test')
    await waitFor(() => screen.getByTestId('ngn-session-screen'))
    // Test mode hides the per-question correct/wrong/points HUD
    expect(screen.queryByText(/✓ 0/)).toBeNull()
  })

  it('shows the study HUD by default', async () => {
    renderAt()
    await waitFor(() => screen.getByTestId('ngn-session-screen'))
    expect(screen.getByText(/✓ 0/)).toBeTruthy()
  })

  it('Back to dashboard from error screen navigates to /', async () => {
    mockFetch.mockResolvedValue([])
    renderAt()
    await waitFor(() => screen.getByTestId('ngn-session-error'))
    fireEvent.click(screen.getByText(/Back to dashboard/i))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
