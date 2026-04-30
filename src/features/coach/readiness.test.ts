// src/features/coach/readiness.test.ts

import { describe, expect, it } from 'vitest';

import type { CategoryAccuracy } from './coach.types';
import {
  calculateProjectedPP,
  calculateReadinessScore,
  calculateRiskFlags,
  calculateRiskLevel,
  calculateVelocity,
} from './readiness';

function cat(category: string, correct: number, total: number): CategoryAccuracy {
  return { category, correct, total, accuracy: total > 0 ? correct / total : 0 };
}

function fullCoverage(passingFraction: number): CategoryAccuracy[] {
  // 8 categories; first N pass, rest fail at 30% accuracy.
  const cats: CategoryAccuracy[] = [];
  const passing = Math.round(passingFraction * 8);
  const names = [
    'Management of Care', 'Safety', 'Pharmacology', 'Physiological Adaptation',
    'Reduction of Risk', 'Basic Care', 'Health Promotion', 'Psychosocial',
  ];
  for (let i = 0; i < 8; i++) {
    if (i < passing) cats.push(cat(names[i], 9, 12));   // 75%
    else cats.push(cat(names[i], 3, 10));               // 30%
  }
  return cats;
}

// ─── readinessScore ──────────────────────────────────────────────────

describe('calculateReadinessScore', () => {
  it('returns 0 when no signal exists', () => {
    expect(calculateReadinessScore({})).toBe(0);
  });

  it('weights CAT level at 40%', () => {
    const score = calculateReadinessScore({ cat_level: 5 });
    // Just CAT contribution: 0.4 * (5/5)*100 = 40
    expect(score).toBe(40);
  });

  it('weights consistency at 20%', () => {
    const score = calculateReadinessScore({ active_days_last_14: 14 });
    // Just consistency: 0.2 * 100 = 20
    expect(score).toBe(20);
  });

  it('weights category coverage at 20% normalised against 8 categories', () => {
    // 4 of 8 categories above 60% with >=5 questions
    const cats = fullCoverage(0.5);
    const score = calculateReadinessScore({ category_accuracy: cats });
    // Coverage: 4/8 = 50, weighted 0.2 → 10. NGN fallback uses overall accuracy:
    // 4 cats at 9/12 + 4 at 3/10 = (36+12)/(48+40) = 48/88 ≈ 0.5455 → 54.55, weighted 0.1 → 5.45
    // Total ≈ 10 + 5.45 ≈ 15.45 → rounds to 15
    expect(score).toBeGreaterThanOrEqual(14);
    expect(score).toBeLessThanOrEqual(16);
  });

  it('skips categories below the 5-question threshold for coverage', () => {
    const cats: CategoryAccuracy[] = [
      cat('Management of Care', 4, 4),  // 100% but only 4 questions — no credit
      cat('Safety',             8, 10), // 80%, qualifies
    ];
    const score = calculateReadinessScore({ category_accuracy: cats });
    // Coverage: 1/8 = 12.5, weighted 0.2 → 2.5
    // NGN fallback: (4+8)/(4+10) = 12/14 ≈ 0.857 → 85.7, weighted 0.1 → 8.57
    expect(score).toBe(11); // 2.5 + 8.57 = 11.07 → 11
  });

  it('weights NGN performance at 10% when present', () => {
    const score = calculateReadinessScore({ ngn_accuracy: 1 });
    expect(score).toBe(10);
  });

  it('weights SR compliance at 10%', () => {
    const score = calculateReadinessScore({ sr_compliance: 1 });
    expect(score).toBe(10);
  });

  it('combines all five components', () => {
    const score = calculateReadinessScore({
      cat_level: 4,                                    // 0.4 * 80 = 32
      category_accuracy: fullCoverage(1),              // 0.2 * 100 = 20 (8/8 above)
      active_days_last_14: 14,                         // 0.2 * 100 = 20
      ngn_accuracy: 0.8,                               // 0.1 * 80  = 8
      sr_compliance: 0.9,                              // 0.1 * 90  = 9
    });
    expect(score).toBe(89);
  });

  it('clamps to 0..100', () => {
    expect(calculateReadinessScore({ cat_level: 10 })).toBeLessThanOrEqual(100);
    expect(calculateReadinessScore({ active_days_last_14: -5 })).toBeGreaterThanOrEqual(0);
  });
});

// ─── riskLevel ────────────────────────────────────────────────────────

describe('calculateRiskLevel', () => {
  it('returns red when readiness < 50', () => {
    expect(calculateRiskLevel({ readiness_score: 49 })).toBe('red');
  });

  it('returns red when test < 14d AND readiness < 65', () => {
    expect(calculateRiskLevel({
      readiness_score: 60,
      days_to_test: 10,
    })).toBe('red');
  });

  it('returns red when pass_probability < 40', () => {
    expect(calculateRiskLevel({
      readiness_score: 80,
      pass_probability: 35,
    })).toBe('red');
  });

  it('returns amber when readiness in [50, 70)', () => {
    expect(calculateRiskLevel({ readiness_score: 50 })).toBe('amber');
    expect(calculateRiskLevel({ readiness_score: 69 })).toBe('amber');
  });

  it('returns amber when 3 <= daysSinceActive < 7', () => {
    expect(calculateRiskLevel({
      readiness_score: 80,
      days_since_active: 4,
    })).toBe('amber');
  });

  it('returns amber when 40 <= pass_probability < 60', () => {
    expect(calculateRiskLevel({
      readiness_score: 80,
      pass_probability: 50,
    })).toBe('amber');
  });

  it('returns green for healthy metrics', () => {
    expect(calculateRiskLevel({
      readiness_score: 80,
      pass_probability: 75,
      days_since_active: 1,
    })).toBe('green');
  });

  it('boundary: readiness=50 → amber, not red', () => {
    expect(calculateRiskLevel({ readiness_score: 50 })).toBe('amber');
  });

  it('boundary: readiness=70 → green', () => {
    expect(calculateRiskLevel({ readiness_score: 70 })).toBe('green');
  });
});

// ─── riskFlags ───────────────────────────────────────────────────────

describe('calculateRiskFlags', () => {
  it('no flags for healthy metrics', () => {
    const flags = calculateRiskFlags({
      cat_level: 4,
      cat_velocity: 0.2,
      pass_probability: 80,
      days_to_test: 60,
      days_since_active: 1,
      category_accuracy: fullCoverage(1),
    });
    expect(flags).toEqual([]);
  });

  it('flags inactivity at >=3 days', () => {
    const flags = calculateRiskFlags({
      cat_level: 4,
      days_since_active: 5,
    });
    expect(flags).toContain('Not active in 5 days');
  });

  it('flags declining CAT velocity', () => {
    const flags = calculateRiskFlags({
      cat_level: 4,
      cat_velocity: -0.5,
    });
    expect(flags).toContain('CAT level declining');
  });

  it('flags low pass probability', () => {
    const flags = calculateRiskFlags({
      cat_level: 3,
      pass_probability: 35,
    });
    expect(flags).toContain('Pass probability below 50%');
  });

  it('flags imminent test with low CAT level', () => {
    const flags = calculateRiskFlags({
      cat_level: 2.5,
      days_to_test: 20,
    });
    expect(flags).toContain('Test in 20 days - not yet at passing level');
  });

  it('flags missing CAT', () => {
    const flags = calculateRiskFlags({});
    expect(flags).toContain('No CAT taken yet');
  });

  it('flags pharmacology below 50% with >=5 questions', () => {
    const flags = calculateRiskFlags({
      cat_level: 3,
      category_accuracy: [cat('Pharmacology', 2, 8)],
    });
    expect(flags).toContain('Pharmacology below 50%');
  });

  it('flags Management of Care below 50% with >=5 questions', () => {
    const flags = calculateRiskFlags({
      cat_level: 3,
      category_accuracy: [cat('Management of Care', 2, 7)],
    });
    expect(flags).toContain('Management of Care below 50%');
  });

  it('does NOT flag low-accuracy category with <5 questions', () => {
    const flags = calculateRiskFlags({
      cat_level: 3,
      category_accuracy: [cat('Pharmacology', 1, 4)],
    });
    expect(flags).not.toContain('Pharmacology below 50%');
  });
});

// ─── velocity ────────────────────────────────────────────────────────

describe('calculateVelocity', () => {
  it('returns null for invalid dates', () => {
    expect(calculateVelocity(4, 'not-a-date', 3, 'also-not')).toBeNull();
  });

  it('returns null when previous time >= latest time (same-day or backwards)', () => {
    const now = '2026-04-01T12:00:00Z';
    expect(calculateVelocity(4, now, 3, now)).toBeNull();
  });

  it('computes positive velocity over 1 week', () => {
    const v = calculateVelocity(
      4, '2026-04-08T00:00:00Z',
      3, '2026-04-01T00:00:00Z',
    );
    expect(v).toBeCloseTo(1, 5);
  });

  it('computes negative velocity for declining', () => {
    const v = calculateVelocity(
      2, '2026-04-08T00:00:00Z',
      3, '2026-04-01T00:00:00Z',
    );
    expect(v).toBeCloseTo(-1, 5);
  });
});

// ─── projected PP ────────────────────────────────────────────────────

describe('calculateProjectedPP', () => {
  it('returns null without velocity', () => {
    expect(calculateProjectedPP(3.5, null, 30)).toBeNull();
  });

  it('returns null without test date', () => {
    expect(calculateProjectedPP(3.5, 0.2, null)).toBeNull();
  });

  it('projects upward with positive velocity', () => {
    // catLevel 3, velocity +0.2/wk, 28 days = 4 weeks → projected 3.8
    // 3.8 maps near anchor 3.5(65) -> 4.0(80), interpolated to ~74
    const pp = calculateProjectedPP(3, 0.2, 28);
    expect(pp).toBeGreaterThanOrEqual(70);
    expect(pp).toBeLessThanOrEqual(80);
  });

  it('clamps projection to level 5 maximum', () => {
    const pp = calculateProjectedPP(4, 5, 60);
    // Projected level would be 4 + 5*60/7 ≈ 46.86, clamped to 5 → 98
    expect(pp).toBe(98);
  });

  it('clamps projection to level 1 minimum', () => {
    const pp = calculateProjectedPP(2, -2, 60);
    // Projected level would be 2 + (-2)*60/7 ≈ -15.14, clamped to 1 → 5
    expect(pp).toBe(5);
  });

  it('returns ~50% at projected level 3 (anchor)', () => {
    const pp = calculateProjectedPP(3, 0, 14);
    expect(pp).toBe(50);
  });
});
