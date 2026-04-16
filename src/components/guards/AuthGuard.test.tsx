/**
 * AuthGuard unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/store/authStore'

import { AuthGuard } from './AuthGuard'

function renderWithRouter(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthGuard', () => {
  afterEach(() => {
    useAuthStore.getState().logout()
  })

  it('redirects to /login when not authenticated', () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: false })
    renderWithRouter('/dashboard')

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    useAuthStore.setState({ isLoading: false, isAuthenticated: true })
    renderWithRouter('/dashboard')

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('renders nothing while loading', () => {
    useAuthStore.setState({ isLoading: true, isAuthenticated: false })
    const { container } = renderWithRouter('/dashboard')

    expect(container.innerHTML).toBe('')
  })
})
