// src/features/cat/CATResultsScreen.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CATResultsScreen } from './CATResultsScreen';
import type { CATResult } from './cat.types';
import { emptyBreakdown } from './cat.utils';

// ─── Mock recharts (not available in test env) ────────────────────────────

vi.mock('recharts', () => ({
  LineChart:           ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  Line:                () => null,
  ReferenceLine:       () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  XAxis:               () => null,
  YAxis:               () => null,
  Tooltip:             () => null,
  CartesianGrid:       () => null,
}));

// ─── Mock react-router navigate ───────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<CATResult> = {}): CATResult {
  return {
    student_id:         'student-1',
    cat_level:          3.8,
    pass_probability:   74,
    total_questions:    150,
    correct_count:      95,
    wrong_count:        55,
    duration_seconds:   3720,
    question_trace:     [],
    category_accuracy:  {
      ...emptyBreakdown(),
      management_of_care: { correct: 18, total: 25 },
      pharmacology:        { correct:  8, total: 15 },
      safety:              { correct: 14, total: 18 },
    },
    trend_direction:    'improving',
    previous_cat_level: 3.2,
    ...overrides,
  };
}

function renderResults(result: CATResult, onRetake = vi.fn()) {
  return render(
    <MemoryRouter>
      <CATResultsScreen result={result} onRetake={onRetake} />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('CATResultsScreen', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('displays pass probability prominently', () => {
    renderResults(makeResult({ pass_probability: 74 }));
    expect(screen.getByText('74')).toBeTruthy();
    expect(screen.getByText(/NCLEX Readiness/i)).toBeTruthy();
  });

  it('displays CAT level and label', () => {
    renderResults(makeResult({ cat_level: 3.8 }));
    expect(screen.getByText('Level 3.8')).toBeTruthy();
    expect(screen.getByText('Proficient')).toBeTruthy();
  });

  it('shows improving trend arrow', () => {
    renderResults(makeResult({ trend_direction: 'improving' }));
    expect(screen.getAllByText('↑').length).toBeGreaterThan(0);
  });

  it('shows declining trend arrow', () => {
    renderResults(makeResult({ trend_direction: 'declining' }));
    expect(screen.getAllByText('↓').length).toBeGreaterThan(0);
  });

  it('shows stable dash for first CAT (no trend)', () => {
    renderResults(makeResult({ trend_direction: 'first', previous_cat_level: null }));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows correct and wrong counts', () => {
    renderResults(makeResult({ correct_count: 95, wrong_count: 55 }));
    expect(screen.getByText('95')).toBeTruthy();
    expect(screen.getByText('55')).toBeTruthy();
  });

  it('shows formatted duration', () => {
    // 3720 seconds = 1h 2m
    renderResults(makeResult({ duration_seconds: 3720 }));
    expect(screen.getByText('1h 2m')).toBeTruthy();
  });

  it('renders the difficulty chart', () => {
    renderResults(makeResult());
    expect(screen.getByTestId('chart')).toBeTruthy();
  });

  it('renders category breakdown rows for categories with data', () => {
    renderResults(makeResult());
    expect(screen.getByText('Management of Care')).toBeTruthy();
    expect(screen.getByText('Pharmacology')).toBeTruthy();
  });

  it('shows previous vs current CAT level when previous exists', () => {
    renderResults(makeResult({ cat_level: 3.8, previous_cat_level: 3.2 }));
    expect(screen.getByText('3.2')).toBeTruthy();
    expect(screen.getByText('3.8')).toBeTruthy();
    expect(screen.getByText('Last CAT')).toBeTruthy();
    expect(screen.getByText('This CAT')).toBeTruthy();
  });

  it('hides previous CAT section when no prior result', () => {
    renderResults(makeResult({ previous_cat_level: null }));
    expect(screen.queryByText('Last CAT')).toBeNull();
  });

  it('shows Study Weak Areas button when weak categories exist', () => {
    // pharmacology: 8/15 = 53% < 70% — weak
    renderResults(makeResult());
    expect(screen.getByText(/Study Weak Areas/i)).toBeTruthy();
  });

  it('hides Study Weak Areas when all categories pass', () => {
    const result = makeResult({
      category_accuracy: {
        ...emptyBreakdown(),
        management_of_care: { correct: 20, total: 25 },
        pharmacology:        { correct: 12, total: 15 },
        safety:              { correct: 14, total: 18 },
      },
    });
    renderResults(result);
    expect(screen.queryByText(/Study Weak Areas/i)).toBeNull();
  });

  it('navigates to study with weak categories on "Study Weak Areas" click', () => {
    renderResults(makeResult());
    fireEvent.click(screen.getByText(/Study Weak Areas/i));
    expect(mockNavigate).toHaveBeenCalledWith('/study', expect.objectContaining({
      state: expect.objectContaining({ weakCategories: expect.any(Array) }),
    }));
  });

  it('calls onRetake when "Retake CAT" is clicked', () => {
    const onRetake = vi.fn();
    renderResults(makeResult(), onRetake);
    fireEvent.click(screen.getByText('Retake CAT'));
    expect(onRetake).toHaveBeenCalledOnce();
  });

  it('navigates to dashboard when "Dashboard" is clicked', () => {
    renderResults(makeResult());
    fireEvent.click(screen.getByText('Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
