// src/features/ngn/ngn.scoring.test.ts

import { describe, expect, it } from 'vitest';

import { scoreNGNAnswer } from './ngn.scoring';
import type {
  BowTieAnswer,
  ClozeAnswer,
  DragDropAnswer,
  MatrixAnswer,
  NGNAnswer,
  NGNCard,
  NGNContent,
} from './ngn.types';

// ─── Helper to build a thin fake card around a given content payload ──

function makeCard(type: NGNCard['type'], content: NGNContent, max_points = 1): NGNCard {
  return {
    id: 'test',
    title: 'Test',
    scenario: 'A patient...',
    question: 'What now?',
    type,
    nclex_category: 'Management of Care',
    difficulty_level: 3,
    scoring_rule: '0/1',
    max_points,
    content,
    rationale: '',
    source: '',
  } as NGNCard;
}

function score(card: NGNCard, answer: NGNAnswer) {
  return scoreNGNAnswer(card, answer);
}

// ─── MCQ ──────────────────────────────────────────────────────────────

describe('scoreNGNAnswer / mcq', () => {
  const card = makeCard('mcq', { opts: ['A', 'B', 'C', 'D'], correct: 2 });

  it('awards 1 point for the correct option', () => {
    const r = score(card, 2);
    expect(r.points_earned).toBe(1);
    expect(r.max_points).toBe(1);
    expect(r.normalised).toBe(1);
    expect(r.was_correct).toBe(true);
  });

  it('awards 0 for any wrong option', () => {
    for (const idx of [0, 1, 3]) {
      const r = score(card, idx);
      expect(r.points_earned).toBe(0);
      expect(r.normalised).toBe(0);
      expect(r.was_correct).toBe(false);
    }
  });
});

// ─── Extended MR (select N) ───────────────────────────────────────────

describe('scoreNGNAnswer / extended_mr_n', () => {
  const card = makeCard('extended_mr_n', {
    opts: ['A', 'B', 'C', 'D', 'E'],
    correct_indices: [0, 2, 4],
    select_n: 3,
  }, 3);

  it('full credit when all 3 selected indices are correct', () => {
    const r = score(card, [0, 2, 4]);
    expect(r.points_earned).toBe(3);
    expect(r.max_points).toBe(3);
    expect(r.was_correct).toBe(true);
  });

  it('partial credit per correct index, no penalty for wrong', () => {
    const r = score(card, [0, 1, 4]); // 0 and 4 correct, 1 wrong (no penalty)
    expect(r.points_earned).toBe(2);
    expect(r.normalised).toBeCloseTo(2 / 3);
    expect(r.was_correct).toBe(true);
  });

  it('zero credit when no selections are in correct_indices', () => {
    const r = score(card, [1, 3]);
    expect(r.points_earned).toBe(0);
    expect(r.was_correct).toBe(false);
  });

  it('handles empty answer', () => {
    const r = score(card, []);
    expect(r.points_earned).toBe(0);
    expect(r.was_correct).toBe(false);
  });
});

// ─── Extended MR (select all) ─────────────────────────────────────────

describe('scoreNGNAnswer / extended_mr_all', () => {
  const card = makeCard('extended_mr_all', {
    opts: ['A', 'B', 'C', 'D', 'E'],
    correct_indices: [0, 2, 4],
  }, 3);

  it('full credit for selecting exactly the correct set', () => {
    const r = score(card, [0, 2, 4]);
    expect(r.points_earned).toBe(3);
    expect(r.was_correct).toBe(true);
  });

  it('+1 per correct, -1 per wrong (still positive)', () => {
    const r = score(card, [0, 2, 1]); // +1 +1 -1 = 1
    expect(r.points_earned).toBe(1);
    expect(r.was_correct).toBe(false); // 1/3 < 0.5
  });

  it('floors at 0 when more wrong than right', () => {
    const r = score(card, [1, 3]); // -1 -1 = -2 -> 0
    expect(r.points_earned).toBe(0);
    expect(r.was_correct).toBe(false);
  });

  it('floors at 0 when raw is exactly negative', () => {
    const r = score(card, [0, 1, 3]); // +1 -1 -1 = -1 -> 0
    expect(r.points_earned).toBe(0);
  });

  it('handles empty answer', () => {
    const r = score(card, []);
    expect(r.points_earned).toBe(0);
  });
});

// ─── Bow-tie ──────────────────────────────────────────────────────────

describe('scoreNGNAnswer / bow_tie', () => {
  const card = makeCard('bow_tie', {
    left_label: 'Actions',
    center_label: 'Condition',
    right_label: 'Parameters',
    left_opts: ['L1', 'L2', 'L3', 'L4'],
    left_correct: [0, 2],
    center_opts: ['C1', 'C2', 'C3'],
    center_correct: 1,
    right_opts: ['R1', 'R2', 'R3', 'R4'],
    right_correct: [1, 3],
  }, 5);

  it('full credit when all panels are exactly correct', () => {
    const a: BowTieAnswer = { left: [0, 2], center: 1, right: [1, 3] };
    const r = score(card, a);
    expect(r.points_earned).toBe(5);
    expect(r.was_correct).toBe(true);
    expect(r.breakdown).toEqual({ left: 2, center: 1, right: 2 });
  });

  it('all-or-nothing on the left panel — one wrong selection forfeits all left points', () => {
    const a: BowTieAnswer = { left: [0, 1], center: 1, right: [1, 3] };
    const r = score(card, a);
    expect(r.points_earned).toBe(0 + 1 + 2);
    expect(r.breakdown?.left).toBe(0);
  });

  it('all-or-nothing on the right panel', () => {
    const a: BowTieAnswer = { left: [0, 2], center: 1, right: [0, 1] };
    const r = score(card, a);
    expect(r.points_earned).toBe(2 + 1 + 0);
    expect(r.breakdown?.right).toBe(0);
  });

  it('center is 0/1 independent of the panels', () => {
    const a: BowTieAnswer = { left: [0, 2], center: 0, right: [1, 3] };
    const r = score(card, a);
    expect(r.points_earned).toBe(2 + 0 + 2);
    expect(r.breakdown?.center).toBe(0);
  });

  it('left panel rejects an extra correct selection (must match exactly)', () => {
    const a: BowTieAnswer = { left: [0, 2, 3], center: 1, right: [1, 3] };
    const r = score(card, a);
    expect(r.breakdown?.left).toBe(0);
  });

  it('order of selections does not matter for left/right panels', () => {
    const a: BowTieAnswer = { left: [2, 0], center: 1, right: [3, 1] };
    const r = score(card, a);
    expect(r.points_earned).toBe(5);
  });

  it('zero on every panel', () => {
    const a: BowTieAnswer = { left: [], center: 0, right: [] };
    const r = score(card, a);
    expect(r.points_earned).toBe(0);
    expect(r.was_correct).toBe(false);
  });
});

// ─── Matrix ───────────────────────────────────────────────────────────

describe('scoreNGNAnswer / matrix', () => {
  const card = makeCard('matrix', {
    columns: ['Anticipated', 'Unanticipated'],
    rows: [
      { label: 'Tachycardia',     correct_col: 1 },
      { label: 'Hypertension',    correct_col: 0 },
      { label: 'Confusion',       correct_col: 1 },
      { label: 'Crackles in lungs', correct_col: 1 },
    ],
  }, 4);

  it('full credit when every row matches', () => {
    const a: MatrixAnswer = { row_selections: [1, 0, 1, 1] };
    const r = score(card, a);
    expect(r.points_earned).toBe(4);
    expect(r.was_correct).toBe(true);
  });

  it('partial credit — 1 point per correct row', () => {
    const a: MatrixAnswer = { row_selections: [1, 1, 0, 1] }; // rows 0 + 3 correct
    const r = score(card, a);
    expect(r.points_earned).toBe(2);
    expect(r.normalised).toBeCloseTo(2 / 4);
  });

  it('zero credit when no row is correct', () => {
    const a: MatrixAnswer = { row_selections: [0, 1, 0, 0] };
    const r = score(card, a);
    expect(r.points_earned).toBe(0);
  });
});

// ─── Cloze ────────────────────────────────────────────────────────────

describe('scoreNGNAnswer / cloze', () => {
  const card = makeCard('cloze', {
    template: 'The nurse should administer {0} via {1} and monitor {2}.',
    dropdowns: [
      { opts: ['epinephrine', 'morphine', 'aspirin'], correct: 0 },
      { opts: ['IM', 'IV', 'PO'], correct: 0 },
      { opts: ['BP', 'glucose', 'pulse ox'], correct: 0 },
    ],
  }, 3);

  it('full credit when every dropdown matches', () => {
    const a: ClozeAnswer = { selections: [0, 0, 0] };
    const r = score(card, a);
    expect(r.points_earned).toBe(3);
    expect(r.was_correct).toBe(true);
  });

  it('1 point per correct dropdown', () => {
    const a: ClozeAnswer = { selections: [0, 1, 0] };
    const r = score(card, a);
    expect(r.points_earned).toBe(2);
  });
});

// ─── Drag-drop ────────────────────────────────────────────────────────

describe('scoreNGNAnswer / drag_drop', () => {
  const card = makeCard('drag_drop', {
    items: ['SOB', 'Hypotension', 'Bradycardia', 'Bilateral crackles'],
    zones: ['Left HF', 'Right HF', 'Both'],
    correct_mapping: {
      '0': 'Left HF',
      '1': 'Both',
      '2': 'Right HF',
      '3': 'Left HF',
    },
  }, 4);

  it('full credit when every item lands in its correct zone', () => {
    const a: DragDropAnswer = {
      mapping: { '0': 'Left HF', '1': 'Both', '2': 'Right HF', '3': 'Left HF' },
    };
    const r = score(card, a);
    expect(r.points_earned).toBe(4);
    expect(r.was_correct).toBe(true);
  });

  it('partial credit — 1 point per correctly mapped item', () => {
    const a: DragDropAnswer = {
      mapping: { '0': 'Left HF', '1': 'Right HF', '2': 'Right HF', '3': 'Left HF' },
    };
    const r = score(card, a);
    expect(r.points_earned).toBe(3);
  });

  it('zero when no item lands in its correct zone', () => {
    const a: DragDropAnswer = {
      mapping: { '0': 'Right HF', '1': 'Left HF', '2': 'Both', '3': 'Both' },
    };
    const r = score(card, a);
    expect(r.points_earned).toBe(0);
  });

  it('treats missing mappings as wrong', () => {
    const a: DragDropAnswer = { mapping: { '0': 'Left HF' } };
    const r = score(card, a);
    expect(r.points_earned).toBe(1);
  });
});

// ─── Trend ────────────────────────────────────────────────────────────

describe('scoreNGNAnswer / trend', () => {
  const card = makeCard('trend', {
    exhibit: {
      headers: ['', '08:00', '12:00', '16:00'],
      rows: [
        ['HR',     '88',  '110', '128'],
        ['BP sys', '128', '102', '88'],
        ['Temp',   '99.1','100.4','101.6'],
      ],
    },
    question_type: 'matrix',
    columns: ['Improving', 'Worsening'],
    rows: [
      { label: 'Hemodynamics', correct_col: 1 },
      { label: 'Infection',    correct_col: 1 },
    ],
  }, 2);

  it('full credit when both rows match', () => {
    const a: MatrixAnswer = { row_selections: [1, 1] };
    const r = score(card, a);
    expect(r.points_earned).toBe(2);
    expect(r.was_correct).toBe(true);
  });

  it('partial credit', () => {
    const a: MatrixAnswer = { row_selections: [0, 1] };
    const r = score(card, a);
    expect(r.points_earned).toBe(1);
    expect(r.normalised).toBe(0.5);
    expect(r.was_correct).toBe(true);
  });
});

// ─── was_correct threshold ────────────────────────────────────────────

describe('was_correct threshold', () => {
  it('flips to true exactly at normalised >= 0.5', () => {
    const card = makeCard('matrix', {
      columns: ['A', 'B'],
      rows: [
        { label: 'r1', correct_col: 0 },
        { label: 'r2', correct_col: 0 },
      ],
    }, 2);

    expect(score(card, { row_selections: [0, 0] }).was_correct).toBe(true);
    expect(score(card, { row_selections: [0, 1] }).was_correct).toBe(true); // 0.5
    expect(score(card, { row_selections: [1, 1] }).was_correct).toBe(false);
  });
});
