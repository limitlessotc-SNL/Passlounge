// src/features/ngn/BowTieCard.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BowTieCard } from './BowTieCard';
import type { NGNCard } from './ngn.types';

function makeCard(): NGNCard {
  return {
    id: 'b', title: 'T', scenario: 'S', question: 'Q', type: 'bow_tie',
    nclex_category: 'Physiological Adaptation', difficulty_level: 5,
    scoring_rule: 'rationale', max_points: 5, rationale: '', source: '',
    content: {
      left_label: 'Actions',
      center_label: 'Condition',
      right_label: 'Parameters',
      left_opts: ['L1', 'L2', 'L3'],
      left_correct: [0, 2],
      center_opts: ['C1', 'C2'],
      center_correct: 1,
      right_opts: ['R1', 'R2', 'R3'],
      right_correct: [1, 2],
    },
  };
}

describe('BowTieCard', () => {
  it('renders all three panels with their labels', () => {
    render(<BowTieCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText('Actions')).toBeTruthy();
    expect(screen.getByText('Condition')).toBeTruthy();
    expect(screen.getByText('Parameters')).toBeTruthy();
  });

  it('Submit is disabled until all panels are filled to required count', () => {
    render(<BowTieCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Actions : L1'));
    fireEvent.click(screen.getByLabelText('Actions : L3'));
    fireEvent.click(screen.getByLabelText('Condition : C2'));
    fireEvent.click(screen.getByLabelText('Parameters : R2'));
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled(); // right needs 2

    fireEvent.click(screen.getByLabelText('Parameters : R3'));
    expect(screen.getByText(/Submit Answer/i)).not.toBeDisabled();
  });

  it('emits the BowTieAnswer with sorted left/right arrays', () => {
    const onAnswer = vi.fn();
    render(<BowTieCard card={makeCard()} onAnswer={onAnswer} mode="test" />);
    // Pick in reversed order — submission should still arrive sorted.
    fireEvent.click(screen.getByLabelText('Actions : L3'));
    fireEvent.click(screen.getByLabelText('Actions : L1'));
    fireEvent.click(screen.getByLabelText('Condition : C2'));
    fireEvent.click(screen.getByLabelText('Parameters : R3'));
    fireEvent.click(screen.getByLabelText('Parameters : R2'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(onAnswer).toHaveBeenCalledWith({ left: [0, 2], center: 1, right: [1, 2] });
  });

  it('hard-caps left selections at left_correct.length', () => {
    const onAnswer = vi.fn();
    render(<BowTieCard card={makeCard()} onAnswer={onAnswer} mode="test" />);
    fireEvent.click(screen.getByLabelText('Actions : L1'));
    fireEvent.click(screen.getByLabelText('Actions : L2'));
    fireEvent.click(screen.getByLabelText('Actions : L3')); // ignored — already at cap
    fireEvent.click(screen.getByLabelText('Condition : C1'));
    fireEvent.click(screen.getByLabelText('Parameters : R1'));
    fireEvent.click(screen.getByLabelText('Parameters : R2'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(onAnswer).toHaveBeenCalledWith({ left: [0, 1], center: 0, right: [0, 1] });
  });

  it('center is single-select — choosing a second center replaces the first', () => {
    const onAnswer = vi.fn();
    render(<BowTieCard card={makeCard()} onAnswer={onAnswer} mode="test" />);
    fireEvent.click(screen.getByLabelText('Actions : L1'));
    fireEvent.click(screen.getByLabelText('Actions : L3'));
    fireEvent.click(screen.getByLabelText('Condition : C1'));
    fireEvent.click(screen.getByLabelText('Condition : C2'));
    fireEvent.click(screen.getByLabelText('Parameters : R2'));
    fireEvent.click(screen.getByLabelText('Parameters : R3'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(onAnswer).toHaveBeenCalledWith({ left: [0, 2], center: 1, right: [1, 2] });
  });

  it('study mode shows points-earned line', () => {
    render(
      <BowTieCard
        card={makeCard()}
        onAnswer={vi.fn()}
        mode="study"
        scoreResult={{ points_earned: 3, max_points: 5, normalised: 0.6, was_correct: true, breakdown: { left: 2, center: 1, right: 0 } }}
      />,
    );
    expect(screen.getByText(/3 \/ 5 points earned/i)).toBeTruthy();
  });
});
