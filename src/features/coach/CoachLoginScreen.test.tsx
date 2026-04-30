// src/features/coach/CoachLoginScreen.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSignIn  = vi.fn();
const mockSignOut = vi.fn();
vi.mock('@/config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      signOut: () => mockSignOut(),
    },
  },
}));

// vi.mock is hoisted above local declarations, so anything the factory uses
// must come from vi.hoisted() — otherwise we hit the TDZ.
const { mockInitialize, mockGetState } = vi.hoisted(() => ({
  mockInitialize: vi.fn(),
  mockGetState: vi.fn<() => { isAuthenticated: boolean; coach: { id: string; is_active: boolean } | null }>(
    () => ({ isAuthenticated: false, coach: null }),
  ),
}));

vi.mock('@/store/coachStore', () => ({
  useCoachStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({
      initialize: mockInitialize,
    }),
    { getState: mockGetState },
  ),
}));

import { CoachLoginScreen } from './CoachLoginScreen';

function renderScreen() {
  return render(
    <MemoryRouter>
      <CoachLoginScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  mockSignOut.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CoachLoginScreen', () => {
  it('renders the SNL Educator branding and password fields', () => {
    renderScreen();
    expect(screen.getByText(/SNL Educator/i)).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
  });

  it('shows an error from supabase on bad credentials', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'bad');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId('coach-login-error').textContent)
        .toMatch(/Invalid login/);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows "Not authorized" when auth succeeds but no coach record exists', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    mockInitialize.mockResolvedValue(undefined);
    mockGetState.mockReturnValue({ isAuthenticated: false, coach: null } as never);
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'good');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId('coach-login-error').textContent)
        .toMatch(/Not authorized as educator/i);
    });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('navigates to /coach when sign-in + coach lookup both succeed', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    mockInitialize.mockResolvedValue(undefined);
    mockGetState.mockReturnValue({
      isAuthenticated: true,
      coach: { id: 'c1', is_active: true } as never,
    } as never);
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'good');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/coach', { replace: true });
    });
  });

  it('blocks deactivated coaches even when auth succeeds', async () => {
    mockSignIn.mockResolvedValue({ error: null });
    mockInitialize.mockResolvedValue(undefined);
    mockGetState.mockReturnValue({
      isAuthenticated: true,
      coach: { id: 'c1', is_active: false } as never,
    } as never);
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'good');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId('coach-login-error').textContent)
        .toMatch(/deactivated/i);
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables the submit button while submitting and when fields are empty', () => {
    renderScreen();
    const btn = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    expect(btn.disabled).toBe(false);
  });
});
