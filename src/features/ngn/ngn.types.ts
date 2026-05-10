// src/features/ngn/ngn.types.ts
//
// All shapes for the Next-Generation NCLEX item types — the union of card
// formats NCSBN introduced in 2023 (extended multiple response, bow-tie,
// matrix, cloze, drag-drop, trend) plus legacy MCQ for completeness.
//
// `content` (the JSONB column on ngn_cards) is the type-specific payload.
// `NGNAnswer` is the corresponding student-side answer shape — what the
// player components hand back to the scoring engine.

// ─── Mode contract ────────────────────────────────────────────────────
//
// Every NGN renderer (NGNCardScreen + the 7 per-type sub-components)
// takes a `mode` prop. The contract is:
//
//   'study'   — Mid-session learning. Show post-submit color feedback,
//               rationale, and "X / N points earned". Submit button reads
//               "Submit Answer →".
//   'cat'     — Computer-adaptive testing session. Record the answer,
//               then advance with NO indication of correctness — color
//               feedback / rationale / points are ALL suppressed. IRT
//               scoring assumes the student gets no mid-test signal.
//   'test'    — Test-prep mode (full-length practice exam). Same
//               suppression as 'cat'; mid-session feedback would break
//               the simulation.
//   'review'  — Post-session review screen. The session is over, so it's
//               safe to surface color feedback and rationale here — this
//               is when students actually learn from misses.
//
// Rule of thumb: feedback is on iff (mode === 'study' || mode === 'review').
// Use the `showNGNFeedback` helper below rather than re-deriving the
// predicate so we don't drift.

export type NGNMode = 'study' | 'cat' | 'test' | 'review';

export function showNGNFeedback(mode: NGNMode, submitted: boolean): boolean {
  return submitted && (mode === 'study' || mode === 'review');
}

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

// ─── Case study (NCSBN tabbed presentation) ───────────────────────────

export interface CaseStudyTab {
  /** Tab header label, e.g. "Health History", "Nurses' Notes". */
  label: string;
  /** Free-text body shown when the tab is active. Newlines preserved. */
  body: string;
}

/** The four tabs NCSBN ships with on every case-study item. Used as the
 *  default seed when an admin first turns on case-study mode for a card. */
export const DEFAULT_CASE_STUDY_TABS: CaseStudyTab[] = [
  { label: 'Health History',     body: '' },
  { label: "Nurses' Notes",      body: '' },
  { label: 'Vital Signs',        body: '' },
  { label: 'Laboratory Results', body: '' },
];

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
  /**
   * Optional. When present and non-empty, the player wraps this card in
   * NCSBN-style case-study chrome (purple banner + tabbed case file).
   * Scoring is unchanged — the inner `type` still drives scoring.
   */
  case_study_tabs?: CaseStudyTab[];
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
