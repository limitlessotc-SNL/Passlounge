/**
 * PublicGuard unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'

import { PublicGuard } from './PublicGuard'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicGuard>
              <div>Login Page</div>
            </PublicGuard>
          }
        />
        <Route path="/" element={<div>Dashboard</div>} />
        <Route path="/onboarding" element={<div>Onboarding</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicGuard', () => {
  afterEach(() => {
    useAuthStore.getState().logout()
    useStudentStore.getState().reset()
  })

  it('renders children when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: false })
    renderWithRouter()

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('redirects to / when authenticated and onboarded', () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false })
    useStudentStore.setState({ onboarded: true })
    renderWithRouter()

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects to /onboarding when authenticated but not onboarded', () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false })
    useStudentStore.setState({ onboarded: false })
    renderWithRouter()

    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })

  it('renders nothing while loading', () => {
    useAuthStore.setState({ isAuthenticated: false, isLoading: true })
    const { container } = renderWithRouter()

    expect(container.innerHTML).toBe('')
  })

  it('does not show login page when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true, isLoading: false })
    useStudentStore.setState({ onboarded: true })
    renderWithRouter()

    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})
