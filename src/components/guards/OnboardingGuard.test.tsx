/**
 * OnboardingGuard unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { useStudentStore } from '@/store/studentStore'

import { OnboardingGuard } from './OnboardingGuard'

function renderWithRouter(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/onboarding" element={<div>Onboarding Screen</div>} />
        <Route element={<OnboardingGuard />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('OnboardingGuard', () => {
  afterEach(() => {
    useStudentStore.getState().reset()
  })

  it('redirects to /onboarding when not onboarded', () => {
    useStudentStore.setState({ onboarded: false })
    renderWithRouter('/dashboard')

    expect(screen.getByText('Onboarding Screen')).toBeInTheDocument()
  })

  it('renders children when onboarded', () => {
    useStudentStore.setState({ onboarded: true })
    renderWithRouter('/dashboard')

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('does not show dashboard when not onboarded', () => {
    useStudentStore.setState({ onboarded: false })
    renderWithRouter('/dashboard')

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('does not redirect when onboarded', () => {
    useStudentStore.setState({ onboarded: true })
    renderWithRouter('/dashboard')

    expect(screen.queryByText('Onboarding Screen')).not.toBeInTheDocument()
  })
})
