// src/features/ngn/DragDropCard.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DragDropCard } from './DragDropCard';
import type { NGNCard } from './ngn.types';

function makeCard(): NGNCard {
  return {
    id: 'd', title: 'T', scenario: 'S', question: 'Q', type: 'drag_drop',
    nclex_category: 'Physiological Adaptation', difficulty_level: 4,
    scoring_rule: '0/1', max_points: 3, rationale: '', source: '',
    content: {
      items: ['SOB', 'Hypotension', 'Bradycardia'],
      zones: ['Left HF', 'Right HF', 'Both'],
      correct_mapping: { '0': 'Left HF', '1': 'Both', '2': 'Right HF' },
    },
  };
}

describe('DragDropCard', () => {
  it('renders all items and zones', () => {
    render(<DragDropCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText('SOB')).toBeTruthy();
    expect(screen.getByText('Hypotension')).toBeTruthy();
    expect(screen.getByText('Bradycardia')).toBeTruthy();
    expect(screen.getByLabelText('Zone Left HF')).toBeTruthy();
    expect(screen.getByLabelText('Zone Right HF')).toBeTruthy();
    expect(screen.getByLabelText('Zone Both')).toBeTruthy();
  });

  it('Submit is disabled until every item is assigned', () => {
    render(<DragDropCard card={makeCard()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled();

    fireEvent.click(screen.getByText('SOB'));
    fireEvent.click(screen.getByLabelText('Zone Left HF'));
    expect(screen.getByText(/Submit Answer/i)).toBeDisabled();

    fireEvent.click(screen.getByText('Hypotension'));
    fireEvent.click(screen.getByLabelText('Zone Both'));
    fireEvent.click(screen.getByText('Bradycardia'));
    fireEvent.click(screen.getByLabelText('Zone Right HF'));
    expect(screen.getByText(/Submit Answer/i)).not.toBeDisabled();
  });

  it('emits the mapping on submit', () => {
    const onAnswer = vi.fn();
    render(<DragDropCard card={makeCard()} onAnswer={onAnswer} mode="test" />);

    fireEvent.click(screen.getByText('SOB'));
    fireEvent.click(screen.getByLabelText('Zone Left HF'));
    fireEvent.click(screen.getByText('Hypotension'));
    fireEvent.click(screen.getByLabelText('Zone Both'));
    fireEvent.click(screen.getByText('Bradycardia'));
    fireEvent.click(screen.getByLabelText('Zone Right HF'));
    fireEvent.click(screen.getByText(/Submit Answer/i));

    expect(onAnswer).toHaveBeenCalledWith({
      mapping: { '0': 'Left HF', '1': 'Both', '2': 'Right HF' },
    });
  });

  it('reassigns an item when placed in a different zone', () => {
    const onAnswer = vi.fn();
    render(<DragDropCard card={makeCard()} onAnswer={onAnswer} mode="test" />);

    fireEvent.click(screen.getByText('SOB'));
    fireEvent.click(screen.getByLabelText('Zone Left HF'));
    // Re-pick SOB and move it to Both
    fireEvent.click(screen.getByText('SOB'));
    fireEvent.click(screen.getByLabelText('Zone Both'));

    fireEvent.click(screen.getByText('Hypotension'));
    fireEvent.click(screen.getByLabelText('Zone Both'));
    fireEvent.click(screen.getByText('Bradycardia'));
    fireEvent.click(screen.getByLabelText('Zone Right HF'));
    fireEvent.click(screen.getByText(/Submit Answer/i));

    expect(onAnswer).toHaveBeenCalledWith({
      mapping: { '0': 'Both', '1': 'Both', '2': 'Right HF' },
    });
  });

  it('study mode shows points-earned line', () => {
    render(
      <DragDropCard
        card={makeCard()}
        onAnswer={vi.fn()}
        mode="study"
        scoreResult={{ points_earned: 2, max_points: 3, normalised: 2/3, was_correct: true }}
      />,
    );
    expect(screen.getByText(/2 \/ 3 points earned/i)).toBeTruthy();
  });
});
