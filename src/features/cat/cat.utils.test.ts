// src/features/cat/cat.utils.test.ts

import { describe, it, expect } from 'vitest';
import {
  adaptDifficulty,
  calculateCATLevel,
  calculatePassProbability,
  calculateTrendDirection,
  emptyBreakdown,
  getBlueprintTargets,
  normalizeCategoryName,
  sanitizeCardText,
  selectNextCard,
  updateCategoryAccuracy,
} from './cat.utils';
import type { CATQuestionTrace } from './cat.types';
import type { StudyCard } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeTrace(difficulties: number[], categories?: string[]): CATQuestionTrace[] {
  return difficulties.map((d, i) => ({
    question_number: i + 1,
    card_id:         `card-${i}`,
    difficulty_level: d,
    category:        categories?.[i] ?? 'management_of_care',
    was_correct:     true,
    time_seconds:    30,
  }));
}

function makeCard(
  id: string,
  difficulty: number,
  category = 'Management of Care'
): StudyCard {
  return {
    id,
    title:         `Card ${id}`,
    scenario:      'A patient presents with…',
    question:      'What is the priority intervention?',
    opts:          ['A', 'B', 'C', 'D'],
    correct:       0,
    why_wrong:     {},
    layers:        [],
    nclex_category: category,
    cat:           category,
    difficulty_level: difficulty,
    source:        '',
    pearl:         '',
  } as unknown as StudyCard;
}

// ─── normalizeCategoryName ────────────────────────────────────────────────

describe('normalizeCategoryName', () => {
  it('maps short DB names to canonical keys', () => {
    expect(normalizeCategoryName('Pharmacology')).toBe('pharmacology');
    expect(normalizeCategoryName('Safety')).toBe('safety');
    expect(normalizeCategoryName('Mental Health')).toBe('psychosocial');
    expect(normalizeCategoryName('Basic Care')).toBe('basic_care');
    expect(normalizeCategoryName('Health Promotion')).toBe('health_promotion');
  });

  it('maps full NCSBN names to canonical keys', () => {
    expect(normalizeCategoryName('Pharmacological and Parenteral Therapies')).toBe('pharmacology');
    expect(normalizeCategoryName('Safety and Infection Control')).toBe('safety');
    expect(normalizeCategoryName('Health Promotion and Maintenance')).toBe('health_promotion');
    expect(normalizeCategoryName('Reduction of Risk Potential')).toBe('reduction_of_risk');
    expect(normalizeCategoryName('Psychosocial Integrity')).toBe('psychosocial');
  });

  it('is case-insensitive', () => {
    expect(normalizeCategoryName('PHARMACOLOGY')).toBe('pharmacology');
    expect(normalizeCategoryName('management of care')).toBe('management_of_care');
  });

  it('returns null for unknown categories', () => {
    expect(normalizeCategoryName('Unknown Category')).toBeNull();
    expect(normalizeCategoryName('')).toBeNull();
  });
});

// ─── calculateCATLevel ────────────────────────────────────────────────────

describe('calculateCATLevel', () => {
  it('returns 3 for empty trace', () => {
    expect(calculateCATLevel([])).toBe(3);
  });

  it('returns exact level for single question', () => {
    expect(calculateCATLevel(makeTrace([4]))).toBe(4);
    expect(calculateCATLevel(makeTrace([1]))).toBe(1);
  });

  it('weights recent questions more heavily', () => {
    // First 4 at level 1, last 1 at level 5 → result should be > 1
    const trace = makeTrace([1, 1, 1, 1, 5]);
    const level = calculateCATLevel(trace);
    expect(level).toBeGreaterThan(1);
    expect(level).toBeLessThan(5);
    // Weight of last question: 5/15 = 0.33 — much stronger pull upward
    expect(level).toBeGreaterThan(2);
  });

  it('uses only the last 20 questions', () => {
    // 25 questions: first 5 at level 5, last 20 all at level 1
    const trace = makeTrace([5, 5, 5, 5, 5, ...Array(20).fill(1)]);
    const level = calculateCATLevel(trace);
    expect(level).toBe(1);
  });

  it('matches manual calculation for small trace', () => {
    // [3, 5] → weights [1, 2], normaliser = 3
    // level = (3*1 + 5*2) / 3 = 13/3 ≈ 4.33
    const level = calculateCATLevel(makeTrace([3, 5]));
    expect(level).toBeCloseTo(4.33, 1);
  });
});

// ─── calculatePassProbability ─────────────────────────────────────────────

describe('calculatePassProbability', () => {
  const acc = emptyBreakdown();

  it('returns 50 at level 3.0 with no adjustments', () => {
    expect(calculatePassProbability(3.0, acc, 'first')).toBe(50);
  });

  it('returns 5 at level 1.0', () => {
    expect(calculatePassProbability(1.0, acc, 'first')).toBe(5);
  });

  it('returns 98 at level 5.0', () => {
    expect(calculatePassProbability(5.0, acc, 'first')).toBe(98);
  });

  it('interpolates between anchor points', () => {
    const l25 = calculatePassProbability(2.5, acc, 'first');
    expect(l25).toBe(35);
    const l35 = calculatePassProbability(3.5, acc, 'first');
    expect(l35).toBe(65);
  });

  it('adds +5% when MOC/Pharm/Safety accuracy > 70%', () => {
    const highAcc = {
      ...acc,
      management_of_care: { correct: 8, total: 10 },
      pharmacology:        { correct: 8, total: 10 },
      safety:              { correct: 8, total: 10 },
    };
    const base    = calculatePassProbability(3.0, acc,     'first');
    const boosted = calculatePassProbability(3.0, highAcc, 'first');
    expect(boosted - base).toBe(5);
  });

  it('subtracts -5% when MOC/Pharm/Safety accuracy < 50%', () => {
    const lowAcc = {
      ...acc,
      management_of_care: { correct: 3, total: 10 },
      pharmacology:        { correct: 3, total: 10 },
      safety:              { correct: 3, total: 10 },
    };
    const base      = calculatePassProbability(3.0, acc,    'first');
    const penalised = calculatePassProbability(3.0, lowAcc, 'first');
    expect(base - penalised).toBe(5);
  });

  it('adds +3% for improving trend', () => {
    const base     = calculatePassProbability(3.0, acc, 'first');
    const improved = calculatePassProbability(3.0, acc, 'improving');
    expect(improved - base).toBe(3);
  });

  it('subtracts -3% for declining trend', () => {
    const base     = calculatePassProbability(3.0, acc, 'first');
    const declined = calculatePassProbability(3.0, acc, 'declining');
    expect(base - declined).toBe(3);
  });

  it('clamps between 0 and 100', () => {
    const highEverything = {
      ...acc,
      management_of_care: { correct: 10, total: 10 },
      pharmacology:        { correct: 10, total: 10 },
      safety:              { correct: 10, total: 10 },
    };
    expect(calculatePassProbability(5.0, highEverything, 'improving')).toBeLessThanOrEqual(100);

    const lowEverything = {
      ...acc,
      management_of_care: { correct: 0, total: 10 },
      pharmacology:        { correct: 0, total: 10 },
      safety:              { correct: 0, total: 10 },
    };
    expect(calculatePassProbability(1.0, lowEverything, 'declining')).toBeGreaterThanOrEqual(0);
  });
});

// ─── calculateTrendDirection ──────────────────────────────────────────────

describe('calculateTrendDirection', () => {
  it('returns "first" when no previous level', () => {
    expect(calculateTrendDirection(3.5, null)).toBe('first');
  });

  it('returns "improving" when delta > 0.1', () => {
    expect(calculateTrendDirection(3.5, 3.0)).toBe('improving');
    expect(calculateTrendDirection(4.0, 3.0)).toBe('improving');
  });

  it('returns "declining" when delta < -0.1', () => {
    expect(calculateTrendDirection(2.8, 3.5)).toBe('declining');
    expect(calculateTrendDirection(2.0, 3.0)).toBe('declining');
  });

  it('returns "stable" for small changes (within ±0.1)', () => {
    expect(calculateTrendDirection(3.05, 3.0)).toBe('stable');
    expect(calculateTrendDirection(2.95, 3.0)).toBe('stable');
    expect(calculateTrendDirection(3.0,  3.0)).toBe('stable');
  });
});

// ─── adaptDifficulty ──────────────────────────────────────────────────────

describe('adaptDifficulty', () => {
  it('increases difficulty on correct answer', () => {
    expect(adaptDifficulty(3, true)).toBe(4);
    expect(adaptDifficulty(2, true)).toBe(3);
  });

  it('decreases difficulty on wrong answer', () => {
    expect(adaptDifficulty(3, false)).toBe(2);
    expect(adaptDifficulty(4, false)).toBe(3);
  });

  it('clamps at max difficulty 5', () => {
    expect(adaptDifficulty(5, true)).toBe(5);
  });

  it('clamps at min difficulty 1', () => {
    expect(adaptDifficulty(1, false)).toBe(1);
  });
});

// ─── selectNextCard ───────────────────────────────────────────────────────

describe('selectNextCard', () => {
  const acc = emptyBreakdown();

  it('returns null when all cards are used', () => {
    const cards = [makeCard('a', 3)];
    expect(selectNextCard(cards, 3, new Set(['a']), acc, 0)).toBeNull();
  });

  it('returns null for empty card pool', () => {
    expect(selectNextCard([], 3, new Set(), acc, 0)).toBeNull();
  });

  it('selects a card at the target difficulty', () => {
    const cards = [makeCard('l2', 2), makeCard('l3', 3), makeCard('l4', 4)];
    const card = selectNextCard(cards, 3, new Set(), acc, 0);
    expect(card?.difficulty_level).toBe(3);
  });

  it('falls back to adjacent difficulty when target is exhausted', () => {
    const cards = [makeCard('l2', 2), makeCard('l4', 4)];
    const card = selectNextCard(cards, 3, new Set(), acc, 0);
    expect(card).not.toBeNull();
    expect([2, 4]).toContain(card?.difficulty_level);
  });

  it('never selects a card in usedCardIds', () => {
    const cards = [makeCard('used', 3), makeCard('fresh', 3)];
    const card = selectNextCard(cards, 3, new Set(['used']), acc, 0);
    expect(card?.id).toBe('fresh');
  });

  it('prefers cards from under-represented categories', () => {
    // Pharmacology (target ~18/150) has 0 questions; Management (target ~29) has 0
    // Both under-represented — just verify we select something
    const cards = [
      makeCard('pharm', 3, 'Pharmacology'),
      makeCard('moc',   3, 'Management of Care'),
    ];
    const card = selectNextCard(cards, 3, new Set(), acc, 0);
    expect(card).not.toBeNull();
  });

  it('handles difficulty above max by falling back', () => {
    const cards = [makeCard('l5', 5)];
    const card = selectNextCard(cards, 6, new Set(), acc, 0); // 6 > max
    expect(card?.difficulty_level).toBe(5);
  });

  it('handles difficulty below min by falling back', () => {
    const cards = [makeCard('l1', 1)];
    const card = selectNextCard(cards, 0, new Set(), acc, 0); // 0 < min
    expect(card?.difficulty_level).toBe(1);
  });
});

// ─── updateCategoryAccuracy ───────────────────────────────────────────────

describe('updateCategoryAccuracy', () => {
  it('increments correct and total on correct answer', () => {
    const updated = updateCategoryAccuracy(emptyBreakdown(), 'Pharmacology', true);
    expect(updated.pharmacology).toEqual({ correct: 1, total: 1 });
  });

  it('increments only total on wrong answer', () => {
    const updated = updateCategoryAccuracy(emptyBreakdown(), 'Safety', false);
    expect(updated.safety).toEqual({ correct: 0, total: 1 });
  });

  it('accumulates across multiple updates', () => {
    let acc = emptyBreakdown();
    acc = updateCategoryAccuracy(acc, 'Pharmacology', true);
    acc = updateCategoryAccuracy(acc, 'Pharmacology', false);
    acc = updateCategoryAccuracy(acc, 'Pharmacology', true);
    expect(acc.pharmacology).toEqual({ correct: 2, total: 3 });
  });

  it('leaves breakdown unchanged for unknown categories', () => {
    const acc     = emptyBreakdown();
    const updated = updateCategoryAccuracy(acc, 'Unknown Category XYZ', true);
    expect(updated).toEqual(acc);
  });

  it('does not mutate the original breakdown', () => {
    const original = emptyBreakdown();
    updateCategoryAccuracy(original, 'Safety', true);
    expect(original.safety).toEqual({ correct: 0, total: 0 });
  });
});

// ─── getBlueprintTargets ──────────────────────────────────────────────────

// ─── sanitizeCardText ─────────────────────────────────────────────────────

describe('sanitizeCardText', () => {
  it('returns empty string unchanged', () => {
    expect(sanitizeCardText('')).toBe('');
  });

  it('passes clean text through untouched', () => {
    const s = 'A patient presents with chest pain radiating to the jaw.';
    expect(sanitizeCardText(s)).toBe(s);
  });

  it('strips inline "per Saunders" references and keeps the rest of the clause', () => {
    const s = 'Patient A likely has stable angina relieved by rest per Saunders; Patient B matches MI.';
    expect(sanitizeCardText(s)).toBe(
      'Patient A likely has stable angina relieved by rest; Patient B matches MI.',
    );
  });

  it('strips trailing "as specified in Saunders ..." phrases', () => {
    const s = 'Maintain BP around 150/100 to ensure cerebral perfusion as specified in Saunders acute stroke management';
    expect(sanitizeCardText(s)).toBe(
      'Maintain BP around 150/100 to ensure cerebral perfusion',
    );
  });

  it('strips "Saunders-specified ..." modifier phrases', () => {
    const s = 'Likely a renal embolus from vegetation fragments per Saunders-specified endocarditis complications';
    expect(sanitizeCardText(s)).toBe(
      'Likely a renal embolus from vegetation fragments',
    );
  });

  it('is case-insensitive on the lead-in', () => {
    const s = 'The oliguric phase produces hyperkalemia Per Saunders Ch. 54. Continue monitoring.';
    expect(sanitizeCardText(s)).toBe('The oliguric phase produces hyperkalemia. Continue monitoring.');
  });

  it('strips "+ NCSBN 2023 Test Plan" source attribution trailers', () => {
    const s = 'Priority intervention at Level 5 + NCSBN 2023 Test Plan';
    expect(sanitizeCardText(s)).toBe('Priority intervention at Level 5');
  });

  it('normalizes extra whitespace and orphan punctuation', () => {
    const s = 'Action A  ,  then action B.';
    expect(sanitizeCardText(s)).toBe('Action A, then action B.');
  });

  it('does not remove the word "stable" in clinical terms like "stable angina"', () => {
    const s = 'Patient A likely has stable angina relieved by rest.';
    expect(sanitizeCardText(s)).toBe(s);
  });
});

describe('getBlueprintTargets', () => {
  it('produces correct targets for 150-question session', () => {
    const targets = getBlueprintTargets(150);
    expect(targets.management_of_care).toBe(29);  // round(0.19 × 150)
    expect(targets.safety).toBe(20);              // round(0.13 × 150)
    expect(targets.pharmacology).toBe(18);        // round(0.12 × 150)
  });

  it('all targets are positive integers', () => {
    const targets = getBlueprintTargets(150);
    for (const val of Object.values(targets)) {
      expect(val).toBeGreaterThan(0);
      expect(Number.isInteger(val)).toBe(true);
    }
  });
});
