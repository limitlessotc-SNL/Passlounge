// src/features/coach/CoachGuard.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/store/coachStore', async () => {
  const actual = await vi.importActual<typeof import('@/store/coachStore')>('@/store/coachStore');
  return actual;
});

import { useCoachStore } from '@/store/coachStore';

import { CoachGuard } from './CoachGuard';

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/coach']}>
      <Routes>
        <Route path="/coach/login" element={<div data-testid="login-screen">login</div>} />
        <Route element={<CoachGuard />}>
          <Route path="/coach" element={<div data-testid="dashboard">dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const fakeCoach = {
  id: 'c1', auth_id: 'a', school_id: 's', name: 'Bee',
  email: 'b@x.com', role: 'faculty' as const, is_active: true, created_at: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Override initialize so it does NOT auto-fire — we set state directly.
  useCoachStore.setState({
    coach: null, school: null, isLoading: true, isAuthenticated: false,
    initialize: async () => {},
    signOut: async () => {},
    _setForTest: () => {},
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CoachGuard', () => {
  it('shows the loading state while coachStore is initialising', () => {
    renderGuard();
    expect(screen.getByTestId('coach-guard-loading')).toBeTruthy();
  });

  it('redirects to /coach/login when not authenticated', async () => {
    useCoachStore.setState({ isLoading: false, isAuthenticated: false, coach: null });
    renderGuard();
    await waitFor(() => {
      expect(screen.getByTestId('login-screen')).toBeTruthy();
    });
  });

  it('redirects to /coach/login when no coach record exists', async () => {
    useCoachStore.setState({ isLoading: false, isAuthenticated: true, coach: null });
    renderGuard();
    await waitFor(() => {
      expect(screen.getByTestId('login-screen')).toBeTruthy();
    });
  });

  it('redirects when coach.is_active = false', async () => {
    useCoachStore.setState({
      isLoading: false,
      isAuthenticated: true,
      coach: { ...fakeCoach, is_active: false },
    });
    renderGuard();
    await waitFor(() => {
      expect(screen.getByTestId('login-screen')).toBeTruthy();
    });
  });

  it('renders the dashboard when coach is authenticated and active', async () => {
    useCoachStore.setState({
      isLoading: false,
      isAuthenticated: true,
      coach: fakeCoach,
    });
    renderGuard();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeTruthy();
    });
  });
});
