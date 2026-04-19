/**
 * TestDateScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStudentStore } from '@/store/studentStore'

// Mock the student service to avoid Supabase env requirement
vi.mock('../services/student.service', () => ({
  upsertStudent: vi.fn().mockResolvedValue({ id: '1' }),
  saveOnboardingToAuth: vi.fn().mockResolvedValue(undefined),
}))

import { TestDateScreen } from './TestDateScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <TestDateScreen />
    </MemoryRouter>,
  )
}

describe('TestDateScreen', () => {
  beforeEach(() => {
    useStudentStore.getState().setNickname('TestNurse')
  })

  afterEach(() => {
    useStudentStore.getState().reset()
  })

  it('renders step 3 progress and title', () => {
    renderScreen()

    expect(screen.getAllByText(/step 3 of 5/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/when's test/i)).toBeInTheDocument()
  })

  it('renders date input', () => {
    renderScreen()

    const dateInput = document.querySelector('input[type="date"]')
    expect(dateInput).toBeInTheDocument()
  })

  it('renders back button', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('renders both navigation buttons', () => {
    renderScreen()

    expect(screen.getByText(/lock it in/i)).toBeInTheDocument()
    expect(screen.getByText(/don't have a date/i)).toBeInTheDocument()
  })

  it('displays nickname in title', () => {
    renderScreen()

    expect(screen.getByText('TestNurse')).toBeInTheDocument()
  })
})
