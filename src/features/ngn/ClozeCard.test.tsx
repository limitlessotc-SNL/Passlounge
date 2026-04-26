// src/features/ngn/ClozeCard.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClozeCard } from './ClozeCard';
import type { NGNCard } from './ngn.types';

function makeCard(): NGNCard {
  return {
    id: 'c', title: 'T', scenario: 'S', question: 'Q', type: 'cloze',
    nclex_category: 'Pharmacology', difficulty_level: 3,
    scoring_rule: '0/1', max_points: 2, rationale: '', source: '',
    content: {
      template: 'Give {0} via {1}.',
      dropdowns: [
        { opts: ['epi', 'morphine'], correct: 0 },
        { opts: ['IM', 'IV'], correct: 1 },
      ],
    },
  };
}

describe('ClozeCard', () => {
  it('renders a dropdown for each placeholder', () => {
    render(<ClozeCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByLabelText('Dropdown 1')).toBeTruthy();
    expect(screen.getByLabelText('Dropdown 2')).toBeTruthy();
  });

  it('Submit is disabled until every dropdown is filled', () => {
    render(<ClozeCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Dropdown 1'), { target: { value: '0' } });
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Dropdown 2'), { target: { value: '1' } });
    expect(screen.getByText(/Submit Answer/i)).not.toBeDisabled();
  });

  it('emits selections array on submit', () => {
    const onAnswer = vi.fn();
    render(<ClozeCard card={makeCard()} onAnswer={onAnswer} mode="test" />);
    fireEvent.change(screen.getByLabelText('Dropdown 1'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Dropdown 2'), { target: { value: '1' } });
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(onAnswer).toHaveBeenCalledWith({ selections: [0, 1] });
  });

  it('study mode shows points-earned line', () => {
    render(
      <ClozeCard
        card={makeCard()}
        onAnswer={vi.fn()}
        mode="study"
        scoreResult={{ points_earned: 1, max_points: 2, normalised: 0.5, was_correct: true }}
      />,
    );
    expect(screen.getByText(/1 \/ 2 points earned/i)).toBeTruthy();
  });

  it('test mode hides points-earned line', () => {
    render(
      <ClozeCard
        card={makeCard()}
        onAnswer={vi.fn()}
        mode="test"
        scoreResult={{ points_earned: 1, max_points: 2, normalised: 0.5, was_correct: true }}
      />,
    );
    expect(screen.queryByText(/points earned/i)).toBeNull();
  });
});
