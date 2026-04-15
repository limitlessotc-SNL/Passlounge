/**
 * SignupScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock useAuth ─────────────────────────────────────────────────────────

const mockSignup = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signup: mockSignup,
    error: null,
    isSubmitting: false,
  }),
}))

import { SignupScreen } from './SignupScreen'

function renderSignup() {
  return render(
    <MemoryRouter>
      <SignupScreen />
    </MemoryRouter>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('SignupScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders signup form', () => {
    renderSignup()

    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeInTheDocument()
  })

  it('renders sign-in link', () => {
    renderSignup()

    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('calls signup when passwords match', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByLabelText(/^email$/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(mockSignup).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'password123',
    })
  })

  it('shows mismatch error when passwords differ', async () => {
    const user = userEvent.setup()
    renderSignup()

    await user.type(screen.getByLabelText(/^email$/i), 'new@test.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'different')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mockSignup).not.toHaveBeenCalled()
  })
})
