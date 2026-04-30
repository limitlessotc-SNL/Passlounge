// src/features/cat/useCATSession.ts

import { useCallback, useReducer, useRef } from 'react';
import type { StudyCard } from '@/types';
import { trackEvent } from '@/services/analytics';
import {
  adaptDifficulty,
  calculateCATLevel,
  calculatePassProbability,
  calculateTrendDirection,
  emptyBreakdown,
  normalizeCategoryName,
  selectNextCard,
  updateCategoryAccuracy,
} from './cat.utils';
import {
  fetchAllCardsForCAT,
  fetchPreviousCATLevel,
  saveCATResult,
} from './cat.service';
import type {
  CATAnswerChange,
  CATCategoryBreakdown,
  CATCategoryKey,
  CATPhase,
  CATQuestionTrace,
  CATResult,
  CATSessionState,
  TrendDirection,
} from './cat.types';
import {
  CAT_SESSION_LENGTH,
  CAT_START_DIFFICULTY,
} from './cat.types';

// ─── Reducer ──────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOADING' }
  | {
      type: 'READY';
      firstCard: StudyCard | null;
      previousLevel: number | null;
    }
  | {
      type: 'ANSWERED';
      traceEntry: CATQuestionTrace;
      nextDifficulty: number;
      nextCard: StudyCard | null;
      updatedAccuracy: CATCategoryBreakdown;
    }
  | {
      type: 'CHANGE_PAST_ANSWER';
      questionIndex: number;
      newSelectedIndex: number;
      newCorrect: boolean;
      change: CATAnswerChange;
      categoryKey: CATCategoryKey | null;
    }
  | { type: 'SAVING' }
  | { type: 'COMPLETE'; result: CATResult }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

const INITIAL: CATSessionState = {
  phase:             'idle',
  currentCard:       null,
  currentDifficulty: CAT_START_DIFFICULTY,
  usedCardIds:       new Set(),
  trace:             [],
  categoryAccuracy:  emptyBreakdown(),
  startTime:         0,
  cardStartTime:     0,
  result:            null,
  previousCATLevel:  null,
  error:             null,
};

function reducer(state: CATSessionState, action: Action): CATSessionState {
  switch (action.type) {
    case 'LOADING':
      return { ...INITIAL, phase: 'loading' };

    case 'READY': {
      return {
        ...state,
        phase:            'active',
        currentCard:      action.firstCard,
        previousCATLevel: action.previousLevel,
        startTime:        Date.now(),
        cardStartTime:    Date.now(),
      };
    }

    case 'ANSWERED': {
      const newUsed = new Set(state.usedCardIds);
      newUsed.add(action.traceEntry.card_id);
      return {
        ...state,
        trace:             [...state.trace, action.traceEntry],
        usedCardIds:       newUsed,
        currentDifficulty: action.nextDifficulty,
        currentCard:       action.nextCard,
        categoryAccuracy:  action.updatedAccuracy,
        cardStartTime:     Date.now(),
      };
    }

    case 'CHANGE_PAST_ANSWER': {
      const newTrace = [...state.trace];
      const oldEntry = newTrace[action.questionIndex];
      newTrace[action.questionIndex] = {
        ...oldEntry,
        selected_index: action.newSelectedIndex,
        was_correct: action.newCorrect,
        change_history: [...(oldEntry.change_history ?? []), action.change],
      };

      // If correctness flipped, nudge the category accuracy so the final
      // pass-probability reflects the new answer. Total stays put — we're
      // replacing an answer, not adding one.
      let updatedAccuracy = state.categoryAccuracy;
      if (
        action.categoryKey &&
        action.change.was_correct_before !== action.change.was_correct_after
      ) {
        const bucket = state.categoryAccuracy[action.categoryKey];
        const delta = action.change.was_correct_after ? 1 : -1;
        updatedAccuracy = {
          ...state.categoryAccuracy,
          [action.categoryKey]: {
            correct: bucket.correct + delta,
            total: bucket.total,
          },
        };
      }

      return {
        ...state,
        trace: newTrace,
        categoryAccuracy: updatedAccuracy,
      };
    }

    case 'SAVING':
      return { ...state, phase: 'saving' };

    case 'COMPLETE':
      return { ...state, phase: 'complete', result: action.result };

    case 'ERROR':
      return { ...state, phase: 'error', error: action.message };

    case 'RESET':
      return { ...INITIAL };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseCATSessionReturn {
  phase:              CATPhase;
  currentCard:        StudyCard | null;
  questionIndex:      number;   // 0-based, = trace.length
  totalQuestions:     number;
  elapsedSeconds:     number;
  result:             CATResult | null;
  error:              string | null;
  startSession:       () => Promise<void>;
  answerQuestion:     (selectedIndex: number) => void;
  /** Re-answer a past question. Records the change in the trace's
   *  change_history and adjusts category accuracy if correctness flips. */
  changePastAnswer:   (questionIndex: number, newSelectedIndex: number) => void;
  abandonSession:     () => Promise<void>;
  reset:              () => void;
  /** Look up a past (answered) question. Returns null for indices outside
   *  the answered range. */
  viewPastQuestion:   (index: number) => { card: StudyCard; selectedIndex: number } | null;
}

export function useCATSession(studentId: string): UseCATSessionReturn {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // All cards kept in a ref — large stable array, not part of render cycle
  const allCardsRef = useRef<StudyCard[]>([]);
  // Session start time cached here too for elapsed timer (state.startTime only
  // updates on READY dispatch, so we mirror it in a ref for clean reads)
  const startTimeRef = useRef<number>(0);

  // ── startSession ────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    dispatch({ type: 'LOADING' });

    const [cards, previousLevel] = await Promise.all([
      fetchAllCardsForCAT(),
      fetchPreviousCATLevel(studentId),
    ]);

    if (cards.length === 0) {
      dispatch({ type: 'ERROR', message: 'No cards available for CAT session.' });
      return;
    }

    allCardsRef.current = cards;
    startTimeRef.current = Date.now();

    trackEvent('cat_session_started');

    const firstCard = selectNextCard(
      cards,
      CAT_START_DIFFICULTY,
      new Set(),
      emptyBreakdown(),
      0,
      CAT_SESSION_LENGTH
    );

    dispatch({ type: 'READY', firstCard, previousLevel });
  }, [studentId]);

  // ── answerQuestion ──────────────────────────────────────────────────────

  const answerQuestion = useCallback(
    (selectedIndex: number) => {
      if (state.phase !== 'active' || !state.currentCard) return;

      const card       = state.currentCard;
      const wasCorrect = selectedIndex === card.correct;
      const timeSecs   = Math.round((Date.now() - state.cardStartTime) / 1000);

      const rawCategory       = card.nclex_category ?? '';
      const canonicalCategory = normalizeCategoryName(rawCategory) ?? rawCategory;

      const traceEntry: CATQuestionTrace = {
        question_number:  state.trace.length + 1,
        card_id:          card.id ?? '',
        difficulty_level: card.difficulty_level ?? 3,
        category:         canonicalCategory,
        selected_index:   selectedIndex,
        was_correct:      wasCorrect,
        time_seconds:     timeSecs,
      };

      const nextDifficulty  = adaptDifficulty(state.currentDifficulty, wasCorrect);
      const updatedAccuracy = updateCategoryAccuracy(state.categoryAccuracy, rawCategory, wasCorrect);

      const newTrace    = [...state.trace, traceEntry];
      const newUsedIds  = new Set([...state.usedCardIds, card.id ?? '']);
      const isComplete  = newTrace.length >= CAT_SESSION_LENGTH;

      if (isComplete) {
        // ── Build and save final result ─────────────────────────────────
        dispatch({
          type: 'ANSWERED',
          traceEntry,
          nextDifficulty,
          nextCard: null,        // won't be shown
          updatedAccuracy,
        });
        dispatch({ type: 'SAVING' });

        const catLevel        = calculateCATLevel(newTrace);
        const trendDirection: TrendDirection = calculateTrendDirection(
          catLevel,
          state.previousCATLevel
        );
        const passProbability = calculatePassProbability(catLevel, updatedAccuracy, trendDirection);
        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

        const result: Omit<CATResult, 'id' | 'taken_at'> = {
          student_id:         studentId,
          cat_level:          catLevel,
          pass_probability:   passProbability,
          total_questions:    CAT_SESSION_LENGTH,
          correct_count:      newTrace.filter(q => q.was_correct).length,
          wrong_count:        newTrace.filter(q => !q.was_correct).length,
          duration_seconds:   durationSeconds,
          question_trace:     newTrace,
          category_accuracy:  updatedAccuracy,
          trend_direction:    trendDirection,
          previous_cat_level: state.previousCATLevel,
        };

        saveCATResult(result)
          .then(() => {
            trackEvent('cat_session_completed', {
              cat_level: result.cat_level,
              pass_probability: result.pass_probability,
              duration_seconds: result.duration_seconds,
              correct_count: result.correct_count,
              total_questions: result.total_questions,
            });
            dispatch({ type: 'COMPLETE', result: result as CATResult });
          })
          .catch((err: Error) =>
            dispatch({ type: 'ERROR', message: `Failed to save result: ${err.message}` })
          );
      } else {
        // ── Pick next card and continue ─────────────────────────────────
        const nextCard = selectNextCard(
          allCardsRef.current,
          nextDifficulty,
          newUsedIds,
          updatedAccuracy,
          newTrace.length,
          CAT_SESSION_LENGTH
        );

        dispatch({
          type: 'ANSWERED',
          traceEntry,
          nextDifficulty,
          nextCard,
          updatedAccuracy,
        });
      }
    },
    [state, studentId]
  );

  // ── abandonSession ──────────────────────────────────────────────────────

  const abandonSession = useCallback(async () => {
    if (state.trace.length === 0) {
      dispatch({ type: 'RESET' });
      return;
    }

    trackEvent('cat_session_abandoned', {
      questions_answered: state.trace.length,
    });

    dispatch({ type: 'SAVING' });

    const catLevel        = calculateCATLevel(state.trace);
    const trendDirection: TrendDirection = calculateTrendDirection(
      catLevel,
      state.previousCATLevel
    );
    const passProbability = calculatePassProbability(
      catLevel,
      state.categoryAccuracy,
      trendDirection
    );
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    const result: Omit<CATResult, 'id' | 'taken_at'> = {
      student_id:         studentId,
      cat_level:          catLevel,
      pass_probability:   passProbability,
      total_questions:    state.trace.length,   // incomplete
      correct_count:      state.trace.filter(q => q.was_correct).length,
      wrong_count:        state.trace.filter(q => !q.was_correct).length,
      duration_seconds:   durationSeconds,
      question_trace:     state.trace,
      category_accuracy:  state.categoryAccuracy,
      trend_direction:    trendDirection,
      previous_cat_level: state.previousCATLevel,
    };

    try {
      await saveCATResult(result);
    } catch (err) {
      // Surface the save failure to the student — silently swallowing it
      // looks exactly like "CAT was saved but history is empty", which is the
      // bug you're debugging now.
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[CAT] Failed to save abandoned session:', message);
      dispatch({
        type: 'ERROR',
        message: `Couldn't save your progress: ${message}`,
      });
      return;
    }

    dispatch({ type: 'RESET' });
  }, [state, studentId]);

  // ── reset ───────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    allCardsRef.current = [];
    dispatch({ type: 'RESET' });
  }, []);

  // ── changePastAnswer ────────────────────────────────────────────────────

  const changePastAnswer = useCallback(
    (questionIndex: number, newSelectedIndex: number) => {
      if (state.phase !== 'active') return;
      if (questionIndex < 0 || questionIndex >= state.trace.length) return;

      const entry = state.trace[questionIndex];
      if (entry.selected_index === newSelectedIndex) return; // no-op

      const card = allCardsRef.current.find(c => c.id === entry.card_id);
      if (!card) return;

      const newCorrect = newSelectedIndex === card.correct;
      const change: CATAnswerChange = {
        from_index:         entry.selected_index ?? -1,
        to_index:           newSelectedIndex,
        was_correct_before: entry.was_correct,
        was_correct_after:  newCorrect,
        at:                 new Date().toISOString(),
      };

      const categoryKey = normalizeCategoryName(card.nclex_category ?? '');

      dispatch({
        type: 'CHANGE_PAST_ANSWER',
        questionIndex,
        newSelectedIndex,
        newCorrect,
        change,
        categoryKey,
      });
    },
    [state.phase, state.trace],
  );

  // ── viewPastQuestion ────────────────────────────────────────────────────

  const viewPastQuestion = useCallback(
    (index: number): { card: StudyCard; selectedIndex: number } | null => {
      if (index < 0 || index >= state.trace.length) return null;
      const entry = state.trace[index];
      const card = allCardsRef.current.find(c => c.id === entry.card_id);
      if (!card || entry.selected_index === undefined) return null;
      return { card, selectedIndex: entry.selected_index };
    },
    [state.trace],
  );

  // ── Derived values ──────────────────────────────────────────────────────

  const elapsedSeconds =
    state.startTime > 0 ? Math.floor((Date.now() - state.startTime) / 1000) : 0;

  return {
    phase:          state.phase,
    currentCard:    state.currentCard,
    questionIndex:  state.trace.length,
    totalQuestions: CAT_SESSION_LENGTH,
    elapsedSeconds,
    result:         state.result,
    error:          state.error,
    startSession,
    answerQuestion,
    changePastAnswer,
    abandonSession,
    reset,
    viewPastQuestion,
  };
}
