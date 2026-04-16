/**
 * PlanRevealScreen unit tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'

vi.mock('../services/student.service', () => ({
  upsertStudent: vi.fn().mockResolvedValue({ id: '1', onboarded: true }),
  saveOnboardingToAuth: vi.fn().mockResolvedValue(undefined),
}))

import { PlanRevealScreen } from './PlanRevealScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <PlanRevealScreen />
    </MemoryRouter>,
  )
}

describe('PlanRevealScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({ supaStudentId: 'student-1', isAuthenticated: true, isLoading: false })
    useStudentStore.getState().setNickname('TestNurse')
    useStudentStore.getState().setDailyCards(35)
  })

  afterEach(() => {
    useStudentStore.getState().reset()
    useAuthStore.getState().logout()
  })

  it('renders welcome message with nickname', async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText(/nurse testnurse/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/you're in the lounge/i)).toBeInTheDocument()
  })

  it('renders XP burst', async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('+50 XP')).toBeInTheDocument()
    })
    expect(screen.getByText('Onboarding Complete!')).toBeInTheDocument()
  })

  it('renders stats grid with daily cards', async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('35')).toBeInTheDocument()
    })
    expect(screen.getByText('Cards Per Day')).toBeInTheDocument()
  })

  it('renders plan details', async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText('SNL Method')).toBeInTheDocument()
    })
  })

  it('renders coach pearl', async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText(/a note from your coach/i)).toBeInTheDocument()
    })
  })

  it('renders CTA button', async () => {
    renderScreen()

    await waitFor(() => {
      expect(screen.getByText(/start my diagnostic challenge/i)).toBeInTheDocument()
    })
  })
})
