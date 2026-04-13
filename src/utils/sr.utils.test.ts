/**
 * SR Engine Unit Tests
 * 
 * Every function in sr.utils.ts has a corresponding test block here.
 * Every test answers ONE specific question about ONE specific behavior.
 * 
 * Test naming convention:
 *   [function name] > [condition being tested] > [expected result]
 * 
 * Owner: Junior Engineer 4 (SR Engine)
 * Run with: npm run test
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  getCategoryWeight,
  getDifficultyMultiplier,
  isUrgencyMode,
  srScore,
  buildSRPool,
  updateEaseFactor,
  calculateIntervalDays,
  calculateNextReview,
  getNewCards,
  getMissedCards,
  calculateXP,
  calculateAccuracy,
  getProjectedReadyDate,
} from '../utils/sr.utils';

import {
  SR_CATEGORY_WEIGHTS,
  SM2_EASE_FACTOR_MIN,
  SM2_EASE_FACTOR_MAX,
  INTERVAL_URGENCY_CAP_DAYS,
  INTERVAL_MAX_DAYS,
  INTERVAL_WRONG_DAYS,
  NEVER_SEEN_SCORE,
  URGENCY_MODE_THRESHOLD_DAYS,
} from '../config/sr.config';

import type {
  Card,
  CardProgress,
  CardProgressMap,
  DifficultyLevel,
} from '../types/index';

// ─── Test Fixtures ─────────────────────────────────────────────────────────
// Shared test data. Defined once here, used across all tests.
// Changing a fixture propagates to all tests that use it — intentional.

const makeCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'card-001',
  title: 'Test Card',
  cat: 'Management of Care',
  question: 'What is the priority action?',
  opt_a: 'Option A',
  opt_b: 'Option B',
  opt_c: 'Option C',
  opt_d: 'Option D',
  correct: 1,
  difficulty_level: 3,
  difficulty_label: 'Analysis',
  xp: 25,
  pearl: 'Study pearl here',
  layer_1: 'Layer 1',
  layer_2: 'Layer 2',
  layer_3: 'Layer 3',
  layer_4: 'Layer 4',
  why_wrong_a: 'Why A is wrong',
  why_wrong_b: '',
  why_wrong_c: 'Why C is wrong',
  why_wrong_d: 'Why D is wrong',
  ...overrides,
});

const makeProgress = (overrides: Partial<CardProgress> = {}): CardProgress => ({
  card_id: 'card-001',
  student_id: 'student-001',
  times_seen: 3,
  times_correct: 2,
  times_wrong: 1,
  ease_factor: 2.5,
  next_review: new Date(Date.now() - 86_400_000).toISOString(), // overdue by 1 day
  last_seen: new Date().toISOString(),
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// getCategoryWeight
// ═══════════════════════════════════════════════════════════════════════════

describe('getCategoryWeight', () => {
  it('returns 1.3 for Management of Care', () => {
    expect(getCategoryWeight('Management of Care')).toBe(1.3);
  });

  it('returns 1.3 for MOC shorthand', () => {
    expect(getCategoryWeight('MOC')).toBe(1.3);
  });

  it('returns 1.2 for Safety and Infection Control', () => {
    expect(getCategoryWeight('Safety and Infection Control')).toBe(1.2);
  });

  it('returns 1.2 for Pharmacology', () => {
    expect(getCategoryWeight('Pharmacology')).toBe(1.2);
  });

  it('returns 1.2 for Physiological Adaptation', () => {
    expect(getCategoryWeight('Physiological Adaptation')).toBe(1.2);
  });

  it('returns 1.1 for Reduction of Risk', () => {
    expect(getCategoryWeight('Reduction of Risk')).toBe(1.1);
  });

  it('returns 1.0 for Basic Care & Comfort', () => {
    expect(getCategoryWeight('Basic Care & Comfort')).toBe(1.0);
  });

  it('returns 1.0 for Health Promotion', () => {
    expect(getCategoryWeight('Health Promotion')).toBe(1.0);
  });

  it('returns 1.0 for Psychosocial Integrity', () => {
    expect(getCategoryWeight('Psychosocial Integrity')).toBe(1.0);
  });

  it('returns 1.0 (default) for an unrecognized category', () => {
    expect(getCategoryWeight('Unknown Category')).toBe(1.0);
  });

  it('returns 1.0 for an empty string', () => {
    expect(getCategoryWeight('')).toBe(1.0);
  });

  it('MOC weight is strictly greater than Basic Care weight', () => {
    const mocWeight = getCategoryWeight('Management of Care');
    const bccWeight = getCategoryWeight('Basic Care & Comfort');
    expect(mocWeight).toBeGreaterThan(bccWeight);
  });

  it('all defined weights are between 1.0 and 1.5 inclusive', () => {
    Object.values(SR_CATEGORY_WEIGHTS).forEach((weight) => {
      expect(weight).toBeGreaterThanOrEqual(1.0);
      expect(weight).toBeLessThanOrEqual(1.5);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getDifficultyMultiplier
// ═══════════════════════════════════════════════════════════════════════════

describe('getDifficultyMultiplier', () => {
  it('returns 1.5 for level 1 (Foundation)', () => {
    expect(getDifficultyMultiplier(1)).toBe(1.5);
  });

  it('returns 1.5 for level 2 (Application)', () => {
    expect(getDifficultyMultiplier(2)).toBe(1.5);
  });

  it('returns 2.0 for level 3 (Analysis) — standard interval', () => {
    expect(getDifficultyMultiplier(3)).toBe(2.0);
  });

  it('returns 2.5 for level 4 (Complex)', () => {
    expect(getDifficultyMultiplier(4)).toBe(2.5);
  });

  it('returns 2.5 for level 5 (Expert)', () => {
    expect(getDifficultyMultiplier(5)).toBe(2.5);
  });

  it('level 5 multiplier is greater than level 1 multiplier', () => {
    expect(getDifficultyMultiplier(5)).toBeGreaterThan(getDifficultyMultiplier(1));
  });

  it('level 3 multiplier is exactly between level 1 and level 5', () => {
    const l1 = getDifficultyMultiplier(1);
    const l3 = getDifficultyMultiplier(3);
    const l5 = getDifficultyMultiplier(5);
    expect(l3).toBeGreaterThan(l1);
    expect(l3).toBeLessThan(l5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// isUrgencyMode
// ═══════════════════════════════════════════════════════════════════════════

describe('isUrgencyMode', () => {
  it('returns true when testDays equals the threshold (30)', () => {
    expect(isUrgencyMode(30)).toBe(true);
  });

  it('returns true when testDays is 1 (exam tomorrow)', () => {
    expect(isUrgencyMode(1)).toBe(true);
  });

  it('returns true when testDays is 15 (2 weeks out)', () => {
    expect(isUrgencyMode(15)).toBe(true);
  });

  it('returns false when testDays is 31 (just outside threshold)', () => {
    expect(isUrgencyMode(31)).toBe(false);
  });

  it('returns false when testDays is 90 (3 months out)', () => {
    expect(isUrgencyMode(90)).toBe(false);
  });

  it('returns false when testDays is 0 (no date set)', () => {
    expect(isUrgencyMode(0)).toBe(false);
  });

  it('returns false for negative testDays (invalid state)', () => {
    expect(isUrgencyMode(-5)).toBe(false);
  });

  it('the threshold value itself (30) triggers urgency mode', () => {
    expect(isUrgencyMode(URGENCY_MODE_THRESHOLD_DAYS)).toBe(true);
  });

  it('one day above the threshold (31) does NOT trigger urgency mode', () => {
    expect(isUrgencyMode(URGENCY_MODE_THRESHOLD_DAYS + 1)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// srScore
// ═══════════════════════════════════════════════════════════════════════════

describe('srScore', () => {
  it('returns NEVER_SEEN_SCORE (9999) for a card with no progress entry', () => {
    const card = makeCard();
    const score = srScore(card, {});
    expect(score).toBe(NEVER_SEEN_SCORE);
  });

  it('returns NEVER_SEEN_SCORE for a card with times_seen of 0', () => {
    const card = makeCard();
    const progressMap: CardProgressMap = {
      'card-001': makeProgress({ times_seen: 0 }),
    };
    const score = srScore(card, progressMap);
    expect(score).toBe(NEVER_SEEN_SCORE);
  });

  it('returns a positive score for an overdue card', () => {
    const card = makeCard();
    const progressMap: CardProgressMap = {
      'card-001': makeProgress({
        next_review: new Date(Date.now() - 86_400_000).toISOString(), // 1 day overdue
      }),
    };
    const score = srScore(card, progressMap);
    expect(score).toBeGreaterThan(0);
  });

  it('returns a negative score for a card not yet due', () => {
    const card = makeCard();
    const progressMap: CardProgressMap = {
      'card-001': makeProgress({
        next_review: new Date(Date.now() + 86_400_000).toISOString(), // due tomorrow
      }),
    };
    const score = srScore(card, progressMap);
    expect(score).toBeLessThan(0);
  });

  it('MOC card scores higher than an identical Basic Care card when both overdue', () => {
    const overdueSameTime = new Date(Date.now() - 86_400_000).toISOString();
    const progress = makeProgress({ next_review: overdueSameTime });

    const mocCard = makeCard({ id: 'moc-1', cat: 'Management of Care' });
    const bccCard = makeCard({ id: 'bcc-1', cat: 'Basic Care & Comfort' });

    const progressMap: CardProgressMap = {
      'moc-1': { ...progress, card_id: 'moc-1' },
      'bcc-1': { ...progress, card_id: 'bcc-1' },
    };

    expect(srScore(mocCard, progressMap)).toBeGreaterThan(srScore(bccCard, progressMap));
  });

  it('Pharmacology card scores higher than Psychosocial card when both overdue equally', () => {
    const overdue = new Date(Date.now() - 86_400_000).toISOString();

    const pharmCard = makeCard({ id: 'pharm-1', cat: 'Pharmacology' });
    const psychCard = makeCard({ id: 'psych-1', cat: 'Psychosocial Integrity' });

    const progressMap: CardProgressMap = {
      'pharm-1': makeProgress({ card_id: 'pharm-1', next_review: overdue }),
      'psych-1': makeProgress({ card_id: 'psych-1', next_review: overdue }),
    };

    expect(srScore(pharmCard, progressMap)).toBeGreaterThan(srScore(psychCard, progressMap));
  });

  it('a more overdue card scores higher than a less overdue card in the same category', () => {
    const moreOverdue = new Date(Date.now() - 7 * 86_400_000).toISOString();  // 7 days ago
    const lessOverdue = new Date(Date.now() - 1 * 86_400_000).toISOString();  // 1 day ago

    const card1 = makeCard({ id: 'card-1', cat: 'Pharmacology' });
    const card2 = makeCard({ id: 'card-2', cat: 'Pharmacology' });

    const progressMap: CardProgressMap = {
      'card-1': makeProgress({ card_id: 'card-1', next_review: moreOverdue }),
      'card-2': makeProgress({ card_id: 'card-2', next_review: lessOverdue }),
    };

    expect(srScore(card1, progressMap)).toBeGreaterThan(srScore(card2, progressMap));
  });

  it('a card with higher ease_factor scores higher when equally overdue', () => {
    const overdue = new Date(Date.now() - 86_400_000).toISOString();

    const card1 = makeCard({ id: 'card-1' });
    const card2 = makeCard({ id: 'card-2' });

    const progressMap: CardProgressMap = {
      'card-1': makeProgress({ card_id: 'card-1', ease_factor: 3.0, next_review: overdue }),
      'card-2': makeProgress({ card_id: 'card-2', ease_factor: 1.5, next_review: overdue }),
    };

    expect(srScore(card1, progressMap)).toBeGreaterThan(srScore(card2, progressMap));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildSRPool
// ═══════════════════════════════════════════════════════════════════════════

describe('buildSRPool', () => {
  it('returns an empty array when given an empty card list', () => {
    const result = buildSRPool([], {}, 10);
    expect(result).toHaveLength(0);
  });

  it('returns exactly count cards when pool is larger than count', () => {
    const cards = Array.from({ length: 20 }, (_, i) =>
      makeCard({ id: `card-${i}` })
    );
    const result = buildSRPool(cards, {}, 10);
    expect(result).toHaveLength(10);
  });

  it('returns all cards when count is larger than pool size', () => {
    const cards = [makeCard({ id: 'card-1' }), makeCard({ id: 'card-2' })];
    const result = buildSRPool(cards, {}, 50);
    expect(result).toHaveLength(2);
  });

  it('places never-seen cards before seen cards', () => {
    const seenCard = makeCard({ id: 'seen-card' });
    const unseenCard = makeCard({ id: 'unseen-card' });

    const progressMap: CardProgressMap = {
      'seen-card': makeProgress({
        card_id: 'seen-card',
        times_seen: 5,
        next_review: new Date(Date.now() - 86_400_000).toISOString(),
      }),
    };

    const result = buildSRPool([seenCard, unseenCard], progressMap, 2);
    expect(result[0].id).toBe('unseen-card');
  });

  it('sorts overdue cards before upcoming cards', () => {
    const overdueCard = makeCard({ id: 'overdue' });
    const upcomingCard = makeCard({ id: 'upcoming' });

    const progressMap: CardProgressMap = {
      overdue: makeProgress({
        card_id: 'overdue',
        next_review: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      }),
      upcoming: makeProgress({
        card_id: 'upcoming',
        next_review: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      }),
    };

    const result = buildSRPool([upcomingCard, overdueCard], progressMap, 2);
    expect(result[0].id).toBe('overdue');
  });

  it('does not mutate the original cards array', () => {
    const cards = [
      makeCard({ id: 'card-1' }),
      makeCard({ id: 'card-2' }),
    ];
    const originalOrder = cards.map((c) => c.id);

    buildSRPool(cards, {}, 2);

    expect(cards.map((c) => c.id)).toEqual(originalOrder);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// updateEaseFactor
// ═══════════════════════════════════════════════════════════════════════════

describe('updateEaseFactor', () => {
  it('increases ease_factor by 0.1 on a correct answer', () => {
    const result = updateEaseFactor(2.5, true);
    expect(result).toBeCloseTo(2.6);
  });

  it('decreases ease_factor by 0.2 on a wrong answer', () => {
    const result = updateEaseFactor(2.5, false);
    expect(result).toBeCloseTo(2.3);
  });

  it('does not exceed SM2_EASE_FACTOR_MAX (3.5) on correct answer', () => {
    const result = updateEaseFactor(3.5, true);
    expect(result).toBe(SM2_EASE_FACTOR_MAX);
  });

  it('does not go below SM2_EASE_FACTOR_MIN (1.3) on wrong answer', () => {
    const result = updateEaseFactor(1.3, false);
    expect(result).toBe(SM2_EASE_FACTOR_MIN);
  });

  it('clamps to max when already at max', () => {
    const result = updateEaseFactor(SM2_EASE_FACTOR_MAX, true);
    expect(result).toBe(SM2_EASE_FACTOR_MAX);
  });

  it('clamps to min when already at min', () => {
    const result = updateEaseFactor(SM2_EASE_FACTOR_MIN, false);
    expect(result).toBe(SM2_EASE_FACTOR_MIN);
  });

  it('multiple correct answers gradually increase ease_factor', () => {
    let ef = 2.5;
    ef = updateEaseFactor(ef, true);
    ef = updateEaseFactor(ef, true);
    ef = updateEaseFactor(ef, true);
    expect(ef).toBeCloseTo(2.8);
  });

  it('multiple wrong answers gradually decrease ease_factor until clamped', () => {
    let ef = 2.5;
    ef = updateEaseFactor(ef, false); // 2.3
    ef = updateEaseFactor(ef, false); // 2.1
    ef = updateEaseFactor(ef, false); // 1.9
    ef = updateEaseFactor(ef, false); // 1.7
    ef = updateEaseFactor(ef, false); // 1.5
    ef = updateEaseFactor(ef, false); // 1.3
    ef = updateEaseFactor(ef, false); // clamped at 1.3
    expect(ef).toBe(SM2_EASE_FACTOR_MIN);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calculateIntervalDays
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateIntervalDays', () => {
  const baseParams = {
    wasCorrect: true,
    easeFactor: 2.5,
    difficultyLevel: 3 as DifficultyLevel,
    timesCorrect: 3,
    testDays: 90,
  };

  it('always returns 1 when the answer was wrong', () => {
    const result = calculateIntervalDays({ ...baseParams, wasCorrect: false });
    expect(result).toBe(INTERVAL_WRONG_DAYS);
  });

  it('returns at least 1 day for a correct answer', () => {
    const result = calculateIntervalDays({ ...baseParams, timesCorrect: 1 });
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('returns a longer interval for level 5 vs level 1 with same ease_factor', () => {
    const l1Interval = calculateIntervalDays({
      ...baseParams, difficultyLevel: 1,
    });
    const l5Interval = calculateIntervalDays({
      ...baseParams, difficultyLevel: 5,
    });
    expect(l5Interval).toBeGreaterThan(l1Interval);
  });

  it('interval grows with more correct answers', () => {
    const fewCorrect = calculateIntervalDays({ ...baseParams, timesCorrect: 2 });
    const manyCorrect = calculateIntervalDays({ ...baseParams, timesCorrect: 8 });
    expect(manyCorrect).toBeGreaterThan(fewCorrect);
  });

  it('caps interval at 7 days in urgency mode (testDays = 15)', () => {
    const result = calculateIntervalDays({
      ...baseParams,
      easeFactor: 3.5,
      timesCorrect: 20,  // would produce very long interval without cap
      testDays: 15,
    });
    expect(result).toBeLessThanOrEqual(INTERVAL_URGENCY_CAP_DAYS);
  });

  it('caps interval at 7 days when testDays = 30 (boundary)', () => {
    const result = calculateIntervalDays({
      ...baseParams,
      easeFactor: 3.5,
      timesCorrect: 20,
      testDays: 30,
    });
    expect(result).toBeLessThanOrEqual(INTERVAL_URGENCY_CAP_DAYS);
  });

  it('does NOT cap at 7 days when testDays = 31 (just outside urgency)', () => {
    const result = calculateIntervalDays({
      ...baseParams,
      easeFactor: 3.5,
      timesCorrect: 20,
      testDays: 31,
    });
    expect(result).toBeGreaterThan(INTERVAL_URGENCY_CAP_DAYS);
  });

  it('caps interval at INTERVAL_MAX_DAYS (60) outside urgency mode', () => {
    const result = calculateIntervalDays({
      ...baseParams,
      easeFactor: 3.5,
      timesCorrect: 100,  // enormous — should cap at 60
      testDays: 365,
    });
    expect(result).toBeLessThanOrEqual(INTERVAL_MAX_DAYS);
  });

  it('returns 1 day minimum even for first correct answer', () => {
    const result = calculateIntervalDays({
      ...baseParams,
      timesCorrect: 1,
      easeFactor: 1.3,  // minimum ease
    });
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('wrong answer ignores all other parameters and returns 1', () => {
    const result = calculateIntervalDays({
      wasCorrect: false,
      easeFactor: 3.5,
      difficultyLevel: 5,
      timesCorrect: 100,
      testDays: 365,
    });
    expect(result).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calculateNextReview
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateNextReview', () => {
  const baseInput = {
    existing: makeProgress(),
    wasCorrect: true,
    difficultyLevel: 3 as DifficultyLevel,
    testDays: 90,
  };

  it('returns an object with ease_factor, interval_days, and next_review', () => {
    const result = calculateNextReview(baseInput);
    expect(result).toHaveProperty('ease_factor');
    expect(result).toHaveProperty('interval_days');
    expect(result).toHaveProperty('next_review');
  });

  it('next_review is a valid ISO date string', () => {
    const result = calculateNextReview(baseInput);
    expect(() => new Date(result.next_review)).not.toThrow();
    expect(new Date(result.next_review).toISOString()).toBe(result.next_review);
  });

  it('next_review is in the future for a correct answer', () => {
    const result = calculateNextReview(baseInput);
    expect(new Date(result.next_review).getTime()).toBeGreaterThan(Date.now());
  });

  it('next_review is 1 day from now for a wrong answer', () => {
    const result = calculateNextReview({ ...baseInput, wasCorrect: false });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const diffMs = Math.abs(
      new Date(result.next_review).getTime() - tomorrow.getTime()
    );
    // Within 5 seconds of "tomorrow" — accounts for test execution time
    expect(diffMs).toBeLessThan(5000);
  });

  it('ease_factor increases on correct answer', () => {
    const result = calculateNextReview(baseInput);
    expect(result.ease_factor).toBeGreaterThan(baseInput.existing.ease_factor);
  });

  it('ease_factor decreases on wrong answer', () => {
    const result = calculateNextReview({ ...baseInput, wasCorrect: false });
    expect(result.ease_factor).toBeLessThan(baseInput.existing.ease_factor);
  });

  it('interval_days is capped at 7 in urgency mode', () => {
    const result = calculateNextReview({ ...baseInput, testDays: 14 });
    expect(result.interval_days).toBeLessThanOrEqual(INTERVAL_URGENCY_CAP_DAYS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getNewCards
// ═══════════════════════════════════════════════════════════════════════════

describe('getNewCards', () => {
  it('returns all cards when progress map is empty', () => {
    const cards = [makeCard({ id: 'card-1' }), makeCard({ id: 'card-2' })];
    const result = getNewCards(cards, {});
    expect(result).toHaveLength(2);
  });

  it('excludes cards with times_seen > 0', () => {
    const cards = [makeCard({ id: 'seen' }), makeCard({ id: 'unseen' })];
    const progressMap: CardProgressMap = {
      seen: makeProgress({ card_id: 'seen', times_seen: 1 }),
    };
    const result = getNewCards(cards, progressMap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('unseen');
  });

  it('includes a card with times_seen of 0', () => {
    const cards = [makeCard({ id: 'card-1' })];
    const progressMap: CardProgressMap = {
      'card-1': makeProgress({ times_seen: 0 }),
    };
    const result = getNewCards(cards, progressMap);
    expect(result).toHaveLength(1);
  });

  it('returns an empty array when all cards have been seen', () => {
    const cards = [makeCard({ id: 'card-1' }), makeCard({ id: 'card-2' })];
    const progressMap: CardProgressMap = {
      'card-1': makeProgress({ card_id: 'card-1', times_seen: 3 }),
      'card-2': makeProgress({ card_id: 'card-2', times_seen: 1 }),
    };
    const result = getNewCards(cards, progressMap);
    expect(result).toHaveLength(0);
  });

  it('returns an empty array when given no cards', () => {
    const result = getNewCards([], {});
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getMissedCards
// ═══════════════════════════════════════════════════════════════════════════

describe('getMissedCards', () => {
  it('returns only cards with times_wrong > 0', () => {
    const missedCard = makeCard({ id: 'missed' });
    const correctCard = makeCard({ id: 'correct' });

    const progressMap: CardProgressMap = {
      missed: makeProgress({ card_id: 'missed', times_wrong: 2 }),
      correct: makeProgress({ card_id: 'correct', times_wrong: 0 }),
    };

    const result = getMissedCards([missedCard, correctCard], progressMap);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('missed');
  });

  it('excludes cards with no progress entry', () => {
    const card = makeCard({ id: 'card-1' });
    const result = getMissedCards([card], {});
    expect(result).toHaveLength(0);
  });

  it('excludes cards with times_wrong of 0', () => {
    const card = makeCard({ id: 'card-1' });
    const progressMap: CardProgressMap = {
      'card-1': makeProgress({ times_wrong: 0 }),
    };
    const result = getMissedCards([card], progressMap);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no cards have been missed', () => {
    const cards = [makeCard({ id: 'card-1' }), makeCard({ id: 'card-2' })];
    const progressMap: CardProgressMap = {
      'card-1': makeProgress({ card_id: 'card-1', times_wrong: 0 }),
      'card-2': makeProgress({ card_id: 'card-2', times_wrong: 0 }),
    };
    const result = getMissedCards(cards, progressMap);
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calculateXP
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateXP', () => {
  it('returns 50 base XP for 0 correct answers', () => {
    expect(calculateXP(0)).toBe(50);
  });

  it('returns 70 XP for 1 correct answer (50 base + 20)', () => {
    expect(calculateXP(1)).toBe(70);
  });

  it('returns 250 XP for 10 correct answers (50 + 200)', () => {
    expect(calculateXP(10)).toBe(250);
  });

  it('each correct answer adds exactly 20 XP', () => {
    const base = calculateXP(0);
    const oneCorrect = calculateXP(1);
    expect(oneCorrect - base).toBe(20);
  });

  it('returns at least 50 for negative input (defensive)', () => {
    expect(calculateXP(-1)).toBeGreaterThanOrEqual(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calculateAccuracy
// ═══════════════════════════════════════════════════════════════════════════

describe('calculateAccuracy', () => {
  it('returns 100 when all answers are correct', () => {
    expect(calculateAccuracy(10, 10)).toBe(100);
  });

  it('returns 0 when no answers are correct', () => {
    expect(calculateAccuracy(0, 10)).toBe(0);
  });

  it('returns 50 for half correct', () => {
    expect(calculateAccuracy(5, 10)).toBe(50);
  });

  it('returns 0 when total is 0 (prevents division by zero)', () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });

  it('rounds to the nearest integer', () => {
    // 1/3 = 33.333... → rounds to 33
    expect(calculateAccuracy(1, 3)).toBe(33);
  });

  it('returns a value between 0 and 100 inclusive', () => {
    const result = calculateAccuracy(7, 10);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getProjectedReadyDate
// ═══════════════════════════════════════════════════════════════════════════

describe('getProjectedReadyDate', () => {
  it('returns a valid ISO date string', () => {
    const result = getProjectedReadyDate(35);
    expect(() => new Date(result)).not.toThrow();
  });

  it('returns a date in the future', () => {
    const result = getProjectedReadyDate(35);
    expect(new Date(result).getTime()).toBeGreaterThan(Date.now());
  });

  it('25 cards/day projects further out than 50 cards/day', () => {
    const slow = getProjectedReadyDate(25);
    const fast = getProjectedReadyDate(50);
    expect(new Date(slow).getTime()).toBeGreaterThan(new Date(fast).getTime());
  });

  it('projects approximately 57 days for 35 cards/day (2000 cards)', () => {
    const result = getProjectedReadyDate(35, 2000);
    const daysFromNow =
      (new Date(result).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    // 2000 / 35 = 57.14 → ceil = 58 days
    expect(Math.round(daysFromNow)).toBeCloseTo(58, 0);
  });

  it('projects 80 days for 25 cards/day (2000 cards)', () => {
    const result = getProjectedReadyDate(25, 2000);
    const daysFromNow =
      (new Date(result).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    // 2000 / 25 = 80 days
    expect(Math.round(daysFromNow)).toBeCloseTo(80, 0);
  });

  it('throws when cardsPerDay is 0', () => {
    expect(() => getProjectedReadyDate(0)).toThrow();
  });

  it('throws when cardsPerDay is negative', () => {
    expect(() => getProjectedReadyDate(-10)).toThrow();
  });
});
