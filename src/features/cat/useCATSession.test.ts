// src/features/cat/useCATSession.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { StudyCard } from '@/types';
import { useCATSession } from './useCATSession';

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock('./cat.service', () => ({
  fetchAllCardsForCAT:     vi.fn(),
  fetchPreviousCATLevel:   vi.fn(),
  saveCATResult:           vi.fn(),
}));

vi.mock('./cat.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./cat.utils')>();
  return {
    ...actual,
    selectNextCard: vi.fn().mockImplementation(actual.selectNextCard),
  };
});

import {
  fetchAllCardsForCAT,
  fetchPreviousCATLevel,
  saveCATResult,
} from './cat.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeCard(id: string, difficulty = 3, correct = 0): StudyCard {
  return {
    id,
    title:            `Card ${id}`,
    scenario:         'Patient scenario',
    question:         'Priority intervention?',
    opts:             ['A', 'B', 'C', 'D'],
    correct,
    why_wrong:        {},
    layers:           [],
    nclex_category:   'Management of Care',
    cat:              'Management of Care',
    difficulty_level: difficulty,
    source:           '',
    pearl:            '',
  } as unknown as StudyCard;
}

/** Generate 200 unique cards so the session can always find a next card. */
function makeCardPool(count = 200): StudyCard[] {
  return Array.from({ length: count }, (_, i) =>
    makeCard(`card-${i}`, ((i % 5) + 1))
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('useCATSession', () => {
  const studentId = 'student-abc';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAllCardsForCAT).mockResolvedValue(makeCardPool());
    vi.mocked(fetchPreviousCATLevel).mockResolvedValue(null);
    vi.mocked(saveCATResult).mockResolvedValue();
  });

  it('starts in idle phase', () => {
    const { result } = renderHook(() => useCATSession(studentId));
    expect(result.current.phase).toBe('idle');
    expect(result.current.currentCard).toBeNull();
    expect(result.current.questionIndex).toBe(0);
  });

  it('transitions to loading then active after startSession', async () => {
    const { result } = renderHook(() => useCATSession(studentId));

    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.phase).toBe('active');
    expect(result.current.currentCard).not.toBeNull();
    expect(result.current.questionIndex).toBe(0);
    expect(result.current.totalQuestions).toBe(150);
  });

  it('errors when no cards are available', async () => {
    vi.mocked(fetchAllCardsForCAT).mockResolvedValue([]);

    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => {
      await result.current.startSession();
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.error).not.toBeNull();
  });

  it('increments questionIndex after answering', async () => {
    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });

    const before = result.current.questionIndex;

    act(() => {
      result.current.answerQuestion(0); // correct index = 0 for makeCard
    });

    expect(result.current.questionIndex).toBe(before + 1);
  });

  it('advances to a different card after answering', async () => {
    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });

    const firstCard = result.current.currentCard;
    act(() => { result.current.answerQuestion(0); });

    // Either null (unlikely with 200 cards) or a different card
    if (result.current.currentCard !== null) {
      expect(result.current.currentCard.id).not.toBe(firstCard?.id);
    }
  });

  it('does nothing when answered outside active phase', () => {
    const { result } = renderHook(() => useCATSession(studentId));
    // phase is 'idle'
    act(() => { result.current.answerQuestion(0); });
    expect(result.current.questionIndex).toBe(0);
  });

  it('completes session after 150 questions and saves result', async () => {
    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });

    // Answer 150 questions — each in its own act so the reducer + closure
    // identity both settle between iterations.
    for (let i = 0; i < 150; i++) {
      if (result.current.phase !== 'active') break;
      const answer = result.current.currentCard?.correct ?? 0;
      await act(async () => {
        result.current.answerQuestion(answer);
      });
    }

    // Final COMPLETE dispatch is scheduled inside saveCATResult().then(...);
    // flush the microtask queue so the phase transitions to 'complete'.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveCATResult).toHaveBeenCalledOnce();
    expect(result.current.phase).toBe('complete');
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.total_questions).toBe(150);
  }, 30_000);

  it('saves result with correct metadata on completion', async () => {
    vi.mocked(fetchPreviousCATLevel).mockResolvedValue(3.0);

    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });

    for (let i = 0; i < 150; i++) {
      if (result.current.phase !== 'active') break;
      const answer = result.current.currentCard?.correct ?? 0;
      await act(async () => {
        result.current.answerQuestion(answer);
      });
    }

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const savedArg = vi.mocked(saveCATResult).mock.calls[0][0];
    expect(savedArg.student_id).toBe(studentId);
    expect(savedArg.total_questions).toBe(150);
    expect(savedArg.cat_level).toBeGreaterThan(0);
    expect(savedArg.pass_probability).toBeGreaterThanOrEqual(0);
    expect(savedArg.pass_probability).toBeLessThanOrEqual(100);
    expect(savedArg.correct_count + savedArg.wrong_count).toBe(150);
  }, 30_000);

  it('reset returns to idle and clears state', async () => {
    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });
    expect(result.current.phase).toBe('active');

    act(() => { result.current.reset(); });

    expect(result.current.phase).toBe('idle');
    expect(result.current.currentCard).toBeNull();
    expect(result.current.questionIndex).toBe(0);
  });

  // ── changePastAnswer ─────────────────────────────────────────────────

  it('changePastAnswer updates the trace selection and records a change_history entry', async () => {
    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });

    // Answer question 1 correctly (correct index is 0 for makeCard).
    act(() => { result.current.answerQuestion(0); });

    // Now go back and change the answer on question 0 to option 2 (wrong).
    await act(async () => { result.current.changePastAnswer(0, 2); });

    const past = result.current.viewPastQuestion(0);
    expect(past?.selectedIndex).toBe(2);
  });

  it('changePastAnswer records "correct → wrong" in change_history and saves it at session end', async () => {
    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });

    act(() => { result.current.answerQuestion(0); });                 // correct (index 0)
    await act(async () => { result.current.changePastAnswer(0, 2); }); // change to wrong

    // Flip-then-complete so the saved result surfaces the change_history.
    for (let i = 0; i < 149; i++) {
      if (result.current.phase !== 'active') break;
      const answer = result.current.currentCard?.correct ?? 0;
      await act(async () => { result.current.answerQuestion(answer); });
    }
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const saved = vi.mocked(saveCATResult).mock.calls[0][0];
    const firstEntry = saved.question_trace[0];
    expect(firstEntry.change_history).toBeDefined();
    expect(firstEntry.change_history).toHaveLength(1);
    const change = firstEntry.change_history![0];
    expect(change.was_correct_before).toBe(true);
    expect(change.was_correct_after).toBe(false);
    expect(change.from_index).toBe(0);
    expect(change.to_index).toBe(2);
  }, 30_000);

  it('changePastAnswer is a no-op when the same option is re-selected', async () => {
    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });

    act(() => { result.current.answerQuestion(0); });
    await act(async () => { result.current.changePastAnswer(0, 0); });

    const past = result.current.viewPastQuestion(0);
    expect(past?.selectedIndex).toBe(0);
    // No change_history entry should have been appended.
    // (The only way to inspect it here is to complete and check saved result —
    // a direct viewPastQuestion doesn't expose change_history. The no-op is
    // covered more tightly by the reducer path; this test just verifies the
    // visible state is stable.)
  });

  it('abandonSession saves partial result and resets', async () => {
    const { result } = renderHook(() => useCATSession(studentId));
    await act(async () => { await result.current.startSession(); });

    // Answer a few questions
    act(() => {
      result.current.answerQuestion(0);
      result.current.answerQuestion(1);
    });

    await act(async () => {
      await result.current.abandonSession();
    });

    expect(saveCATResult).toHaveBeenCalledOnce();
    const savedArg = vi.mocked(saveCATResult).mock.calls[0][0];
    expect(savedArg.total_questions).toBeLessThan(150); // partial
    expect(result.current.phase).toBe('idle');
  });
});
