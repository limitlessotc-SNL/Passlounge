// src/features/admin/AdminGuard.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./admin.service', () => ({
  checkIsAdmin: vi.fn(),
  isAdminSessionValid: vi.fn(),
}));

import { useAuthStore } from '@/store/authStore';

import { AdminGuard } from './AdminGuard';
import { checkIsAdmin, isAdminSessionValid } from './admin.service';

const mockIsAdmin = vi.mocked(checkIsAdmin);
const mockSessionValid = vi.mocked(isAdminSessionValid);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login"      element={<div data-testid="login">login</div>} />
        <Route path="/"           element={<div data-testid="home">home</div>} />
        <Route path="/admin/auth" element={<div data-testid="auth">auth</div>} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<div data-testid="dashboard">dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: { id: 'stu-1', email: 't@t.com' },
    supaStudentId: 'stu-1',
    token: 'tok',
    isAuthenticated: true,
    isLoading: false,
  });
});

afterEach(() => {
  useAuthStore.getState().logout();
});

describe('AdminGuard', () => {
  it('redirects to /login when not authenticated', async () => {
    useAuthStore.setState({ isAuthenticated: false, supaStudentId: null });
    renderAt('/admin');
    await waitFor(() => expect(screen.getByTestId('login')).toBeTruthy());
  });

  it('redirects to / when authenticated but not an admin', async () => {
    mockIsAdmin.mockResolvedValue(false);
    renderAt('/admin');
    await waitFor(() => expect(screen.getByTestId('home')).toBeTruthy());
  });

  it('redirects to /admin/auth when admin but session is invalid', async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockSessionValid.mockReturnValue(false);
    renderAt('/admin');
    await waitFor(() => expect(screen.getByTestId('auth')).toBeTruthy());
  });

  it('renders the protected outlet when all three gates pass', async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockSessionValid.mockReturnValue(true);
    renderAt('/admin');
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeTruthy());
  });

  it('shows the loading state before the is_admin lookup resolves', () => {
    mockIsAdmin.mockReturnValue(new Promise(() => { /* never */ }));
    mockSessionValid.mockReturnValue(true);
    renderAt('/admin');
    expect(screen.getByTestId('admin-guard-loading')).toBeTruthy();
  });
});
