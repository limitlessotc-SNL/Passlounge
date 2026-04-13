/**
 * SR Engine Utility Functions
 * 
 * These are PURE FUNCTIONS — they take inputs, return outputs, and have
 * zero side effects. No API calls, no store access, no global variables.
 * 
 * Pure functions are the most testable code you can write.
 * Input → deterministic output → easy to verify.
 * 
 * Owner: Junior Engineer 4 (SR Engine)
 */

import {
  SR_CATEGORY_WEIGHTS,
  SR_DIFFICULTY_MULTIPLIERS,
  DEFAULT_CATEGORY_WEIGHT,
  DEFAULT_DIFFICULTY_MULTIPLIER,
  SM2_EASE_FACTOR_MIN,
  SM2_EASE_FACTOR_MAX,
  SM2_EASE_CORRECT_BONUS,
  SM2_EASE_WRONG_PENALTY,
  INTERVAL_MIN_DAYS,
  INTERVAL_MAX_DAYS,
  INTERVAL_WRONG_DAYS,
  INTERVAL_URGENCY_CAP_DAYS,
  URGENCY_MODE_THRESHOLD_DAYS,
  NEVER_SEEN_SCORE,
} from '../config/sr.config';

import type {
  Card,
  CardProgress,
  CardProgressMap,
  ReviewInput,
  ReviewResult,
  DifficultyLevel,
} from '../types/index';

// ─── getCategoryWeight ─────────────────────────────────────────────────────
/**
 * Returns the NCLEX exam blueprint weight for a given card category.
 * Higher-weighted categories surface more often in the SR pool.
 * 
 * @param category - The NCLEX category of the card
 * @returns Weight multiplier (1.0 - 1.3)
 */
export function getCategoryWeight(category: string): number {
  return SR_CATEGORY_WEIGHTS[category] ?? DEFAULT_CATEGORY_WEIGHT;
}

// ─── getDifficultyMultiplier ───────────────────────────────────────────────
/**
 * Returns the interval multiplier for a given difficulty level.
 * Harder cards that are answered correctly get longer review intervals
 * because correct answers on hard cards indicate stronger mastery.
 * 
 * @param level - Difficulty level 1-5
 * @returns Interval multiplier (1.5 - 2.5)
 */
export function getDifficultyMultiplier(level: DifficultyLevel): number {
  return SR_DIFFICULTY_MULTIPLIERS[level] ?? DEFAULT_DIFFICULTY_MULTIPLIER;
}

// ─── isUrgencyMode ────────────────────────────────────────────────────────
/**
 * Returns true if the student's exam is within the urgency threshold.
 * In urgency mode all review intervals are capped at 7 days to keep
 * all material fresh before the exam.
 * 
 * @param testDays - Days until the exam (0 = no date set)
 * @returns true if urgency mode should apply
 */
export function isUrgencyMode(testDays: number): boolean {
  return testDays > 0 && testDays <= URGENCY_MODE_THRESHOLD_DAYS;
}

// ─── srScore ──────────────────────────────────────────────────────────────
/**
 * Calculates the SR priority score for a single card.
 * Higher score = should be shown sooner.
 * 
 * Score formula:
 *   overdue_days × ease_factor × category_weight
 * 
 * Never-seen cards always score NEVER_SEEN_SCORE (9999) to ensure
 * students see all cards before reviewing any card twice.
 * 
 * @param card - The card to score
 * @param progressMap - Map of card_id → CardProgress for this student
 * @returns Priority score (higher = show sooner)
 */
export function srScore(card: Card, progressMap: CardProgressMap): number {
  const progress = progressMap[card.id];

  // Never seen = highest priority
  if (!progress || progress.times_seen === 0) {
    return NEVER_SEEN_SCORE;
  }

  const now = new Date();
  const nextReview = new Date(progress.next_review);
  const overdueDays = (now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24);

  const categoryWeight = getCategoryWeight(card.cat);

  return overdueDays * (progress.ease_factor ?? 2.5) * categoryWeight;
}

// ─── buildSRPool ──────────────────────────────────────────────────────────
/**
 * Builds a prioritized card pool for a study session using SR scores.
 * Cards are sorted by score descending (highest priority first).
 * Never-seen cards always appear before reviewed cards.
 * 
 * @param cards - Full pool of eligible cards (pre-filtered by pool type)
 * @param progressMap - Map of card_id → CardProgress for this student
 * @param count - Number of cards to return
 * @returns Sorted array of cards, length = min(count, cards.length)
 */
export function buildSRPool(
  cards: Card[],
  progressMap: CardProgressMap,
  count: number
): Card[] {
  if (cards.length === 0) return [];

  const actualCount = Math.min(count, cards.length);

  return [...cards]
    .sort((a, b) => srScore(b, progressMap) - srScore(a, progressMap))
    .slice(0, actualCount);
}

// ─── updateEaseFactor ─────────────────────────────────────────────────────
/**
 * Updates the SM-2 ease factor based on whether the answer was correct.
 * Ease factor determines how quickly the review interval grows.
 * 
 * Correct: ease_factor increases (card becomes easier = longer intervals)
 * Wrong:   ease_factor decreases (card becomes harder = shorter intervals)
 * Clamped between SM2_EASE_FACTOR_MIN (1.3) and SM2_EASE_FACTOR_MAX (3.5)
 * 
 * @param currentEaseFactor - Current ease factor
 * @param wasCorrect - Whether the student answered correctly
 * @returns New ease factor, clamped to valid range
 */
export function updateEaseFactor(
  currentEaseFactor: number,
  wasCorrect: boolean
): number {
  const newEase = wasCorrect
    ? currentEaseFactor + SM2_EASE_CORRECT_BONUS
    : currentEaseFactor - SM2_EASE_WRONG_PENALTY;

  return Math.min(SM2_EASE_FACTOR_MAX, Math.max(SM2_EASE_FACTOR_MIN, newEase));
}

// ─── calculateIntervalDays ────────────────────────────────────────────────
/**
 * Calculates the number of days until the next review.
 * 
 * Wrong answer → always 1 day (review tomorrow)
 * Correct answer → interval grows based on ease factor, difficulty,
 *                  times correct, and urgency mode
 * 
 * Formula (correct):
 *   interval = ease_factor × difficulty_multiplier × max(1, times_correct - 1)
 *   Capped at 7 days in urgency mode, 60 days otherwise.
 * 
 * @param params - Parameters for interval calculation
 * @returns Number of days until next review (minimum 1)
 */
export function calculateIntervalDays({
  wasCorrect,
  easeFactor,
  difficultyLevel,
  timesCorrect,
  testDays,
}: {
  wasCorrect: boolean;
  easeFactor: number;
  difficultyLevel: DifficultyLevel;
  timesCorrect: number;
  testDays: number;
}): number {
  // Wrong answer → always review tomorrow
  if (!wasCorrect) {
    return INTERVAL_WRONG_DAYS;
  }

  const diffMultiplier = getDifficultyMultiplier(difficultyLevel);
  const reviewCount = Math.max(1, timesCorrect - 1);
  const rawInterval = Math.round(easeFactor * diffMultiplier * reviewCount);

  const maxInterval = isUrgencyMode(testDays)
    ? INTERVAL_URGENCY_CAP_DAYS
    : INTERVAL_MAX_DAYS;

  return Math.min(maxInterval, Math.max(INTERVAL_MIN_DAYS, rawInterval));
}

// ─── calculateNextReview ──────────────────────────────────────────────────
/**
 * Main SR update function. Takes a card's current progress and a new
 * answer and returns the updated ease factor, interval, and next review date.
 * 
 * This is the single entry point for saving SR progress after a session.
 * 
 * @param input - ReviewInput containing existing progress and answer details
 * @returns ReviewResult with new ease_factor, interval_days, and next_review date
 */
export function calculateNextReview(input: ReviewInput): ReviewResult {
  const { existing, wasCorrect, difficultyLevel, testDays } = input;

  const newEaseFactor = updateEaseFactor(existing.ease_factor, wasCorrect);

  const newTimesCorrect = wasCorrect
    ? existing.times_correct + 1
    : existing.times_correct;

  const intervalDays = calculateIntervalDays({
    wasCorrect,
    easeFactor: newEaseFactor,
    difficultyLevel,
    timesCorrect: newTimesCorrect,
    testDays,
  });

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    ease_factor: newEaseFactor,
    interval_days: intervalDays,
    next_review: nextReviewDate.toISOString(),
  };
}

// ─── getNewCards ──────────────────────────────────────────────────────────
/**
 * Filters a card list to only cards the student has never seen.
 * Used for the "New Cards Only" pool mode.
 * 
 * @param cards - Full card list
 * @param progressMap - Student's card progress
 * @returns Cards with times_seen === 0 or no progress entry
 */
export function getNewCards(
  cards: Card[],
  progressMap: CardProgressMap
): Card[] {
  return cards.filter((card) => {
    const progress = progressMap[card.id];
    return !progress || progress.times_seen === 0;
  });
}

// ─── getMissedCards ───────────────────────────────────────────────────────
/**
 * Filters a card list to only cards the student has answered incorrectly
 * at least once. Used for the "Missed Cards" pool mode.
 * 
 * @param cards - Full card list
 * @param progressMap - Student's card progress
 * @returns Cards with times_wrong > 0
 */
export function getMissedCards(
  cards: Card[],
  progressMap: CardProgressMap
): Card[] {
  return cards.filter((card) => {
    const progress = progressMap[card.id];
    return progress && progress.times_wrong > 0;
  });
}

// ─── calculateXP ──────────────────────────────────────────────────────────
/**
 * Calculates XP earned in a session.
 * Base XP of 50 + 20 per correct answer.
 * 
 * @param correctCount - Number of correct answers
 * @returns Total XP earned
 */
export function calculateXP(correctCount: number): number {
  if (correctCount < 0) return 50;
  return 50 + correctCount * 20;
}

// ─── calculateAccuracy ────────────────────────────────────────────────────
/**
 * Calculates the percentage accuracy for a session or diagnostic.
 * Returns 0 if total is 0 to prevent division by zero.
 * 
 * @param correct - Number of correct answers
 * @param total - Total number of questions answered
 * @returns Accuracy as a percentage (0-100), rounded to nearest integer
 */
export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

// ─── getProjectedReadyDate ────────────────────────────────────────────────
/**
 * Calculates the projected date when a student will have reviewed all
 * 2000 cards based on their daily commitment.
 * 
 * @param cardsPerDay - Student's daily card commitment
 * @param totalCards - Total cards in the library (default 2000)
 * @returns ISO date string of projected completion date
 */
export function getProjectedReadyDate(
  cardsPerDay: number,
  totalCards: number = 2000
): string {
  if (cardsPerDay <= 0) {
    throw new Error('cardsPerDay must be greater than 0');
  }

  const daysNeeded = Math.ceil(totalCards / cardsPerDay);
  const readyDate = new Date();
  readyDate.setDate(readyDate.getDate() + daysNeeded);
  return readyDate.toISOString();
}
