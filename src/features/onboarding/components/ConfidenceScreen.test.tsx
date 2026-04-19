/**
 * ConfidenceScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { useStudentStore } from '@/store/studentStore'

import { ConfidenceScreen } from './ConfidenceScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <ConfidenceScreen />
    </MemoryRouter>,
  )
}

describe('ConfidenceScreen', () => {
  afterEach(() => {
    useStudentStore.getState().reset()
  })

  it('renders step 2 progress and title', () => {
    renderScreen()

    expect(screen.getAllByText(/step 2 of 5/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/how are you/i)).toBeInTheDocument()
  })

  it('renders all 5 confidence options', () => {
    renderScreen()

    expect(screen.getByText('Terrified')).toBeInTheDocument()
    expect(screen.getByText('Nervous')).toBeInTheDocument()
    expect(screen.getByText('Unsure')).toBeInTheDocument()
    expect(screen.getByText('Confident')).toBeInTheDocument()
    expect(screen.getByText('Ready To Dominate')).toBeInTheDocument()
  })

  it('renders back button', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('sets confidence on click', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText('Confident'))

    expect(useStudentStore.getState().confidence).toBe('confident')
  })

  it('sets terrified on click', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText('Terrified'))

    expect(useStudentStore.getState().confidence).toBe('terrified')
  })
})
