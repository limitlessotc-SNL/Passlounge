/**
 * HomeTab unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDashboardStore } from '@/store/dashboardStore'
import { useStudentStore } from '@/store/studentStore'

import { HomeTab } from './HomeTab'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderTab() {
  return render(
    <MemoryRouter>
      <HomeTab />
    </MemoryRouter>,
  )
}

describe('HomeTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStudentStore.getState().setNickname('Keisha')
  })

  afterEach(() => {
    useStudentStore.getState().reset()
    useDashboardStore.setState({
      diagnosticResult: { completed: false, correct: 0, total: 0, catLevel: '—', results: [] },
      sessionHistory: [],
      plStats: { cards: 0, xp: 50, sessions: 0 },
      streakDays: 1,
      seenCardTitles: {},
    })
  })

  it('renders greeting with nickname', () => {
    renderTab()

    expect(screen.getByText(/nurse keisha/i)).toBeInTheDocument()
  })

  it('renders streak pill', () => {
    renderTab()

    expect(screen.getByText(/1 day streak/i)).toBeInTheDocument()
  })

  it('renders CAT score card', () => {
    renderTab()

    expect(screen.getByText('Your CAT Score')).toBeInTheDocument()
  })

  it('renders stats grid', () => {
    renderTab()

    expect(screen.getByText('Cards Studied')).toBeInTheDocument()
    expect(screen.getByText('XP Earned')).toBeInTheDocument()
  })

  it('renders strengths/weaknesses section', () => {
    renderTab()

    expect(screen.getByText('Strengths & Weaknesses')).toBeInTheDocument()
  })

  it('renders todays focus section', () => {
    renderTab()

    expect(screen.getByText("Today's Focus")).toBeInTheDocument()
  })

  it('renders "Start Diagnostic" when not completed', () => {
    renderTab()

    expect(screen.getByText(/start diagnostic/i)).toBeInTheDocument()
  })

  it('navigates to /diagnostic/info when diagnostic not completed', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText(/start diagnostic/i))

    expect(mockNavigate).toHaveBeenCalledWith('/diagnostic/info')
  })

  it('renders "Start Session" when diagnostic completed', () => {
    useDashboardStore.setState({
      diagnosticResult: { completed: true, correct: 10, total: 15, catLevel: '3.5', results: [] },
    })
    renderTab()

    expect(screen.getByText(/start session/i)).toBeInTheDocument()
  })

  it('navigates to /study when diagnostic completed (full setup flow)', async () => {
    useDashboardStore.setState({
      diagnosticResult: { completed: true, correct: 10, total: 15, catLevel: '3.5', results: [] },
    })
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByText(/start session/i))

    expect(mockNavigate).toHaveBeenCalledWith('/study')
  })

  it('shows view diagnostic results button when completed', () => {
    useDashboardStore.setState({
      diagnosticResult: { completed: true, correct: 10, total: 15, catLevel: '3.5', results: [] },
    })
    renderTab()

    expect(screen.getByText(/view my diagnostic results/i)).toBeInTheDocument()
  })

  it('does not show diagnostic results button when not completed', () => {
    renderTab()

    expect(screen.queryByText(/view my diagnostic results/i)).not.toBeInTheDocument()
  })

  it('renders placeholder text when diagnostic not completed', () => {
    renderTab()

    expect(screen.getAllByText(/complete your diagnostic/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders dash for accuracy when not completed', () => {
    renderTab()

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('renders XP from plStats', () => {
    useDashboardStore.setState({ plStats: { cards: 25, xp: 550, sessions: 3 } })
    renderTab()

    expect(screen.getByText('550')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders custom streak count', () => {
    useDashboardStore.setState({ streakDays: 7 })
    renderTab()

    expect(screen.getByText(/7 day streak/i)).toBeInTheDocument()
  })
})
