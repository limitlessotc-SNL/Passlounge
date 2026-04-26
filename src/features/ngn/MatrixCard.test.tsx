// src/features/ngn/MatrixCard.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MatrixCard } from './MatrixCard';
import type { NGNCard } from './ngn.types';

function makeCard(): NGNCard {
  return {
    id: 'm', title: 'T', scenario: 'S', question: 'Q', type: 'matrix',
    nclex_category: 'Physiological Adaptation', difficulty_level: 4,
    scoring_rule: '0/1', max_points: 3, rationale: '', source: '',
    content: {
      columns: ['Anticipated', 'Unanticipated'],
      rows: [
        { label: 'Tachycardia',  correct_col: 1 },
        { label: 'Hypertension', correct_col: 0 },
        { label: 'Confusion',    correct_col: 1 },
      ],
    },
  };
}

describe('MatrixCard', () => {
  it('renders all rows and column headers', () => {
    render(<MatrixCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText('Tachycardia')).toBeTruthy();
    expect(screen.getByText('Hypertension')).toBeTruthy();
    expect(screen.getByText('Confusion')).toBeTruthy();
    expect(screen.getByText('Anticipated')).toBeTruthy();
    expect(screen.getByText('Unanticipated')).toBeTruthy();
  });

  it('Submit is disabled until every row is answered', () => {
    render(<MatrixCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Tachycardia : Unanticipated'));
    fireEvent.click(screen.getByLabelText('Hypertension : Anticipated'));
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Confusion : Unanticipated'));
    expect(screen.getByText(/Submit Answer/i)).not.toBeDisabled();
  });

  it('emits row selections in row order on submit', () => {
    const onAnswer = vi.fn();
    render(<MatrixCard card={makeCard()} onAnswer={onAnswer} mode="test" />);

    fireEvent.click(screen.getByLabelText('Tachycardia : Unanticipated'));
    fireEvent.click(screen.getByLabelText('Hypertension : Anticipated'));
    fireEvent.click(screen.getByLabelText('Confusion : Unanticipated'));
    fireEvent.click(screen.getByText(/Submit Answer/i));

    expect(onAnswer).toHaveBeenCalledWith({ row_selections: [1, 0, 1] });
  });

  it('study mode shows points-earned line', () => {
    render(
      <MatrixCard
        card={makeCard()}
        onAnswer={vi.fn()}
        mode="study"
        scoreResult={{ points_earned: 2, max_points: 3, normalised: 2/3, was_correct: true }}
      />,
    );
    expect(screen.getByText(/2 \/ 3 points earned/i)).toBeTruthy();
  });

  it('test mode hides points-earned line', () => {
    render(
      <MatrixCard
        card={makeCard()}
        onAnswer={vi.fn()}
        mode="test"
        scoreResult={{ points_earned: 2, max_points: 3, normalised: 2/3, was_correct: true }}
      />,
    );
    expect(screen.queryByText(/points earned/i)).toBeNull();
  });
});
