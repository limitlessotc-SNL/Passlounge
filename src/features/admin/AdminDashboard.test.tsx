// src/features/admin/AdminDashboard.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/features/ngn/ngn.service', () => ({
  fetchAllNGNCards: vi.fn(),
}));

vi.mock('./admin.service', async () => {
  const actual = await vi.importActual<typeof import('./admin.service')>('./admin.service');
  return {
    ...actual,
    clearAdminSession: vi.fn(),
    getAdminSession: vi.fn(),
    logAdminAction: vi.fn(),
  };
});

import { fetchAllNGNCards } from '@/features/ngn/ngn.service';

import { AdminDashboard } from './AdminDashboard';
import { clearAdminSession, getAdminSession, logAdminAction } from './admin.service';

const mockFetch = vi.mocked(fetchAllNGNCards);
const mockClear = vi.mocked(clearAdminSession);
const mockGet   = vi.mocked(getAdminSession);
const mockLog   = vi.mocked(logAdminAction);

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  mockGet.mockReturnValue({
    studentId: 'stu-1',
    isAdminVerified: true,
    expiresAt: Date.now() + 30 * 60 * 1000,
  });
  mockLog.mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdminDashboard', () => {
  it('renders the heading', async () => {
    mockFetch.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => expect(screen.getByText(/NGN library/i)).toBeTruthy());
  });

  it('shows the empty state when there are no cards', async () => {
    mockFetch.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/No NGN cards yet/i)).toBeTruthy();
    });
  });

  it('renders stats and breakdown when cards exist', async () => {
    mockFetch.mockResolvedValue([
      { id: '1', title: 'A', scenario: '', question: '', type: 'matrix',
        nclex_category: 'Management of Care', difficulty_level: 3,
        scoring_rule: '0/1', max_points: 1, content: {}, rationale: '', source: '' } as never,
      { id: '2', title: 'B', scenario: '', question: '', type: 'mcq',
        nclex_category: 'Pharmacology', difficulty_level: 2,
        scoring_rule: '0/1', max_points: 1, content: {}, rationale: '', source: '' } as never,
    ]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Total NGN cards')).toBeTruthy();
    });
    // 2 cards → 2 distinct types, 2 distinct categories
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    // Type labels appear both in the breakdown card and in the recent-
    // cards row, so multiple matches are expected.
    expect(screen.getAllByText(/Matrix/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/MCQ/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the session timer', async () => {
    mockFetch.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      const timer = screen.getByTestId('admin-session-timer');
      expect(timer.textContent).toMatch(/Session expires in/);
    });
  });

  it('Sign-out clears the session and navigates to /admin/auth', async () => {
    mockFetch.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => screen.getByText(/Sign out admin/i));

    fireEvent.click(screen.getByText(/Sign out admin/i));

    expect(mockLog).toHaveBeenCalledWith('admin.logout');
    expect(mockClear).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/admin/auth', { replace: true });
  });

  it('Quick links navigate to the Phase-C routes', async () => {
    mockFetch.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => screen.getByText(/Create one card/i));

    fireEvent.click(screen.getByText(/Create one card/i));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/ngn/create');

    fireEvent.click(screen.getByText(/Batch generate/i));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/ngn/batch');
  });
});
