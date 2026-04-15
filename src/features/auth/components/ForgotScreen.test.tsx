/**
 * ForgotScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock useAuth ─────────────────────────────────────────────────────────

const mockForgotPassword = vi.fn()
let mockResetSent = false

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    forgotPassword: mockForgotPassword,
    error: null,
    isSubmitting: false,
    resetSent: mockResetSent,
  }),
}))

import { ForgotScreen } from './ForgotScreen'

function renderForgot() {
  return render(
    <MemoryRouter>
      <ForgotScreen />
    </MemoryRouter>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('ForgotScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResetSent = false
  })

  it('renders forgot password form', () => {
    renderForgot()

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send reset link/i }),
    ).toBeInTheDocument()
  })

  it('renders back to sign in link', () => {
    renderForgot()

    expect(screen.getByText(/back to sign in/i)).toBeInTheDocument()
  })

  it('calls forgotPassword on submit', async () => {
    const user = userEvent.setup()
    renderForgot()

    await user.type(screen.getByLabelText(/email/i), 'test@test.com')
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(mockForgotPassword).toHaveBeenCalledWith('test@test.com')
  })

  it('shows success message when resetSent is true', () => {
    mockResetSent = true
    renderForgot()

    expect(
      screen.getByText(/check your email for a password reset link/i),
    ).toBeInTheDocument()
  })
})
