/**
 * StudyTab unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useDashboardStore } from '@/store/dashboardStore'
import { useSessionStore } from '@/store/sessionStore'
import type { SessionSnapshot, StudyCard } from '@/types'

// Mock cards.service (transitively imported via SessionSetup) to avoid Supabase env
vi.mock('@/features/session/services/cards.service', () => ({
  fetchStudyCards: vi.fn().mockResolvedValue([]),
}))

import { StudyTab } from './StudyTab'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

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

const makeSnapshot = (id: number): SessionSnapshot => ({
  id,
  name: `Session ${id}`,
  mode: 'test',
  date: 'Apr 18',
  categories: 'Cardiac',
  correct: 8,
  wrong: 2,
  total: 10,
  pct: 80,
  cards: [makeCard(`c${id}-1`), makeCard(`c${id}-2`)],
  results: [true, false],
  answers: [0, 1],
  shuffles: [],
})

function renderTab() {
  return render(
    <MemoryRouter>
      <StudyTab />
    </MemoryRouter>,
  )
}

describe('StudyTab', () => {
  afterEach(() => {
    vi.clearAllMocks()
    useSessionStore.getState().reset()
    useDashboardStore.setState({
      diagnosticResult: { completed: false, correct: 0, total: 0, catLevel: '—', results: [] },
      sessionHistory: [],
      plStats: { cards: 0, xp: 50, sessions: 0 },
      streakDays: 1,
      seenCardTitles: {},
    })
  })

  it('renders Study title', () => {
    renderTab()
    expect(screen.getByText('Study')).toBeInTheDocument()
  })

  it('renders toggle buttons', () => {
    renderTab()
    expect(screen.getByText('Start Session')).toBeInTheDocument()
    expect(screen.getByText('My Progress')).toBeInTheDocument()
  })

  it('defaults to Start Session view', () => {
    renderTab()
    expect(screen.getByText(/step 1 — mode/i)).toBeInTheDocument()
  })

  it('switches to My Progress view on click', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))

    expect(screen.getByText('Card Bank')).toBeInTheDocument()
    expect(screen.getByText('Session History')).toBeInTheDocument()
  })

  it('switches back to Start Session view', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))
    await user.click(screen.getByText('Start Session'))

    expect(screen.getByText(/step 1 — mode/i)).toBeInTheDocument()
  })

  it('Start Session toggle has active class by default', () => {
    renderTab()
    const startBtn = screen.getByText('Start Session')
    expect(startBtn.className).toContain('active')
  })

  it('My Progress toggle has inactive class by default', () => {
    renderTab()
    const progressBtn = screen.getByText('My Progress')
    expect(progressBtn.className).toContain('inactive')
  })

  it('shows empty session history in progress view', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))

    expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument()
  })

  it('shows card bank progress in progress view', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))

    expect(screen.getByText('Study Cards')).toBeInTheDocument()
    expect(screen.getByText('0 seen')).toBeInTheDocument()
  })

  it('hides session setup when progress view active', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))

    expect(screen.queryByText(/step 1 — mode/i)).not.toBeInTheDocument()
  })

  it('hides card bank when start session view active', () => {
    renderTab()

    expect(screen.queryByText('Card Bank')).not.toBeInTheDocument()
  })

  it('displays session history entries in progress view', async () => {
    useDashboardStore.setState({ sessionHistory: [makeSnapshot(1)] })
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))

    expect(screen.getByText('Session 1')).toBeInTheDocument()
    expect(screen.getByText('Review Session →')).toBeInTheDocument()
  })

  it('clicking Review Session restores session and navigates', async () => {
    const snap = makeSnapshot(1)
    useDashboardStore.setState({ sessionHistory: [snap] })
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))
    await user.click(screen.getByText('Review Session →'))

    expect(useSessionStore.getState().cards).toEqual(snap.cards)
    expect(useSessionStore.getState().results).toEqual(snap.results)
    expect(useSessionStore.getState().sessionName).toBe('Session 1')
    expect(mockNavigate).toHaveBeenCalledWith('/session/review')
  })

  it('restoring session sets correct + wrong counts', async () => {
    const snap = makeSnapshot(1)
    useDashboardStore.setState({ sessionHistory: [snap] })
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))
    await user.click(screen.getByText('Review Session →'))

    expect(useSessionStore.getState().correctCount).toBe(8)
    expect(useSessionStore.getState().wrongCount).toBe(2)
  })

  it('restored session is not marked active (review only)', async () => {
    const snap = makeSnapshot(1)
    useDashboardStore.setState({ sessionHistory: [snap] })
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText('My Progress'))
    await user.click(screen.getByText('Review Session →'))

    expect(useSessionStore.getState().isActive).toBe(false)
  })
})
