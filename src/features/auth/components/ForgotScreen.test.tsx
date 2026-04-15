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

    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send reset link/i }),
    ).toBeInTheDocument()
  })

  it('renders back button and title', () => {
    renderForgot()

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    expect(screen.getByText(/reset password/i)).toBeInTheDocument()
  })

  it('calls forgotPassword on submit', async () => {
    const user = userEvent.setup()
    renderForgot()

    await user.type(screen.getByPlaceholderText(/email address/i), 'test@test.com')
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
