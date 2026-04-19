/**
 * AvatarScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useStudentStore } from '@/store/studentStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { AvatarScreen } from './AvatarScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <AvatarScreen />
    </MemoryRouter>,
  )
}

describe('AvatarScreen', () => {
  afterEach(() => {
    mockNavigate.mockReset()
    useStudentStore.getState().reset()
  })

  it('renders step 5 of 5 progress label', () => {
    renderScreen()
    expect(screen.getAllByText(/step 5 of 5/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders screen title', () => {
    renderScreen()
    expect(screen.getByText(/pick your/i)).toBeInTheDocument()
  })

  it('renders preview with initial letter when no avatar and no nickname', () => {
    renderScreen()
    expect(screen.getByLabelText(/avatar preview/i).textContent).toBe('N')
  })

  it('preview uses first letter of nickname when default avatar', () => {
    useStudentStore.getState().setNickname('Keisha')
    renderScreen()
    expect(screen.getByLabelText(/avatar preview/i).textContent).toBe('K')
  })

  it('renders picker radiogroup with options', () => {
    renderScreen()
    expect(screen.getByRole('radiogroup', { name: /choose an avatar/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /stethoscope/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /rocket/i })).toBeInTheDocument()
  })

  it('selecting an avatar updates the store and the preview', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('radio', { name: /rocket/i }))

    expect(useStudentStore.getState().avatar).toBe('rocket')
    expect(screen.getByLabelText(/avatar preview/i).textContent).toBe('🚀')
  })

  it('marks the selected avatar with aria-checked true', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('radio', { name: /champion/i }))

    expect(
      screen.getByRole('radio', { name: /champion/i }).getAttribute('aria-checked'),
    ).toBe('true')
  })

  it('Continue button navigates to /onboarding/plan', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/onboarding/plan')
  })

  it('Back button navigates to /onboarding/commitment', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/onboarding/commitment')
  })

  it('does not clear avatar when navigating back', async () => {
    useStudentStore.getState().setAvatar('fire')
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(useStudentStore.getState().avatar).toBe('fire')
  })
})
