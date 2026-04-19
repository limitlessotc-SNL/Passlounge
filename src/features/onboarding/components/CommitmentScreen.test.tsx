/**
 * CommitmentScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useStudentStore } from '@/store/studentStore'

// Mock the student service to avoid Supabase env requirement
vi.mock('../services/student.service', () => ({
  upsertStudent: vi.fn().mockResolvedValue({ id: '1' }),
  saveOnboardingToAuth: vi.fn().mockResolvedValue(undefined),
}))

import { CommitmentScreen } from './CommitmentScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <CommitmentScreen />
    </MemoryRouter>,
  )
}

describe('CommitmentScreen', () => {
  afterEach(() => {
    useStudentStore.getState().reset()
  })

  it('renders step 4 progress and title', () => {
    renderScreen()

    expect(screen.getAllByText(/step 4 of 5/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/how much can/i)).toBeInTheDocument()
  })

  it('renders all 3 commitment options', () => {
    renderScreen()

    expect(screen.getByText('Busy But Committed')).toBeInTheDocument()
    expect(screen.getByText('Steady And Focused')).toBeInTheDocument()
    expect(screen.getByText('All In')).toBeInTheDocument()
  })

  it('renders back button', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('sets dailyCards to 25 when "Busy But Committed" is clicked', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText('Busy But Committed'))

    expect(useStudentStore.getState().dailyCards).toBe(25)
  })

  it('sets dailyCards to 50 when "All In" is clicked', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText('All In'))

    expect(useStudentStore.getState().dailyCards).toBe(50)
  })

  it('shows projected days for each option', () => {
    renderScreen()

    expect(screen.getByText(/80 days/)).toBeInTheDocument()
    expect(screen.getByText(/58 days/)).toBeInTheDocument()
    expect(screen.getByText(/40 days/)).toBeInTheDocument()
  })
})
