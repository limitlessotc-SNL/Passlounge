// src/features/admin/AdminAuthScreen.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('./admin.service', async () => {
  const actual = await vi.importActual<typeof import('./admin.service')>('./admin.service');
  return {
    ...actual,
    checkRateLimit: vi.fn(),
    recordAttempt: vi.fn(),
    checkIsAdmin: vi.fn(),
    logAdminAction: vi.fn(),
    setAdminSession: vi.fn(),
    verifyAdminPassword: vi.fn(),
  };
});

import { useAuthStore } from '@/store/authStore';

import { AdminAuthScreen } from './AdminAuthScreen';
import {
  checkIsAdmin,
  checkRateLimit,
  logAdminAction,
  recordAttempt,
  setAdminSession,
  verifyAdminPassword,
} from './admin.service';

const mockCheckRateLimit = vi.mocked(checkRateLimit);
const mockRecordAttempt  = vi.mocked(recordAttempt);
const mockCheckIsAdmin   = vi.mocked(checkIsAdmin);
const mockLogAction      = vi.mocked(logAdminAction);
const mockSetSession     = vi.mocked(setAdminSession);
const mockVerify         = vi.mocked(verifyAdminPassword);

function renderScreen() {
  return render(
    <MemoryRouter>
      <AdminAuthScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  useAuthStore.setState({
    user: { id: 'stu-1', email: 't@t.com' },
    supaStudentId: 'stu-1',
    token: 'tok',
    isAuthenticated: true,
    isLoading: false,
  });
  mockCheckRateLimit.mockResolvedValue({ locked: false, remainingAttempts: 5 });
  mockRecordAttempt.mockResolvedValue();
  mockLogAction.mockResolvedValue();
});

afterEach(() => {
  useAuthStore.getState().logout();
});

describe('AdminAuthScreen', () => {
  it('renders heading and password field', async () => {
    renderScreen();
    expect(screen.getByText(/Admin access/i)).toBeTruthy();
    expect(screen.getByLabelText(/Admin password/i)).toBeTruthy();
  });

  it('redirects to /login when not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, supaStudentId: null });
    const { container } = renderScreen();
    // Navigate component renders nothing visible.
    expect(container.querySelector('form')).toBeNull();
  });

  it('records the attempt and shows error when password is wrong', async () => {
    mockVerify.mockReturnValue(false);
    mockCheckRateLimit
      .mockResolvedValueOnce({ locked: false, remainingAttempts: 5 }) // mount
      .mockResolvedValueOnce({ locked: false, remainingAttempts: 5 }) // pre-verify
      .mockResolvedValueOnce({ locked: false, remainingAttempts: 4 });// post-record
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/Admin password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Wrong password\. 4 attempts remaining/i)).toBeTruthy();
    });
    expect(mockRecordAttempt).toHaveBeenCalledWith('stu-1', false);
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('mints a session and navigates when password + is_admin both pass', async () => {
    mockVerify.mockReturnValue(true);
    mockCheckIsAdmin.mockResolvedValue(true);
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/Admin password/i), 'correct');
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith(expect.objectContaining({
        studentId: 'stu-1',
        isAdminVerified: true,
      }));
    });
    expect(mockLogAction).toHaveBeenCalledWith('admin.login');
    expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
  });

  it('blocks unauthorized students even with the right password', async () => {
    mockVerify.mockReturnValue(true);
    mockCheckIsAdmin.mockResolvedValue(false);
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/Admin password/i), 'correct');
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/authorized for admin access/i)).toBeTruthy();
    });
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows the lockout message when rate-limited at submit time', async () => {
    mockCheckRateLimit
      .mockResolvedValueOnce({ locked: false, remainingAttempts: 5 }) // mount
      .mockResolvedValueOnce({
        locked: true,
        remainingAttempts: 0,
        unlocksAt: Date.now() + 7 * 60 * 1000,
      });
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/Admin password/i), 'whatever');
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/Too many failed attempts/i)).toBeTruthy();
    });
    expect(mockVerify).not.toHaveBeenCalled(); // never tried
  });

  it('Back to app navigates to /', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: /Back to app/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
