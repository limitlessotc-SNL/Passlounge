/**
 * SR Engine Configuration
 * 
 * These values are the source of truth for the spaced repetition algorithm.
 * Every test that verifies SR behavior references these constants directly.
 * If a value changes here, the tests will catch any downstream breakage.
 * 
 * Owner: Junior Engineer 4 (SR Engine)
 * Reviewed by: Senior Engineer
 */

// ─── NCLEX Category Weights ────────────────────────────────────────────────
// Higher weight = card surfaces more often relative to overdue days.
// Based on the NCLEX-RN test plan exam blueprint percentages (NCSBN 2023).

export const SR_CATEGORY_WEIGHTS: Record<string, number> = {
  'Management of Care': 1.3,         // 15-21% of exam — highest weight
  'MOC': 1.3,
  'Safety and Infection Control': 1.2, // 10-16%
  'Safety': 1.2,
  'Pharmacology': 1.2,               // 10-14%
  'Physiological Adaptation': 1.2,   // 9-14%
  'Reduction of Risk': 1.1,          // 9-14%
  'Reduction of Risk Potential': 1.1,
  'Basic Care & Comfort': 1.0,       // 6-11% — baseline
  'Basic Care and Comfort': 1.0,
  'Health Promotion': 1.0,           // 6-12%
  'Health Promotion and Maintenance': 1.0,
  'Psychosocial Integrity': 1.0,     // 6-12%
  'Mental Health': 1.0,
} as const;

export const DEFAULT_CATEGORY_WEIGHT = 1.0;

// ─── Difficulty-Aware Interval Multipliers ─────────────────────────────────
// Correct answer on a harder card earns a longer review interval.
// L1-L2 (Foundation/Application): reviewed sooner — easy cards can still be forgotten
// L3 (Analysis): standard SM-2 interval
// L4-L5 (Complex/Expert): pushed further out — trusted mastery

export const SR_DIFFICULTY_MULTIPLIERS: Record<number, number> = {
  1: 1.5,  // Foundation
  2: 1.5,  // Application
  3: 2.0,  // Analysis — standard
  4: 2.5,  // Complex
  5: 2.5,  // Expert
} as const;

export const DEFAULT_DIFFICULTY_MULTIPLIER = 2.0;

// ─── SM-2 Algorithm Bounds ─────────────────────────────────────────────────
export const SM2_EASE_FACTOR_MIN = 1.3;
export const SM2_EASE_FACTOR_MAX = 3.5;
export const SM2_EASE_FACTOR_DEFAULT = 2.5;
export const SM2_EASE_CORRECT_BONUS = 0.1;   // ease goes up on correct answer
export const SM2_EASE_WRONG_PENALTY = 0.2;   // ease goes down on wrong answer

// ─── Interval Bounds ───────────────────────────────────────────────────────
export const INTERVAL_MIN_DAYS = 1;
export const INTERVAL_MAX_DAYS = 60;
export const INTERVAL_WRONG_DAYS = 1;        // wrong answer always = review tomorrow
export const INTERVAL_URGENCY_CAP_DAYS = 7; // max interval when exam within 30 days
export const URGENCY_MODE_THRESHOLD_DAYS = 30; // testDays <= this triggers urgency mode

// ─── Score for never-seen cards ────────────────────────────────────────────
// Always 9999 so unseen cards surface before reviewed cards.
export const NEVER_SEEN_SCORE = 9999;
