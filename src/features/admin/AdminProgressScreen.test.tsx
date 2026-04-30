// src/features/admin/AdminProgressScreen.test.tsx

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('./services/progress.service', async () => {
  const actual = await vi.importActual<typeof import('./services/progress.service')>(
    './services/progress.service',
  );
  return { ...actual, fetchStudentRoster: vi.fn() };
});

import { fetchStudentRoster, type RosterRow } from './services/progress.service';

import { AdminProgressScreen } from './AdminProgressScreen';

const mockFetch = vi.mocked(fetchStudentRoster);

function renderScreen() {
  return render(
    <MemoryRouter>
      <AdminProgressScreen />
    </MemoryRouter>,
  );
}

const baseRow = (overrides: Partial<RosterRow> = {}): RosterRow => ({
  id:             'stu',
  nickname:       'Keisha',
  testerType:     'first_time',
  onboarded:      true,
  testDate:       '2026-07-15',
  daysToTest:     78,
  dailyCards:     35,
  totalSessions:  10,
  totalCorrect:   80,
  totalWrong:     20,
  accuracyPct:    80,
  lastSessionAt:  new Date(Date.now() - 1 * 86_400_000).toISOString(),
  createdAt:      new Date(Date.now() - 60 * 86_400_000).toISOString(),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdminProgressScreen', () => {
  it('renders heading and back button', async () => {
    mockFetch.mockResolvedValue([]);
    renderScreen();
    expect(screen.getByText(/Progress monitoring/i)).toBeTruthy();
    expect(screen.getByText(/Back to dashboard/i)).toBeTruthy();
  });

  it('shows the empty state when there are no students', async () => {
    mockFetch.mockResolvedValue([]);
    renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId('roster-empty')).toBeTruthy();
    });
  });

  it('shows the error state when fetch rejects', async () => {
    mockFetch.mockRejectedValue(new Error('boom'));
    renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId('roster-error').textContent).toMatch(/boom/);
    });
  });

  it('renders one row per student with stats', async () => {
    mockFetch.mockResolvedValue([
      baseRow({ id: 's1', nickname: 'Alice', accuracyPct: 90, totalSessions: 12 }),
      baseRow({ id: 's2', nickname: 'Bob',   accuracyPct: 60, totalSessions: 4 }),
    ]);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId('roster-table')).toBeTruthy();
    });
    expect(screen.getByTestId('roster-row-s1')).toBeTruthy();
    expect(screen.getByTestId('roster-row-s2')).toBeTruthy();
    expect(within(screen.getByTestId('roster-row-s1')).getByText(/Alice/)).toBeTruthy();
    expect(within(screen.getByTestId('roster-row-s1')).getByText('90%')).toBeTruthy();
  });

  it('summary strip totals reflect cohort aggregates', async () => {
    const recent = new Date(Date.now() - 1 * 86_400_000).toISOString();
    const old    = new Date(Date.now() - 30 * 86_400_000).toISOString();
    mockFetch.mockResolvedValue([
      baseRow({ id: 's1', onboarded: true,  totalCorrect: 80, totalWrong: 20, totalSessions: 10, lastSessionAt: recent }),
      baseRow({ id: 's2', onboarded: false, totalCorrect: 0,  totalWrong: 0,  totalSessions: 0,  lastSessionAt: null }),
      baseRow({ id: 's3', onboarded: true,  totalCorrect: 20, totalWrong: 80, totalSessions: 5,  lastSessionAt: old }),
    ]);
    renderScreen();

    await waitFor(() => screen.getByTestId('roster-summary'));
    const summary = screen.getByTestId('roster-summary');
    expect(within(summary).getByText('3')).toBeTruthy();      // total students
    expect(within(summary).getByText('2 / 3')).toBeTruthy();  // onboarded
    expect(within(summary).getByText('1')).toBeTruthy();      // active this week (s1 only)
    expect(within(summary).getByText('15')).toBeTruthy();     // sessions logged
    expect(within(summary).getByText('50%')).toBeTruthy();    // 100/200 cohort accuracy
  });

  it('search filters by nickname', async () => {
    mockFetch.mockResolvedValue([
      baseRow({ id: 's1', nickname: 'Alice' }),
      baseRow({ id: 's2', nickname: 'Bob' }),
    ]);
    const user = userEvent.setup();
    renderScreen();

    await waitFor(() => screen.getByTestId('roster-row-s1'));

    await user.type(screen.getByLabelText(/Search by nickname/i), 'bob');

    await waitFor(() => {
      expect(screen.queryByTestId('roster-row-s1')).toBeNull();
    });
    expect(screen.getByTestId('roster-row-s2')).toBeTruthy();
  });

  it('clicking a header toggles sort direction', async () => {
    mockFetch.mockResolvedValue([
      baseRow({ id: 's1', nickname: 'Alice', accuracyPct: 60 }),
      baseRow({ id: 's2', nickname: 'Bob',   accuracyPct: 90 }),
    ]);
    renderScreen();

    await waitFor(() => screen.getByTestId('roster-table'));

    // Initial sort = lastSessionAt desc → both rows have same default lastSessionAt, order is insertion.
    // Click "Accuracy" → defaults to desc → Bob (90%) above Alice (60%).
    const accuracyHeader = screen.getByText('Accuracy').closest('th')!;
    fireEvent.click(accuracyHeader);

    await waitFor(() => {
      const bodyRows = screen.getAllByTestId(/roster-row-/);
      expect(bodyRows[0].getAttribute('data-testid')).toBe('roster-row-s2');
      expect(bodyRows[1].getAttribute('data-testid')).toBe('roster-row-s1');
    });

    // Click again → ascending → Alice above Bob.
    fireEvent.click(accuracyHeader);

    await waitFor(() => {
      const bodyRows = screen.getAllByTestId(/roster-row-/);
      expect(bodyRows[0].getAttribute('data-testid')).toBe('roster-row-s1');
    });
  });

  it('Back to dashboard navigates to /admin', async () => {
    mockFetch.mockResolvedValue([]);
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByText(/Back to dashboard/i));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });
});
