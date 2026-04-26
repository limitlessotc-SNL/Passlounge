// src/features/ngn/ngn.scoring.ts
//
// Single entry point for scoring every NGN item type. The implementation
// mirrors the NCSBN NGN scoring rubric exactly:
//
//   MCQ              0/1     1 if exact match, else 0
//   extended_mr_n    0/1     +1 per correct selection, no penalty, max=N
//   extended_mr_all  +/-     +1 per correct, -1 per wrong, floor 0
//   bow_tie          rat.    L all-or-nothing + center 0/1 + R all-or-nothing
//   matrix           0/1     +1 per row matching the correct column
//   cloze            0/1     +1 per dropdown matching its correct option
//   drag_drop        0/1     +1 per item dropped in its correct zone
//   trend            0/1     same as matrix (the response IS a matrix)
//
// `was_correct` is the boolean CAT uses to drive its adaptive difficulty —
// it's true when normalised >= 0.5 (i.e., the student earned at least half
// the available points on the item).

import type {
  BowTieAnswer,
  BowTieContent,
  ClozeAnswer,
  ClozeContent,
  DragDropAnswer,
  DragDropContent,
  ExtendedMRAllContent,
  ExtendedMRNContent,
  MCQContent,
  MatrixAnswer,
  MatrixContent,
  NGNAnswer,
  NGNCard,
  NGNScoreResult,
  TrendContent,
} from './ngn.types';

// ─── Public API ───────────────────────────────────────────────────────

export function scoreNGNAnswer(card: NGNCard, answer: NGNAnswer): NGNScoreResult {
  switch (card.type) {
    case 'mcq':
      return scoreMCQ(card.content as MCQContent, answer as number);
    case 'extended_mr_n':
      return scoreExtendedMRN(card.content as ExtendedMRNContent, answer as number[]);
    case 'extended_mr_all':
      return scoreExtendedMRAll(card.content as ExtendedMRAllContent, answer as number[]);
    case 'bow_tie':
      return scoreBowTie(card.content as BowTieContent, answer as BowTieAnswer);
    case 'matrix':
      return scoreMatrix(card.content as MatrixContent, answer as MatrixAnswer);
    case 'cloze':
      return scoreCloze(card.content as ClozeContent, answer as ClozeAnswer);
    case 'drag_drop':
      return scoreDragDrop(card.content as DragDropContent, answer as DragDropAnswer);
    case 'trend':
      return scoreTrend(card.content as TrendContent, answer as MatrixAnswer);
    default:
      // Should be unreachable given the union, but keep the engine total.
      return finalize(0, 1);
  }
}

// ─── Per-type implementations ─────────────────────────────────────────

function scoreMCQ(content: MCQContent, answer: number): NGNScoreResult {
  const points = answer === content.correct ? 1 : 0;
  return finalize(points, 1);
}

function scoreExtendedMRN(content: ExtendedMRNContent, answer: number[]): NGNScoreResult {
  const correctSet = new Set(content.correct_indices);
  let points = 0;
  const breakdown: Record<string, number> = {};
  for (const idx of answer) {
    if (correctSet.has(idx)) {
      points += 1;
      breakdown[String(idx)] = 1;
    }
  }
  return finalize(points, content.select_n, breakdown);
}

function scoreExtendedMRAll(content: ExtendedMRAllContent, answer: number[]): NGNScoreResult {
  const correctSet = new Set(content.correct_indices);
  let raw = 0;
  const breakdown: Record<string, number> = {};
  for (const idx of answer) {
    if (correctSet.has(idx)) {
      raw += 1;
      breakdown[String(idx)] = 1;
    } else {
      raw -= 1;
      breakdown[String(idx)] = -1;
    }
  }
  // Floor at 0 — wrong selections never push the student into a negative.
  const points = Math.max(0, raw);
  return finalize(points, content.correct_indices.length, breakdown);
}

function scoreBowTie(content: BowTieContent, answer: BowTieAnswer): NGNScoreResult {
  const leftPanelCorrect    = setsEqual(answer.left, content.left_correct);
  const rightPanelCorrect   = setsEqual(answer.right, content.right_correct);
  const centerCorrect       = answer.center === content.center_correct;

  const leftPoints   = leftPanelCorrect ? content.left_correct.length : 0;
  const rightPoints  = rightPanelCorrect ? content.right_correct.length : 0;
  const centerPoints = centerCorrect ? 1 : 0;

  const points = leftPoints + centerPoints + rightPoints;
  const max = content.left_correct.length + 1 + content.right_correct.length;

  return finalize(points, max, {
    left:   leftPoints,
    center: centerPoints,
    right:  rightPoints,
  });
}

function scoreMatrix(content: MatrixContent, answer: MatrixAnswer): NGNScoreResult {
  let points = 0;
  const breakdown: Record<string, number> = {};
  for (let i = 0; i < content.rows.length; i++) {
    const picked = answer.row_selections[i];
    const correct = picked === content.rows[i].correct_col;
    if (correct) points += 1;
    breakdown[String(i)] = correct ? 1 : 0;
  }
  return finalize(points, content.rows.length, breakdown);
}

function scoreCloze(content: ClozeContent, answer: ClozeAnswer): NGNScoreResult {
  let points = 0;
  const breakdown: Record<string, number> = {};
  for (let i = 0; i < content.dropdowns.length; i++) {
    const picked = answer.selections[i];
    const correct = picked === content.dropdowns[i].correct;
    if (correct) points += 1;
    breakdown[String(i)] = correct ? 1 : 0;
  }
  return finalize(points, content.dropdowns.length, breakdown);
}

function scoreDragDrop(content: DragDropContent, answer: DragDropAnswer): NGNScoreResult {
  const itemIds = Object.keys(content.correct_mapping);
  let points = 0;
  const breakdown: Record<string, number> = {};
  for (const id of itemIds) {
    const correct = answer.mapping?.[id] === content.correct_mapping[id];
    if (correct) points += 1;
    breakdown[id] = correct ? 1 : 0;
  }
  return finalize(points, itemIds.length, breakdown);
}

function scoreTrend(content: TrendContent, answer: MatrixAnswer): NGNScoreResult {
  // Trend's response is just a matrix attached to an exhibit; reuse matrix
  // scoring against the embedded rows/columns.
  return scoreMatrix({ columns: content.columns, rows: content.rows }, answer);
}

// ─── Helpers ──────────────────────────────────────────────────────────

function finalize(
  points: number,
  max: number,
  breakdown?: Record<string, number>,
): NGNScoreResult {
  const safeMax = max > 0 ? max : 1;
  const earned = Math.max(0, Math.min(points, safeMax));
  const normalised = earned / safeMax;
  return {
    points_earned: earned,
    max_points: safeMax,
    normalised,
    was_correct: normalised >= 0.5,
    breakdown,
  };
}

/** Compares two arrays as sets — same elements regardless of order, no duplicates assumed. */
function setsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  if (sa.size !== a.length) return false; // duplicate guard
  for (const x of b) if (!sa.has(x)) return false;
  return true;
}
