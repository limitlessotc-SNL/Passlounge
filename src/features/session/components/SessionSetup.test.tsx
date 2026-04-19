/**
 * SessionSetup unit tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDashboardStore } from '@/store/dashboardStore'
import { useSessionStore } from '@/store/sessionStore'
import type { StudyCard } from '@/types'

// Mock cards.service so we don't hit Supabase in tests
vi.mock('@/features/session/services/cards.service', () => ({
  fetchStudyCards: vi.fn(),
}))

import { fetchStudyCards } from '@/features/session/services/cards.service'

import { SessionSetup } from './SessionSetup'

const mockFetch = vi.mocked(fetchStudyCards)

const makeCard = (id: string, cat = 'Cardiac'): StudyCard => ({
  id,
  cat,
  bloom: 'Apply',
  xp: 20,
  title: `Card ${id}`,
  type: 'MC',
  scenario: 'Scenario',
  question: 'Q?',
  opts: ['A', 'B', 'C', 'D'],
  correct: 0,
  layers: ['L1', 'L2', 'L3', 'L4'],
  lens: '',
  pearl: '',
  mnemonic: [],
  why_wrong: {},
})

function renderSetup() {
  return render(
    <MemoryRouter>
      <SessionSetup />
    </MemoryRouter>,
  )
}

describe('SessionSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return 20 cards so start flow succeeds
    mockFetch.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => makeCard(`card-${i}`)),
    )
  })

  afterEach(() => {
    useSessionStore.getState().reset()
    useDashboardStore.setState({
      diagnosticResult: { completed: false, correct: 0, total: 0, catLevel: '—', results: [] },
      sessionHistory: [],
      plStats: { cards: 0, xp: 50, sessions: 0 },
      streakDays: 1,
      seenCardTitles: {},
    })
  })

  it('renders Step 1 Mode section', () => {
    renderSetup()
    expect(screen.getByText(/step 1 — mode/i)).toBeInTheDocument()
  })

  it('renders Test Mode and Study Mode cards', () => {
    renderSetup()
    expect(screen.getByText('Test Mode')).toBeInTheDocument()
    expect(screen.getByText('Study Mode')).toBeInTheDocument()
  })

  it('renders Step 2 Questions section', () => {
    renderSetup()
    expect(screen.getByText(/step 2 — questions/i)).toBeInTheDocument()
  })

  it('renders question count buttons (10, 20, 30, Custom)', () => {
    renderSetup()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('renders Step 3 Card Pool section', () => {
    renderSetup()
    expect(screen.getByText(/step 3 — card pool/i)).toBeInTheDocument()
  })

  it('renders all 3 pool options', () => {
    renderSetup()
    expect(screen.getByText('All Cards')).toBeInTheDocument()
    expect(screen.getByText('New Cards Only')).toBeInTheDocument()
    expect(screen.getByText('Missed Cards Only')).toBeInTheDocument()
  })

  it('renders start button', () => {
    renderSetup()
    expect(screen.getByText(/start test mode/i)).toBeInTheDocument()
  })

  it('switches mode to study on click', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Study Mode'))

    expect(useSessionStore.getState().mode).toBe('study')
    expect(screen.getByText(/start study mode/i)).toBeInTheDocument()
  })

  it('switches mode back to test', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Study Mode'))
    await user.click(screen.getByText('Test Mode'))

    expect(useSessionStore.getState().mode).toBe('test')
  })

  it('sets question count to 20 on click', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('20'))

    expect(useSessionStore.getState().qCount).toBe(20)
  })

  it('shows custom input when Custom is clicked', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Custom'))

    expect(screen.getByPlaceholderText(/enter number/i)).toBeInTheDocument()
  })

  it('sets pool to new on click', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('New Cards Only'))

    expect(useSessionStore.getState().pool).toBe('new')
  })

  it('sets pool to missed on click', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Missed Cards Only'))

    expect(useSessionStore.getState().pool).toBe('missed')
  })

  it('renders limit note for test mode', () => {
    renderSetup()
    expect(screen.getByText(/max 75 for test mode/i)).toBeInTheDocument()
  })

  it('renders limit note for study mode after switch', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Study Mode'))

    expect(screen.getByText(/max 30 for study mode/i)).toBeInTheDocument()
  })

  it('test mode card has mode tags', () => {
    renderSetup()
    expect(screen.getByText('Fast Paced')).toBeInTheDocument()
    expect(screen.getByText('No CCCC')).toBeInTheDocument()
  })

  it('study mode card has mode tags', () => {
    renderSetup()
    expect(screen.getByText('Full CCCC')).toBeInTheDocument()
    expect(screen.getByText("Coach's Pearl")).toBeInTheDocument()
  })

  it('clicking start opens session name modal (does not navigate immediately)', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText(/start test mode/i))

    expect(screen.getByText('Name This Session')).toBeInTheDocument()
  })

  it('clicking Skip in modal sets empty session name', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText(/start test mode/i))
    await user.click(screen.getByText('Skip'))

    expect(useSessionStore.getState().sessionName).toBe('')
  })

  it('clicking Start in modal with name sets session name', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText(/start test mode/i))
    await user.type(screen.getByPlaceholderText(/week 2 review/i), 'My Session')
    await user.click(screen.getByText('Start →'))

    await waitFor(() => {
      expect(useSessionStore.getState().sessionName).toBe('My Session')
    })
  })

  it('loads cards into session store after confirming name', async () => {
    const user = userEvent.setup()
    renderSetup()

    // Set count to 10
    await user.click(screen.getByText('10'))
    await user.click(screen.getByText(/start test mode/i))
    await user.click(screen.getByText('Skip'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(useSessionStore.getState().cards.length).toBe(10)
    })
    expect(useSessionStore.getState().isActive).toBe(true)
    expect(useSessionStore.getState().isDiagnostic).toBe(false)
  })

  it('limits cards to qCount even if more are available', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('10'))
    await user.click(screen.getByText(/start test mode/i))
    await user.click(screen.getByText('Skip'))

    await waitFor(() => {
      expect(useSessionStore.getState().cards.length).toBe(10)
    })
  })

  it('caps cards at available count when fewer than qCount exist', async () => {
    mockFetch.mockResolvedValue([makeCard('1'), makeCard('2'), makeCard('3')])
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('20'))
    await user.click(screen.getByText(/start test mode/i))
    await user.click(screen.getByText('Skip'))

    await waitFor(() => {
      expect(useSessionStore.getState().cards.length).toBe(3)
    })
  })

  it('shows error when no cards returned', async () => {
    mockFetch.mockResolvedValue([])
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText(/start test mode/i))
    await user.click(screen.getByText('Skip'))

    await waitFor(() => {
      expect(screen.getByText(/no cards available/i)).toBeInTheDocument()
    })
    expect(useSessionStore.getState().cards.length).toBe(0)
  })

  it('shows error when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText(/start test mode/i))
    await user.click(screen.getByText('Skip'))

    await waitFor(() => {
      expect(screen.getByText(/failed to load cards/i)).toBeInTheDocument()
    })
  })
})
