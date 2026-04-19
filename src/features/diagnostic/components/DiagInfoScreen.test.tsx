/**
 * DiagInfoScreen unit tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/store/sessionStore'
import type { StudyCard } from '@/types'

// Mock cards.service so we don't hit Supabase in tests
vi.mock('@/features/session/services/cards.service', () => ({
  fetchDiagnosticCards: vi.fn(),
}))

import { fetchDiagnosticCards } from '@/features/session/services/cards.service'

import { DiagInfoScreen } from './DiagInfoScreen'

const mockFetch = vi.mocked(fetchDiagnosticCards)

const makeCard = (id: string): StudyCard => ({
  id,
  cat: 'Cardiac',
  bloom: 'Apply',
  xp: 20,
  title: `Card ${id}`,
  type: 'MC',
  scenario: 'S',
  question: 'Q?',
  opts: ['A', 'B', 'C', 'D'],
  correct: 0,
  layers: ['L1', 'L2', 'L3', 'L4'],
  lens: '',
  pearl: '',
  mnemonic: [],
  why_wrong: {},
})

function renderScreen() {
  return render(
    <MemoryRouter>
      <DiagInfoScreen />
    </MemoryRouter>,
  )
}

describe('DiagInfoScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue(Array.from({ length: 15 }, (_, i) => makeCard(`d${i}`)))
  })

  afterEach(() => {
    useSessionStore.getState().reset()
  })

  it('renders diagnostic assessment header', () => {
    renderScreen()
    expect(screen.getByText('Diagnostic Assessment')).toBeInTheDocument()
  })

  it('renders title text', () => {
    renderScreen()
    expect(screen.getByText(/this is your/i)).toBeInTheDocument()
    expect(screen.getByText(/baseline test/i)).toBeInTheDocument()
  })

  it('renders description text', () => {
    renderScreen()
    expect(screen.getByText(/answer every question/i)).toBeInTheDocument()
  })

  it('renders 15 questions info', () => {
    renderScreen()
    expect(screen.getByText('15 Questions')).toBeInTheDocument()
    expect(screen.getByText(/across 5 clinical categories/i)).toBeInTheDocument()
  })

  it('renders test mode only info', () => {
    renderScreen()
    expect(screen.getByText('Test Mode Only')).toBeInTheDocument()
    expect(screen.getByText(/no cccc/i)).toBeInTheDocument()
  })

  it('renders one time only info', () => {
    renderScreen()
    expect(screen.getByText('One Time Only')).toBeInTheDocument()
    expect(screen.getByText(/this assessment never repeats/i)).toBeInTheDocument()
  })

  it('renders start button', () => {
    renderScreen()
    expect(screen.getByText(/i'm ready/i)).toBeInTheDocument()
  })

  it('renders honesty note', () => {
    renderScreen()
    expect(screen.getByText(/answer honestly/i)).toBeInTheDocument()
  })

  it('renders target emoji', () => {
    renderScreen()
    expect(screen.getByText('🎯')).toBeInTheDocument()
  })

  it('renders all 3 info icons', () => {
    renderScreen()
    expect(screen.getByText('📋')).toBeInTheDocument()
    expect(screen.getByText('⚡')).toBeInTheDocument()
    expect(screen.getByText('🔒')).toBeInTheDocument()
  })

  it('loads diagnostic cards into session store on click', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/i'm ready/i))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(useSessionStore.getState().cards.length).toBe(15)
    })
    expect(useSessionStore.getState().isActive).toBe(true)
    expect(useSessionStore.getState().isDiagnostic).toBe(true)
  })

  it('sets mode to test (diagnostic has no CCCC)', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/i'm ready/i))

    await waitFor(() => {
      expect(useSessionStore.getState().mode).toBe('test')
    })
  })

  it('shows error when no diagnostic cards', async () => {
    mockFetch.mockResolvedValue([])
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/i'm ready/i))

    await waitFor(() => {
      expect(screen.getByText(/no diagnostic cards available/i)).toBeInTheDocument()
    })
  })

  it('shows error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/i'm ready/i))

    await waitFor(() => {
      expect(screen.getByText(/failed to load diagnostic/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching', async () => {
    // Never-resolving promise to keep loading state visible
    mockFetch.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/i'm ready/i))

    expect(await screen.findByText(/loading cards/i)).toBeInTheDocument()
  })
})
