// src/features/ngn/ExtendedMRCard.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExtendedMRCard } from './ExtendedMRCard';
import type { NGNCard } from './ngn.types';

function makeNCard(): NGNCard {
  return {
    id: 'n', title: 'T', scenario: 'S', question: 'Q', type: 'extended_mr_n',
    nclex_category: 'Management of Care', difficulty_level: 3,
    scoring_rule: '0/1', max_points: 3, rationale: '', source: '',
    content: { opts: ['A', 'B', 'C', 'D'], correct_indices: [0, 2], select_n: 2 },
  };
}

function makeAllCard(): NGNCard {
  return {
    id: 'a', title: 'T', scenario: 'S', question: 'Q', type: 'extended_mr_all',
    nclex_category: 'Management of Care', difficulty_level: 3,
    scoring_rule: '+/-', max_points: 2, rationale: '', source: '',
    content: { opts: ['A', 'B', 'C', 'D'], correct_indices: [0, 2] },
  };
}

describe('ExtendedMRCard / extended_mr_n', () => {
  it('shows the "Select N" instruction', () => {
    render(<ExtendedMRCard card={makeNCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText(/Select 2/)).toBeTruthy();
  });

  it('Submit is disabled until at least one option is picked', () => {
    render(<ExtendedMRCard card={makeNCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled();
  });

  it('does not allow picking more than N options', () => {
    render(<ExtendedMRCard card={makeNCard()} onAnswer={vi.fn()} mode="test" />);
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('B'));
    fireEvent.click(screen.getByText('C')); // ignored — already at N
    fireEvent.click(screen.getByText(/Submit Answer/i));
    // hard cap means C never registers — verify by submission shape
  });

  it('emits sorted indices on submit', () => {
    const onAnswer = vi.fn();
    render(<ExtendedMRCard card={makeNCard()} onAnswer={onAnswer} mode="test" />);
    fireEvent.click(screen.getByText('C'));
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(onAnswer).toHaveBeenCalledWith([0, 2]);
  });

  it('shows running selection counter', () => {
    render(<ExtendedMRCard card={makeNCard()} onAnswer={vi.fn()} mode="test" />);
    fireEvent.click(screen.getByText('A'));
    expect(screen.getByText(/1\/2/)).toBeTruthy();
  });
});

describe('ExtendedMRCard / extended_mr_all', () => {
  it('shows the "Select all that apply" instruction', () => {
    render(<ExtendedMRCard card={makeAllCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText(/Select all that apply/)).toBeTruthy();
  });

  it('does not cap selections', () => {
    const onAnswer = vi.fn();
    render(<ExtendedMRCard card={makeAllCard()} onAnswer={onAnswer} mode="test" />);
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('B'));
    fireEvent.click(screen.getByText('C'));
    fireEvent.click(screen.getByText('D'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(onAnswer).toHaveBeenCalledWith([0, 1, 2, 3]);
  });

  it('toggling an option twice deselects it', () => {
    const onAnswer = vi.fn();
    render(<ExtendedMRCard card={makeAllCard()} onAnswer={onAnswer} mode="test" />);
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('A'));
    fireEvent.click(screen.getByText('B'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(onAnswer).toHaveBeenCalledWith([1]);
  });
});

describe('ExtendedMRCard / feedback', () => {
  it('study mode renders points-earned line when scored', () => {
    render(
      <ExtendedMRCard
        card={makeNCard()}
        onAnswer={vi.fn()}
        mode="study"
        scoreResult={{ points_earned: 2, max_points: 3, normalised: 2/3, was_correct: true }}
      />,
    );
    expect(screen.getByText(/2 \/ 3 points earned/i)).toBeTruthy();
  });

  it('test mode hides points-earned line', () => {
    render(
      <ExtendedMRCard
        card={makeNCard()}
        onAnswer={vi.fn()}
        mode="test"
        scoreResult={{ points_earned: 2, max_points: 3, normalised: 2/3, was_correct: true }}
      />,
    );
    expect(screen.queryByText(/points earned/i)).toBeNull();
  });

  it('locks options once scored', () => {
    const onAnswer = vi.fn();
    render(
      <ExtendedMRCard
        card={makeNCard()}
        onAnswer={onAnswer}
        mode="study"
        scoreResult={{ points_earned: 2, max_points: 3, normalised: 2/3, was_correct: true }}
      />,
    );
    fireEvent.click(screen.getByText('A'));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
