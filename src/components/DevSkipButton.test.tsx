/**
 * DevSkipButton unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { useStudentStore } from '@/store/studentStore'

import { DevSkipButton } from './DevSkipButton'

function renderButton(enabled?: boolean) {
  return render(
    <MemoryRouter>
      <DevSkipButton enabled={enabled} />
    </MemoryRouter>,
  )
}

describe('DevSkipButton', () => {
  afterEach(() => {
    useAuthStore.getState().logout()
    useStudentStore.getState().reset()
    useDashboardStore.setState({
      diagnosticResult: { completed: false, correct: 0, total: 0, catLevel: '—', results: [] },
      sessionHistory: [],
      plStats: { cards: 0, xp: 50, sessions: 0 },
      streakDays: 1,
      seenCardTitles: {},
    })
  })

  it('renders when enabled is true', () => {
    renderButton(true)

    expect(screen.getByText('DEV')).toBeInTheDocument()
  })

  it('does not render when enabled is false', () => {
    const { container } = renderButton(false)

    expect(container.innerHTML).toBe('')
  })

  it('has dev-btn class', () => {
    renderButton(true)

    const btn = screen.getByText('DEV')
    expect(btn.className).toBe('dev-btn')
  })

  it('has descriptive title attribute', () => {
    renderButton(true)

    const btn = screen.getByText('DEV')
    expect(btn.getAttribute('title')).toMatch(/skip to dashboard/i)
  })

  it('sets mock user on click', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.id).toBe('dev-user-id')
    expect(useAuthStore.getState().user?.email).toBe('dev@passlounge.local')
  })

  it('sets authToken on click', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useAuthStore.getState().token).toBe('dev-mock-token')
  })

  it('sets loading to false on click', async () => {
    useAuthStore.setState({ isLoading: true })
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('marks student as onboarded on click', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useStudentStore.getState().onboarded).toBe(true)
  })

  it('sets mock nickname on click', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useStudentStore.getState().nickname).toBe('Dev')
  })

  it('sets mock daily cards on click', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useStudentStore.getState().dailyCards).toBe(35)
  })

  it('sets mock testerType on click', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useStudentStore.getState().testerType).toBe('first_time')
  })

  it('sets mock confidence on click', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useStudentStore.getState().confidence).toBe('confident')
  })

  it('sets diagnostic as completed on click', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useDashboardStore.getState().diagnosticResult.completed).toBe(true)
  })

  it('sets mock diagnostic results (10/15)', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    const d = useDashboardStore.getState().diagnosticResult
    expect(d.correct).toBe(10)
    expect(d.total).toBe(15)
    expect(d.catLevel).toBe('2.5')
  })

  it('sets mock diagnostic results array with 15 entries', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    const results = useDashboardStore.getState().diagnosticResult.results
    expect(results.length).toBe(15)
    expect(results.filter((r) => r === true).length).toBe(10)
    expect(results.filter((r) => r === false).length).toBe(5)
  })

  it('sets mock session stats', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    const stats = useDashboardStore.getState().plStats
    expect(stats.cards).toBe(45)
    expect(stats.xp).toBe(950)
    expect(stats.sessions).toBe(3)
  })

  it('sets mock streak days', async () => {
    const user = userEvent.setup()
    renderButton(true)

    await user.click(screen.getByText('DEV'))

    expect(useDashboardStore.getState().streakDays).toBe(4)
  })

  it('does not render DEV button in production-like environment', () => {
    const { container } = renderButton(false)

    expect(container.querySelector('.dev-btn')).toBeNull()
  })
})
