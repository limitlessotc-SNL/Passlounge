// src/features/cat/cat.types.ts

// ─── Session constants ────────────────────────────────────────────────────

export const CAT_SESSION_LENGTH  = 150 as const;
export const CAT_START_DIFFICULTY = 3  as const;
export const CAT_MIN_DIFFICULTY   = 1  as const;
export const CAT_MAX_DIFFICULTY   = 5  as const;
export const CAT_WEIGHTED_WINDOW  = 20 as const;  // questions used for level calc

// ─── Category keys (canonical) ────────────────────────────────────────────

export type CATCategoryKey =
  | 'management_of_care'
  | 'safety'
  | 'pharmacology'
  | 'physiological_adaptation'
  | 'reduction_of_risk'
  | 'basic_care'
  | 'health_promotion'
  | 'psychosocial';

// ─── Per-category accuracy ────────────────────────────────────────────────

export interface CATCategoryAccuracy {
  correct: number;
  total: number;
}

export type CATCategoryBreakdown = Record<CATCategoryKey, CATCategoryAccuracy>;

// ─── Per-question trace ───────────────────────────────────────────────────

/** One row in CATQuestionTrace.change_history — every time a student goes
 *  back and picks a different option on a past question. Used by the admin
 *  dashboard to surface "correct → wrong" regressions and "wrong → wrong"
 *  indecision. */
export interface CATAnswerChange {
  /** Index originally selected. -1 if never selected (shouldn't happen). */
  from_index: number;
  /** Index selected on this change. */
  to_index: number;
  /** Whether the from_index answer was the correct one. */
  was_correct_before: boolean;
  /** Whether the to_index answer is correct. */
  was_correct_after: boolean;
  /** ISO timestamp of the change event. */
  at: string;
}

export interface CATQuestionTrace {
  question_number: number;   // 1-based
  card_id: string;
  difficulty_level: number;  // 1–5
  category: string;          // canonical key or raw if unknown
  /** Option index the student most recently picked. Optional for rows
   *  persisted before this field was added; new sessions always populate it. */
  selected_index?: number;
  was_correct: boolean;
  time_seconds: number;
  /** Every answer change on this question, in order. Empty/undefined means
   *  the student answered once and never revisited. */
  change_history?: CATAnswerChange[];
}

// ─── Trend ────────────────────────────────────────────────────────────────

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'first';

// ─── DB result (what we save and fetch) ───────────────────────────────────

export interface CATResult {
  id?:                string;
  student_id:         string;
  taken_at?:          string;
  cat_level:          number;
  pass_probability:   number;
  total_questions:    number;
  correct_count:      number;
  wrong_count:        number;
  duration_seconds:   number;
  question_trace:     CATQuestionTrace[];
  category_accuracy:  CATCategoryBreakdown;
  trend_direction:    TrendDirection;
  previous_cat_level: number | null;
}

// ─── Session phase ────────────────────────────────────────────────────────

export type CATPhase = 'idle' | 'loading' | 'active' | 'saving' | 'complete' | 'error';

// ─── Runtime session state (inside useCATSession) ─────────────────────────

import type { StudyCard } from '@/types';

export interface CATSessionState {
  phase:            CATPhase;
  currentCard:      StudyCard | null;
  currentDifficulty: number;
  usedCardIds:      Set<string>;
  trace:            CATQuestionTrace[];
  categoryAccuracy: CATCategoryBreakdown;
  startTime:        number;   // Date.now() at session start
  cardStartTime:    number;   // Date.now() when current card was shown
  result:           CATResult | null;
  previousCATLevel: number | null;
  error:            string | null;
}
