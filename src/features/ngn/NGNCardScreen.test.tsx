// src/features/ngn/NGNCardScreen.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NGNCardScreen } from './NGNCardScreen';
import type { NGNCard } from './ngn.types';

function mcq(): NGNCard {
  return {
    id: 'm', title: 'T',
    scenario: 'A patient has chest pain.',
    question: 'What is the priority?',
    type: 'mcq',
    nclex_category: 'Management of Care',
    difficulty_level: 3,
    scoring_rule: '0/1', max_points: 1,
    content: { opts: ['Call doc', 'Give O2', 'Get ECG', 'Start IV'], correct: 1 },
    rationale: 'Oxygen first per ABCs.',
    source: '',
  };
}

function matrix(): NGNCard {
  return {
    id: 'mx', title: 'T',
    scenario: 'A patient...',
    question: 'Classify each finding.',
    type: 'matrix',
    nclex_category: 'Physiological Adaptation',
    difficulty_level: 4,
    scoring_rule: '0/1', max_points: 2,
    content: {
      columns: ['Anticipated', 'Unanticipated'],
      rows: [
        { label: 'A', correct_col: 0 },
        { label: 'B', correct_col: 1 },
      ],
    },
    rationale: '',
    source: '',
  };
}

describe('NGNCardScreen', () => {
  it('renders scenario and question', () => {
    render(<NGNCardScreen card={mcq()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByText(/chest pain/i)).toBeTruthy();
    expect(screen.getByText(/priority/i)).toBeTruthy();
  });

  it('routes mcq through the inline MCQ body', () => {
    render(<NGNCardScreen card={mcq()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByTestId('mcq-body')).toBeTruthy();
  });

  it('routes matrix to MatrixCard', () => {
    render(<NGNCardScreen card={matrix()} onAnswer={vi.fn()} mode="test" />);
    expect(screen.getByTestId('matrix-card')).toBeTruthy();
  });

  it('emits an NGNScoreResult on submit', () => {
    const onAnswer = vi.fn();
    render(<NGNCardScreen card={mcq()} onAnswer={onAnswer} mode="test" />);

    fireEvent.click(screen.getByText('Give O2'));
    fireEvent.click(screen.getByText(/Submit Answer/i));

    expect(onAnswer).toHaveBeenCalledTimes(1);
    const result = onAnswer.mock.calls[0][0];
    expect(result.points_earned).toBe(1);
    expect(result.max_points).toBe(1);
    expect(result.was_correct).toBe(true);
  });

  it('study mode reveals rationale once the answer has been scored', () => {
    render(<NGNCardScreen card={mcq()} onAnswer={vi.fn()} mode="study" />);
    // Not visible until submitted
    expect(screen.queryByText(/Rationale/i)).toBeNull();
    fireEvent.click(screen.getByText('Give O2'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(screen.getByText(/Rationale/i)).toBeTruthy();
    expect(screen.getByText(/Oxygen first/i)).toBeTruthy();
  });

  it('test mode hides rationale after scoring', () => {
    render(<NGNCardScreen card={mcq()} onAnswer={vi.fn()} mode="test" />);
    fireEvent.click(screen.getByText('Give O2'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(screen.queryByText(/Rationale/i)).toBeNull();
  });
});
