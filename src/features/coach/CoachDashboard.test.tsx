// src/features/coach/CoachDashboard.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockSignOut, mockGetCoach } = vi.hoisted(() => ({
  mockSignOut: vi.fn(),
  mockGetCoach: vi.fn<() => unknown>(() => ({
    id: 'coach1', school_id: 's1', auth_id: 'a1', name: 'Coach Bee',
    email: 'b@x.com', role: 'faculty', is_active: true, created_at: '',
  })),
}));

vi.mock('@/store/coachStore', () => ({
  useCoachStore: Object.assign(
    (selector: (s: unknown) => unknown) => selector({
      coach: mockGetCoach(),
      signOut: mockSignOut,
    }),
    { getState: () => ({ coach: mockGetCoach(), signOut: mockSignOut }) },
  ),
}));

vi.mock('./coach.service', () => ({
  getCoachCohorts:    vi.fn(),
  fetchCohortSummary: vi.fn(),
  fetchCohortMetrics: vi.fn(),
  createCohort:       vi.fn(),
  updateCohort:       vi.fn(),
  // Used by StudentDetailPanel + CohortManageModal
  getCoachNotes:      vi.fn(async () => []),
  addCoachNote:       vi.fn(async () => {}),
  getInterventions:   vi.fn(async () => []),
  logIntervention:    vi.fn(async () => {}),
  getStudentOutcomes: vi.fn(async () => []),
  recordNCLEXOutcome: vi.fn(async () => {}),
}));

import {
  fetchCohortMetrics,
  fetchCohortSummary,
  getCoachCohorts,
} from './coach.service';
import type { Cohort, CohortSummary, StudentMetrics } from './coach.types';

import { CoachDashboard } from './CoachDashboard';

const mockGetCohorts  = vi.mocked(getCoachCohorts);
const mockGetSummary  = vi.mocked(fetchCohortSummary);
const mockGetMetrics  = vi.mocked(fetchCohortMetrics);

const fakeCohort: Cohort = {
  id: 'co1',
  school_id: 's1',
  coach_id: 'coach1',
  name: 'NUR 425',
  cohort_code: 'NUR425',
  target_test_date: '2026-08-01',
  is_active: true,
  created_at: '',
};

const fakeSummary: CohortSummary = {
  cohort: fakeCohort,
  total_students: 3,
  red_count: 1,
  amber_count: 1,
  green_count: 1,
  avg_pass_probability: 64,
  avg_cat_level: 3.6,
  most_failed_category: 'Pharmacology',
  days_to_test: 90,
};

function metricsFixture(id: string, risk: 'red' | 'amber' | 'green', pp: number, name: string): StudentMetrics {
  return {
    student_id: id, name, email: '', avatar: null,
    test_date: '2026-08-01', days_to_test: 90,
    cat_level: 3.5, cat_level_previous: 3.0, cat_velocity: 0.1,
    pass_probability: pp, projected_pass_probability: pp + 5,
    readiness_score: 60, risk_level: risk,
    last_active_at: new Date().toISOString(),
    days_since_active: 1, active_days_last_14: 7,
    total_cards_studied: 100, total_cat_sessions: 2, current_streak: 3,
    category_accuracy: [], weakest_categories: [],
    sr_compliance: 0.6, ngn_accuracy: 0.7, trend_direction: 'stable',
    risk_flags: [],
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <CoachDashboard />
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

describe('CoachDashboard', () => {
  it('renders the SNL Educator banner and coach name', async () => {
    mockGetCohorts.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/SNL Educator/i)).toBeTruthy();
    });
    expect(screen.getByText('Coach Bee')).toBeTruthy();
  });

  it('shows the empty-no-cohorts message when coach has no cohorts', async () => {
    mockGetCohorts.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('empty-no-cohorts')).toBeTruthy();
    });
  });

  it('lists cohorts as tabs and selects the first one by default', async () => {
    mockGetCohorts.mockResolvedValue([fakeCohort]);
    mockGetSummary.mockResolvedValue(fakeSummary);
    mockGetMetrics.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId(`cohort-tab-${fakeCohort.id}`)).toBeTruthy();
    });
  });

  it('shows the empty-no-students hint when cohort has no students', async () => {
    mockGetCohorts.mockResolvedValue([fakeCohort]);
    mockGetSummary.mockResolvedValue({ ...fakeSummary, total_students: 0 });
    mockGetMetrics.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('empty-no-students')).toBeTruthy();
    });
    expect(screen.getByTestId('empty-no-students').textContent).toMatch(/NUR425/);
  });

  it('renders student rows sorted with red first', async () => {
    mockGetCohorts.mockResolvedValue([fakeCohort]);
    mockGetSummary.mockResolvedValue(fakeSummary);
    mockGetMetrics.mockResolvedValue([
      metricsFixture('s1', 'green', 80, 'Greeny'),
      metricsFixture('s2', 'red',   30, 'Reddy'),
      metricsFixture('s3', 'amber', 55, 'Ambro'),
    ]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('student-list')).toBeTruthy();
    });
    const rows = screen.getAllByTestId(/^student-row-/);
    expect(rows[0].getAttribute('data-testid')).toBe('student-row-s2');
    expect(rows[1].getAttribute('data-testid')).toBe('student-row-s3');
    expect(rows[2].getAttribute('data-testid')).toBe('student-row-s1');
  });

  it('clicking View opens the student detail panel', async () => {
    mockGetCohorts.mockResolvedValue([fakeCohort]);
    mockGetSummary.mockResolvedValue(fakeSummary);
    mockGetMetrics.mockResolvedValue([metricsFixture('s1', 'amber', 55, 'Ambro')]);
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId('view-s1')).toBeTruthy();
    });

    await user.click(screen.getByTestId('view-s1'));
    expect(screen.getByTestId('student-detail-panel')).toBeTruthy();
  });

  it('Sign out calls signOut and navigates to /coach/login', async () => {
    mockGetCohorts.mockResolvedValue([]);
    const user = userEvent.setup();
    renderDashboard();

    await waitFor(() => screen.getByTestId('coach-signout-btn'));
    await user.click(screen.getByTestId('coach-signout-btn'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/coach/login', { replace: true });
  });

  it('clicking + New cohort opens the modal', async () => {
    mockGetCohorts.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => screen.getByTestId('new-cohort-btn'));
    fireEvent.click(screen.getByTestId('new-cohort-btn'));
    expect(screen.getByTestId('cohort-modal')).toBeTruthy();
  });
});
