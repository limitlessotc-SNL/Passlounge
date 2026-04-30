// src/features/coach/StudentDetailPanel.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'auth-coach' } } })) },
    from: vi.fn(() => ({
      insert: vi.fn(async () => ({ data: null, error: null })),
    })),
  },
}));

vi.mock('./coach.service', () => ({
  getCoachNotes:       vi.fn(),
  addCoachNote:        vi.fn(),
  getInterventions:    vi.fn(),
  logIntervention:     vi.fn(),
  getStudentOutcomes:  vi.fn(),
  recordNCLEXOutcome:  vi.fn(),
}));

import {
  addCoachNote,
  getCoachNotes,
  getInterventions,
  getStudentOutcomes,
  logIntervention,
  recordNCLEXOutcome,
} from './coach.service';
import type { StudentMetrics } from './coach.types';

import { StudentDetailPanel } from './StudentDetailPanel';

const mockGetNotes  = vi.mocked(getCoachNotes);
const mockAddNote   = vi.mocked(addCoachNote);
const mockGetIntv   = vi.mocked(getInterventions);
const mockLogIntv   = vi.mocked(logIntervention);
const mockGetOut    = vi.mocked(getStudentOutcomes);
const mockRecordOut = vi.mocked(recordNCLEXOutcome);

function metricsFixture(overrides: Partial<StudentMetrics> = {}): StudentMetrics {
  return {
    student_id: 'stu1',
    name: 'Keisha',
    email: 'k@x.com',
    avatar: null,
    test_date: '2026-07-15',
    days_to_test: 78,
    cat_level: 4.0,
    cat_level_previous: 3.5,
    cat_velocity: 0.5,
    pass_probability: 80,
    projected_pass_probability: 92,
    readiness_score: 75,
    risk_level: 'green',
    last_active_at: new Date().toISOString(),
    days_since_active: 0,
    active_days_last_14: 12,
    total_cards_studied: 240,
    total_cat_sessions: 4,
    current_streak: 5,
    category_accuracy: [
      { category: 'Pharmacology',         correct: 6, total: 10, accuracy: 0.6 },
      { category: 'Management of Care',   correct: 9, total: 12, accuracy: 0.75 },
    ],
    weakest_categories: ['Pharmacology'],
    sr_compliance: 0.6,
    ngn_accuracy: 0.7,
    trend_direction: 'improving',
    risk_flags: [],
    ...overrides,
  };
}

function renderPanel(overrides: Partial<StudentMetrics> = {}, onClose = vi.fn()) {
  const m = metricsFixture(overrides);
  render(
    <StudentDetailPanel
      metrics={m}
      coachId="coach1"
      cohortId="cohort1"
      onClose={onClose}
    />,
  );
  return { onClose, metrics: m };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetNotes.mockResolvedValue([]);
  mockGetIntv.mockResolvedValue([]);
  mockGetOut.mockResolvedValue([]);
  mockAddNote.mockResolvedValue();
  mockLogIntv.mockResolvedValue();
  mockRecordOut.mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StudentDetailPanel', () => {
  it('renders student header and risk badge', async () => {
    renderPanel({ risk_level: 'green' });
    expect(screen.getByText('Keisha')).toBeTruthy();
    expect(screen.getByTestId('risk-badge-green')).toBeTruthy();
  });

  it('renders pass probability and projected PP', () => {
    renderPanel();
    // 80% appears in both the header stat and the trajectory BigStat.
    expect(screen.getAllByText('80%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('92%')).toBeTruthy();
  });

  it('renders category accuracy rows', () => {
    renderPanel();
    expect(screen.getByText('Pharmacology')).toBeTruthy();
    expect(screen.getByText('Management of Care')).toBeTruthy();
  });

  it('renders "no flags" empty state', () => {
    renderPanel({ risk_flags: [] });
    expect(screen.getByText(/student on track/i)).toBeTruthy();
  });

  it('renders flag pills when present', () => {
    renderPanel({ risk_flags: ['Not active in 5 days', 'Pharmacology below 50%'] });
    expect(screen.getByText(/Not active in 5 days/)).toBeTruthy();
    expect(screen.getByText(/Pharmacology below 50%/)).toBeTruthy();
  });

  it('Close button calls onClose', () => {
    const onClose = vi.fn();
    renderPanel({}, onClose);
    fireEvent.click(screen.getByLabelText(/close panel/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking the backdrop calls onClose', () => {
    const onClose = vi.fn();
    renderPanel({}, onClose);
    fireEvent.click(screen.getByTestId('panel-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Add Note saves and reloads', async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => expect(mockGetNotes).toHaveBeenCalled());

    await user.type(screen.getByLabelText(/new coach note/i), 'Watch pharmacology');
    await user.click(screen.getByTestId('save-note-btn'));

    await waitFor(() => {
      expect(mockAddNote).toHaveBeenCalledWith('coach1', 'stu1', 'Watch pharmacology');
    });
    // After save, it re-fetches notes
    expect(mockGetNotes).toHaveBeenCalledTimes(2);
  });

  it('Log Intervention saves and reloads', async () => {
    const user = userEvent.setup();
    renderPanel();
    await waitFor(() => expect(mockGetIntv).toHaveBeenCalled());

    await user.type(screen.getByLabelText(/intervention notes/i), 'Met for 30 min');
    await user.click(screen.getByTestId('log-intervention-btn'));

    await waitFor(() => {
      expect(mockLogIntv).toHaveBeenCalled();
    });
    const arg = mockLogIntv.mock.calls[0][0];
    expect(arg.coach_id).toBe('coach1');
    expect(arg.student_id).toBe('stu1');
    expect(arg.notes).toBe('Met for 30 min');
  });

  it('Record outcome only renders when test date has passed', async () => {
    // Days to test = -1 → block visible
    renderPanel({ days_to_test: -1, test_date: '2026-04-01' });
    expect(screen.getByTestId('record-outcome-btn')).toBeTruthy();
  });

  it('Record outcome hidden when test date has not passed yet', async () => {
    renderPanel({ days_to_test: 30, test_date: '2026-12-01' });
    expect(screen.queryByTestId('record-outcome-btn')).toBeNull();
  });

  it('Record outcome saves and reloads outcomes', async () => {
    const user = userEvent.setup();
    renderPanel({ days_to_test: 0, test_date: '2026-04-28' });
    await waitFor(() => expect(mockGetOut).toHaveBeenCalled());

    await user.click(screen.getByTestId('record-outcome-btn'));

    await waitFor(() => {
      expect(mockRecordOut).toHaveBeenCalled();
    });
    expect(mockGetOut).toHaveBeenCalledTimes(2);
  });

  it('Message composer toggles open and sends', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.queryByTestId('message-composer')).toBeNull();
    await user.click(screen.getByTestId('open-message-btn'));
    expect(screen.getByTestId('message-composer')).toBeTruthy();

    await user.type(screen.getByLabelText(/message body/i), 'Hi there');
    await user.click(screen.getByTestId('send-message-btn'));

    // After send, the composer closes.
    await waitFor(() => {
      expect(screen.queryByTestId('message-composer')).toBeNull();
    });
  });
});
