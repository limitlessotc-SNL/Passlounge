/**
 * TesterTypeScreen unit tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStudentStore } from '@/store/studentStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { TesterTypeScreen } from './TesterTypeScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <TesterTypeScreen />
    </MemoryRouter>,
  )
}

describe('TesterTypeScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    useStudentStore.getState().setNickname('TestNurse')
  })

  afterEach(() => {
    useStudentStore.getState().reset()
  })

  it('renders step 1 progress and title', () => {
    renderScreen()

    expect(screen.getAllByText(/step 1 of 5/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/is this your/i)).toBeInTheDocument()
    expect(screen.getByText(/first time at/i)).toBeInTheDocument()
  })

  it('renders both tester type options', () => {
    renderScreen()

    expect(screen.getByText(/coming back stronger/i)).toBeInTheDocument()
    expect(screen.getByText(/first timer/i)).toBeInTheDocument()
  })

  it('displays nickname in subtitle', () => {
    renderScreen()

    expect(screen.getByText(/nurse testnurse/i)).toBeInTheDocument()
  })

  it('sets testerType to repeat when "Coming Back" is clicked', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/coming back stronger/i))

    expect(useStudentStore.getState().testerType).toBe('repeat')
  })

  it('sets testerType to first_time when "First Timer" is clicked', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/first timer/i))

    expect(useStudentStore.getState().testerType).toBe('first_time')
  })

  it('repeat testers are routed into the CPR upload flow', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/coming back stronger/i))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cpr/upload?from=onboarding')
    })
  })

  it('first-timers skip straight to confidence', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText(/first timer/i))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding/confidence')
    })
  })
})
