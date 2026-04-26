// src/features/cat/CATScreen.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CATScreen } from './CATScreen';
import type { UseCATSessionReturn } from './useCATSession';
import type { StudyCard } from '@/types';

function makeCard(id = 'c1'): StudyCard {
  return {
    id,
    title:            'Test Card',
    scenario:         'A 45-year-old patient presents with chest pain.',
    question:         'What is the priority intervention?',
    opts:             ['Call physician', 'Administer O2', 'Obtain ECG', 'Start IV'],
    correct:          1,
    why_wrong:        {},
    layers:           [],
    nclex_category:   'Management of Care',
    cat:              'Management of Care',
    difficulty_level: 3,
    source:           '',
    pearl:            '',
  } as unknown as StudyCard;
}

function makeSession(overrides: Partial<UseCATSessionReturn> = {}): UseCATSessionReturn {
  return {
    phase:            'active',
    currentCard:      makeCard(),
    questionIndex:    0,
    totalQuestions:   150,
    elapsedSeconds:   120,
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

describe('CATScreen', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders scenario and question', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    expect(screen.getByText(/chest pain/i)).toBeTruthy();
    expect(screen.getByText(/priority intervention/i)).toBeTruthy();
  });

  it('renders all four answer options', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    expect(screen.getByText('Call physician')).toBeTruthy();
    expect(screen.getByText('Administer O2')).toBeTruthy();
    expect(screen.getByText('Obtain ECG')).toBeTruthy();
    expect(screen.getByText('Start IV')).toBeTruthy();
  });

  it('shows progress as "1 / 150"', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    expect(screen.getByText('1 / 150')).toBeTruthy();
  });

  it('shows elapsed time formatted as MM:SS', () => {
    render(<CATScreen session={makeSession({ elapsedSeconds: 125 })} onExit={vi.fn()} />);
    expect(screen.getByText('02:05')).toBeTruthy();
  });

  // ── Submit-button flow on the current question ───────────────────

  it('Submit button is hidden until the student picks an option', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    expect(screen.queryByText(/Submit Answer/i)).toBeNull();
  });

  it('Submit button appears after picking an option', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByText('Administer O2'));
    expect(screen.getByText(/Submit Answer/i)).toBeTruthy();
  });

  it('does not call answerQuestion until Submit is clicked', () => {
    const answerQuestion = vi.fn();
    render(<CATScreen session={makeSession({ answerQuestion })} onExit={vi.fn()} />);
    fireEvent.click(screen.getByText('Administer O2'));
    expect(answerQuestion).not.toHaveBeenCalled();
  });

  it('Submit commits the selected answer via answerQuestion', () => {
    const answerQuestion = vi.fn();
    render(<CATScreen session={makeSession({ answerQuestion })} onExit={vi.fn()} />);
    fireEvent.click(screen.getByText('Administer O2'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(answerQuestion).toHaveBeenCalledWith(1);
  });

  it('clicking the same option twice toggles the selection off and hides Submit', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByText('Administer O2'));
    expect(screen.getByText(/Submit Answer/i)).toBeTruthy();
    fireEvent.click(screen.getByText('Administer O2'));
    expect(screen.queryByText(/Submit Answer/i)).toBeNull();
  });

  it('clicking a different option swaps the tentative selection (Submit still visible)', () => {
    const answerQuestion = vi.fn();
    render(<CATScreen session={makeSession({ answerQuestion })} onExit={vi.fn()} />);
    fireEvent.click(screen.getByText('Call physician'));
    fireEvent.click(screen.getByText('Obtain ECG'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(answerQuestion).toHaveBeenCalledWith(2);
    expect(answerQuestion).toHaveBeenCalledTimes(1);
  });

  // ── Exit modal ─────────────────────────────────────────────────────

  it('shows exit confirmation when exit button clicked', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Exit CAT'));
    expect(screen.getByText(/Exit CAT\?/i)).toBeTruthy();
    expect(screen.getByText(/Keep Going/i)).toBeTruthy();
    expect(screen.getByText(/Exit & Save/i)).toBeTruthy();
  });

  it('calls onExit when "Exit & Save" is clicked', () => {
    const onExit = vi.fn();
    render(<CATScreen session={makeSession()} onExit={onExit} />);
    fireEvent.click(screen.getByLabelText('Exit CAT'));
    fireEvent.click(screen.getByText('Exit & Save'));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('dismisses exit modal when "Keep Going" is clicked', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Exit CAT'));
    fireEvent.click(screen.getByText('Keep Going'));
    expect(screen.queryByText(/Exit CAT\?/i)).toBeNull();
  });

  it('renders nothing when currentCard is null', () => {
    const { container } = render(
      <CATScreen session={makeSession({ currentCard: null })} onExit={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not show difficulty, score, or probability during session', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    expect(screen.queryByText(/difficulty/i)).toBeNull();
    expect(screen.queryByText(/readiness/i)).toBeNull();
    expect(screen.queryByText(/probability/i)).toBeNull();
  });

  // ── Back / forward navigation ─────────────────────────────────────

  it('renders previous and next arrow buttons', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    expect(screen.getByLabelText('Previous question')).toBeTruthy();
    expect(screen.getByLabelText('Next question')).toBeTruthy();
  });

  it('both arrows start disabled on question 1 with no history', () => {
    render(<CATScreen session={makeSession({ questionIndex: 0 })} onExit={vi.fn()} />);
    expect(screen.getByLabelText('Previous question')).toBeDisabled();
    expect(screen.getByLabelText('Next question')).toBeDisabled();
  });

  it('enables prev arrow once at least one question has been answered', () => {
    const pastCard = { ...makeCard('past1'), question: 'Past question one?' };
    render(
      <CATScreen
        session={makeSession({
          questionIndex: 1,
          viewPastQuestion: vi.fn().mockReturnValue({ card: pastCard, selectedIndex: 2 }),
        })}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Previous question')).not.toBeDisabled();
    expect(screen.getByLabelText('Next question')).toBeDisabled();
  });

  it('clicking prev renders the past question with the selected option highlighted and banner shown', () => {
    const pastCard = {
      ...makeCard('past1'),
      scenario: 'Past scenario',
      question: 'Past question one?',
      opts: ['Past A', 'Past B', 'Past C', 'Past D'],
    };
    const viewPastQuestion = vi.fn().mockReturnValue({ card: pastCard, selectedIndex: 2 });
    render(
      <CATScreen
        session={makeSession({ questionIndex: 1, viewPastQuestion })}
        onExit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Previous question'));

    expect(screen.getByText('Past question one?')).toBeTruthy();
    expect(screen.getByText('Past scenario')).toBeTruthy();
    expect(screen.getByText(/Reviewing a past question/i)).toBeTruthy();
  });

  it('Submit-Change button only appears when the past tentative differs from the stored answer', () => {
    const pastCard = {
      ...makeCard('past1'),
      opts: ['Past A', 'Past B', 'Past C', 'Past D'],
    };
    render(
      <CATScreen
        session={makeSession({
          questionIndex: 1,
          viewPastQuestion: vi.fn().mockReturnValue({ card: pastCard, selectedIndex: 1 }),
        })}
        onExit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Previous question'));
    // No submit yet — the highlighted option matches the stored answer.
    expect(screen.queryByText(/Submit Change/i)).toBeNull();

    // Re-tap the stored option — that's a no-op (deselects). Still no submit.
    fireEvent.click(screen.getByText('Past B'));
    expect(screen.queryByText(/Submit Change/i)).toBeNull();

    // Tap a different option — now there's a real change to commit.
    fireEvent.click(screen.getByText('Past C'));
    expect(screen.getByText(/Submit Change/i)).toBeTruthy();
  });

  it('Submit Change calls changePastAnswer with the new index', () => {
    const changePastAnswer = vi.fn();
    const pastCard = {
      ...makeCard('past1'),
      opts: ['Past A', 'Past B', 'Past C', 'Past D'],
    };
    render(
      <CATScreen
        session={makeSession({
          questionIndex: 1,
          changePastAnswer,
          viewPastQuestion: vi.fn().mockReturnValue({ card: pastCard, selectedIndex: 1 }),
        })}
        onExit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Previous question'));
    fireEvent.click(screen.getByText('Past C'));
    fireEvent.click(screen.getByText(/Submit Change/i));

    expect(changePastAnswer).toHaveBeenCalledWith(0, 2);
  });

  // ── Strike / unstrike ─────────────────────────────────────────────

  it('renders a strike-out button for every answer option', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    expect(screen.getByLabelText(/Strike option A/i)).toBeTruthy();
    expect(screen.getByLabelText(/Strike option B/i)).toBeTruthy();
    expect(screen.getByLabelText(/Strike option C/i)).toBeTruthy();
    expect(screen.getByLabelText(/Strike option D/i)).toBeTruthy();
  });

  it('striking an option disables it and clicking it does not select', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/Strike option B/i));
    fireEvent.click(screen.getByText('Administer O2'));
    expect(screen.queryByText(/Submit Answer/i)).toBeNull();
  });

  it('unstriking an option restores it as selectable and submittable', () => {
    const answerQuestion = vi.fn();
    render(<CATScreen session={makeSession({ answerQuestion })} onExit={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/Strike option B/i));
    fireEvent.click(screen.getByLabelText(/Unstrike option B/i));
    fireEvent.click(screen.getByText('Administer O2'));
    fireEvent.click(screen.getByText(/Submit Answer/i));
    expect(answerQuestion).toHaveBeenCalledWith(1);
  });

  it('striking the currently-selected option deselects it (Submit hides)', () => {
    render(<CATScreen session={makeSession()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByText('Call physician'));
    expect(screen.getByText(/Submit Answer/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Strike option A/i));
    expect(screen.queryByText(/Submit Answer/i)).toBeNull();
  });

  it('"Back to current" returns to the unanswered question', () => {
    const pastCard = { ...makeCard('past1'), question: 'Past question?' };
    render(
      <CATScreen
        session={makeSession({
          questionIndex: 1,
          viewPastQuestion: vi.fn().mockReturnValue({ card: pastCard, selectedIndex: 0 }),
        })}
        onExit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Previous question'));
    expect(screen.getByText('Past question?')).toBeTruthy();

    fireEvent.click(screen.getByText(/Back to current/i));

    expect(screen.getByText(/priority intervention/i)).toBeTruthy();
    expect(screen.queryByText(/Reviewing a past question/i)).toBeNull();
  });
});
