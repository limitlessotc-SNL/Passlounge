/**
 * LoginScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock useAuth ─────────────────────────────────────────────────────────

const mockLogin = vi.fn()
let mockError: { message: string } | null = null
let mockIsSubmitting = false

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    error: mockError,
    isSubmitting: mockIsSubmitting,
  }),
}))

import { LoginScreen } from './LoginScreen'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginScreen />
    </MemoryRouter>,
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockError = null
    mockIsSubmitting = false
  })

  it('renders login form with inputs and sign-in button', () => {
    renderLogin()

    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders branding and navigation links', () => {
    renderLogin()

    expect(screen.getByText(/passlounge/i)).toBeInTheDocument()
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    expect(screen.getByText(/create one free/i)).toBeInTheDocument()
  })

  it('calls login with email and password on submit', async () => {
    mockLogin.mockResolvedValue(false)
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText(/email address/i), 'test@test.com')
    await user.type(screen.getByPlaceholderText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
    })
  })

  it('displays error message when error is present', () => {
    mockError = { message: 'Invalid credentials' }
    renderLogin()

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
  })

  it('disables button and inputs while submitting', () => {
    mockIsSubmitting = true
    renderLogin()

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    expect(screen.getByPlaceholderText(/email address/i)).toBeDisabled()
    expect(screen.getByPlaceholderText(/password/i)).toBeDisabled()
  })
})
