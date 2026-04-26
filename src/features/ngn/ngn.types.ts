// src/features/ngn/ngn.types.ts
//
// All shapes for the Next-Generation NCLEX item types — the union of card
// formats NCSBN introduced in 2023 (extended multiple response, bow-tie,
// matrix, cloze, drag-drop, trend) plus legacy MCQ for completeness.
//
// `content` (the JSONB column on ngn_cards) is the type-specific payload.
// `NGNAnswer` is the corresponding student-side answer shape — what the
// player components hand back to the scoring engine.

// ─── Question types ───────────────────────────────────────────────────

export type NGNQuestionType =
  | 'mcq'
  | 'extended_mr_n'
  | 'extended_mr_all'
  | 'bow_tie'
  | 'matrix'
  | 'cloze'
  | 'drag_drop'
  | 'trend';

export type NGNScoringRule = '0/1' | '+/-' | 'rationale';

// ─── Content shapes per type ──────────────────────────────────────────

export interface MCQContent {
  opts: string[];
  correct: number;
}

export interface ExtendedMRNContent {
  opts: string[];
  correct_indices: number[];
  select_n: number;
}

export interface ExtendedMRAllContent {
  opts: string[];
  correct_indices: number[];
}

export interface BowTieContent {
  left_label: string;
  center_label: string;
  right_label: string;
  left_opts: string[];
  left_correct: number[];
  center_opts: string[];
  center_correct: number;
  right_opts: string[];
  right_correct: number[];
}

export interface MatrixRow {
  label: string;
  correct_col: number;
}

export interface MatrixContent {
  columns: string[];
  rows: MatrixRow[];
}

export interface ClozeDropdown {
  opts: string[];
  correct: number;
}

export interface ClozeContent {
  /** Template string with {0}, {1}, {2} placeholders, one per dropdown. */
  template: string;
  dropdowns: ClozeDropdown[];
}

export interface DragDropContent {
  items: string[];
  zones: string[];
  /** Map of item index (as string) → zone name. */
  correct_mapping: Record<string, string>;
  max_per_zone?: number;
}

export interface TrendExhibit {
  headers: string[];
  rows: string[][];
}

export interface TrendContent {
  exhibit: TrendExhibit;
  question_type: 'matrix';
  columns: string[];
  rows: MatrixRow[];
}

export type NGNContent =
  | MCQContent
  | ExtendedMRNContent
  | ExtendedMRAllContent
  | BowTieContent
  | MatrixContent
  | ClozeContent
  | DragDropContent
  | TrendContent;

// ─── Card row from ngn_cards ──────────────────────────────────────────

export interface NGNCard {
  id: string;
  title: string;
  scenario: string;
  question: string;
  type: NGNQuestionType;
  nclex_category: string;
  difficulty_level: number;
  scoring_rule: NGNScoringRule;
  max_points: number;
  content: NGNContent;
  rationale: string;
  source: string;
  created_by?: string;
  created_at?: string;
}

// ─── Answer shapes per type ───────────────────────────────────────────

export interface BowTieAnswer {
  left: number[];
  center: number;
  right: number[];
}

export interface MatrixAnswer {
  /** Selected column index per row, in row order. */
  row_selections: number[];
}

export interface ClozeAnswer {
  /** Selected option index per dropdown, in dropdown order. */
  selections: number[];
}

export interface DragDropAnswer {
  /** Map of item index (as string) → chosen zone name. */
  mapping: Record<string, string>;
}

export type TrendAnswer = MatrixAnswer;

export type NGNAnswer =
  | number          // MCQ
  | number[]        // ExtendedMR
  | BowTieAnswer
  | MatrixAnswer
  | ClozeAnswer
  | DragDropAnswer
  | TrendAnswer;

// ─── Scoring result ───────────────────────────────────────────────────

export interface NGNScoreResult {
  points_earned: number;
  max_points: number;
  /** points_earned / max_points, in the [0,1] range. */
  normalised: number;
  /** Convenience flag for CAT — true when normalised >= 0.5. */
  was_correct: boolean;
  /** Optional per-item breakdown, populated for partial-credit types. */
  breakdown?: Record<string, number>;
}
