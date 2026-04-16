/**
 * TesterTypeScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useStudentStore } from '@/store/studentStore'

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
    useStudentStore.getState().setNickname('TestNurse')
  })

  afterEach(() => {
    useStudentStore.getState().reset()
  })

  it('renders step 1 progress and title', () => {
    renderScreen()

    expect(screen.getAllByText(/step 1 of 4/i).length).toBeGreaterThanOrEqual(1)
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
})
