// src/features/cat/CATTab.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CATTab } from './CATTab';
import type { CATResult } from './cat.types';
import { emptyBreakdown } from './cat.utils';

// ─── Mocks ────────────────────────────────────────────────────────────────

// Patched selector shape: CATTab reads supaStudentId (app convention).
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { supaStudentId: string }) => unknown) =>
    selector({ supaStudentId: 'student-test' }),
}));

vi.mock('./cat.service', () => ({
  fetchCATHistory:       vi.fn().mockResolvedValue([]),
  fetchAllCardsForCAT:   vi.fn().mockResolvedValue([]),
  fetchPreviousCATLevel: vi.fn().mockResolvedValue(null),
  saveCATResult:         vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./useCATSession', () => ({
  useCATSession: vi.fn(),
}));

// recharts stub
vi.mock('recharts', () => ({
  LineChart:           ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line:                () => null,
  ReferenceLine:       () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis:               () => null,
  YAxis:               () => null,
  Tooltip:             () => null,
  CartesianGrid:       () => null,
}));

import { useCATSession } from './useCATSession';
import { fetchCATHistory } from './cat.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeSession(overrides = {}) {
  return {
    phase:            'idle',
    currentCard:      null,
    questionIndex:    0,
    totalQuestions:   150,
    elapsedSeconds:   0,
    result:           null,
    error:            null,
    startSession:     vi.fn(),
    answerQuestion:   vi.fn(),
    changePastAnswer: vi.fn(),
    abandonSession:   vi.fn(),
    reset:            vi.fn(),
    viewPastQuestion: vi.fn().mockReturnValue(null),
    ...overrides,
  };
}

function makeResult(overrides: Partial<CATResult> = {}): CATResult {
  return {
    id:                 'result-1',
    student_id:         'student-test',
    taken_at:           new Date().toISOString(),
    cat_level:          3.8,
    pass_probability:   74,
    total_questions:    150,
    correct_count:      95,
    wrong_count:        55,
    duration_seconds:   3600,
    question_trace:     [],
    category_accuracy:  emptyBreakdown(),
    trend_direction:    'first',
    previous_cat_level: null,
    ...overrides,
  };
}

function renderTab() {
  return render(
    <MemoryRouter>
      <CATTab />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('CATTab — idle state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCATSession).mockReturnValue(makeSession() as never);
    vi.mocked(fetchCATHistory).mockResolvedValue([]);
  });

  it('renders the CAT entry page', async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText('CAT Mode')).toBeTruthy();
    });
  });

  it('shows "Start Your First CAT" when no history', async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText(/Start Your First CAT/i)).toBeTruthy();
    });
  });

  it('shows "Start New CAT" when history exists', async () => {
    vi.mocked(fetchCATHistory).mockResolvedValue([makeResult()]);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText(/Start New CAT/i)).toBeTruthy();
    });
  });

  it('calls startSession when start button is clicked', async () => {
    const startSession = vi.fn();
    vi.mocked(useCATSession).mockReturnValue(makeSession({ startSession }) as never);
    renderTab();
    await waitFor(() => screen.getByText(/Start Your First CAT/i));
    fireEvent.click(screen.getByText(/Start Your First CAT/i));
    expect(startSession).toHaveBeenCalledOnce();
  });

  it('renders past CAT history rows', async () => {
    vi.mocked(fetchCATHistory).mockResolvedValue([
      makeResult({ cat_level: 3.8, pass_probability: 74 }),
      makeResult({ id: 'r2', cat_level: 3.2, pass_probability: 52 }),
    ]);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText('Level 3.8')).toBeTruthy();
      expect(screen.getByText('Level 3.2')).toBeTruthy();
    });
  });

  it('tapping a past CAT row opens the results screen in review mode with a Back button', async () => {
    vi.mocked(fetchCATHistory).mockResolvedValue([
      makeResult({ cat_level: 3.8, pass_probability: 74 }),
    ]);
    renderTab();
    await waitFor(() => screen.getByText('Level 3.8'));

    fireEvent.click(screen.getByText('Level 3.8'));

    await waitFor(() => {
      expect(screen.getByText(/NCLEX Readiness/i)).toBeTruthy();
    });
    // History-mode results show Back (not Retake + Dashboard)
    expect(screen.getByText('Back')).toBeTruthy();
    expect(screen.queryByText('Retake CAT')).toBeNull();
  });
});

describe('CATTab — loading state', () => {
  it('shows loading screen while loading', () => {
    vi.mocked(useCATSession).mockReturnValue(makeSession({ phase: 'loading' }) as never);
    renderTab();
    expect(screen.getByText(/Loading CAT/i)).toBeTruthy();
  });
});

describe('CATTab — saving state', () => {
  it('shows saving screen while saving', () => {
    vi.mocked(useCATSession).mockReturnValue(makeSession({ phase: 'saving' }) as never);
    renderTab();
    expect(screen.getByText(/Saving results/i)).toBeTruthy();
  });
});

describe('CATTab — active state', () => {
  it('renders CATScreen when phase is active', () => {
    vi.mocked(useCATSession).mockReturnValue(makeSession({
      phase: 'active',
      currentCard: {
        id: 'c1', title: 'T', scenario: 'S', question: 'Q?',
        opts: ['A', 'B', 'C', 'D'], correct: 0,
        why_wrong: {}, layers: [], nclex_category: 'MOC',
        cat: 'MOC', difficulty_level: 3, source: '', pearl: '',
      },
    }) as never);
    renderTab();
    expect(screen.getByText('Q?')).toBeTruthy();
  });
})

describe('CATTab — complete state', () => {
  it('renders CATResultsScreen when phase is complete', async () => {
    const result = makeResult({ pass_probability: 74 });
    vi.mocked(useCATSession).mockReturnValue(makeSession({
      phase: 'complete',
      result,
    }) as never);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText('74')).toBeTruthy();
      expect(screen.getByText(/NCLEX Readiness/i)).toBeTruthy();
    });
  });

  it('calls reset + startSession when "Retake CAT" is clicked', async () => {
    const reset        = vi.fn();
    const startSession = vi.fn();
    vi.mocked(useCATSession).mockReturnValue(makeSession({
      phase: 'complete',
      result: makeResult(),
      reset,
      startSession,
    }) as never);
    renderTab();
    await waitFor(() => screen.getByText('Retake CAT'));
    fireEvent.click(screen.getByText('Retake CAT'));
    expect(reset).toHaveBeenCalled();
    expect(startSession).toHaveBeenCalled();
  });
});

describe('CATTab — error state', () => {
  it('renders error screen with message', () => {
    vi.mocked(useCATSession).mockReturnValue(makeSession({
      phase: 'error',
      error: 'No cards available for CAT session.',
    }) as never);
    renderTab();
    expect(screen.getByText(/No cards available/i)).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
  });

  it('calls reset when "Try Again" is clicked', () => {
    const reset = vi.fn();
    vi.mocked(useCATSession).mockReturnValue(makeSession({
      phase: 'error',
      error: 'Error',
      reset,
    }) as never);
    renderTab();
    fireEvent.click(screen.getByText('Try Again'));
    expect(reset).toHaveBeenCalledOnce();
  });
});
