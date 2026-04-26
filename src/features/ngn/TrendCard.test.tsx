// src/features/ngn/TrendCard.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TrendCard } from './TrendCard';
import type { NGNCard } from './ngn.types';

function makeCard(): NGNCard {
  return {
    id: 't', title: 'T', scenario: 'S', question: 'Q', type: 'trend',
    nclex_category: 'Reduction of Risk Potential', difficulty_level: 4,
    scoring_rule: '0/1', max_points: 2, rationale: '', source: '',
    content: {
      exhibit: {
        headers: ['', '08:00', '12:00', '16:00'],
        rows: [
          ['HR',     '88',  '110', '128'],
          ['BP sys', '128', '102', '88'],
        ],
      },
      question_type: 'matrix',
      columns: ['Improving', 'Worsening'],
      rows: [
        { label: 'Hemodynamics', correct_col: 1 },
        { label: 'Perfusion',    correct_col: 1 },
      ],
    },
  };
}

describe('TrendCard', () => {
  it('renders the exhibit headers and rows', () => {
    render(<TrendCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText('08:00')).toBeTruthy();
    expect(screen.getByText('12:00')).toBeTruthy();
    expect(screen.getByText('HR')).toBeTruthy();
    expect(screen.getByText('110')).toBeTruthy(); // unique cell — HR @ 12:00
  });

  it('renders the matrix response below the exhibit', () => {
    render(<TrendCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText('Hemodynamics')).toBeTruthy();
    expect(screen.getByText('Improving')).toBeTruthy();
    expect(screen.getByText('Worsening')).toBeTruthy();
  });

  it('emits a matrix-shaped answer on submit', () => {
    const onAnswer = vi.fn();
    render(<TrendCard card={makeCard()} onAnswer={onAnswer} mode="test" />);

    fireEvent.click(screen.getByLabelText('Hemodynamics : Worsening'));
    fireEvent.click(screen.getByLabelText('Perfusion : Worsening'));
    fireEvent.click(screen.getByText(/Submit Answer/i));

    expect(onAnswer).toHaveBeenCalledWith({ row_selections: [1, 1] });
  });
});
