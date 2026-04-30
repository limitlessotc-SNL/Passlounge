// src/features/coach/readiness.ts
//
// Pure functions that turn a partial set of student metrics into:
//   • a 0..100 readiness score (weighted 5-component composite)
//   • a RiskLevel (red / amber / green)
//   • an array of human-readable risk flags
//   • a projected pass probability on the test date
//
// Component weights (must sum to 1.0):
//
//   CAT Level         40%   → catLevel / 5
//   Category Coverage 20%   → categoriesAbove60pct / 8
//   Consistency       20%   → activeDaysLast14 / 14
//   NGN Performance   10%   → ngnAccuracy (or overall accuracy fallback)
//   SR Compliance     10%   → srCompliance (0..1 fraction)
//
// The PP_ANCHORS table is duplicated from cat.utils to keep the readiness
// engine free of CAT module dependencies (the engine is reused by the coach
// dashboard, where CAT module imports would pull a lot of unrelated code).

import type { CategoryAccuracy, RiskLevel, StudentMetrics } from './coach.types';

// ─── Anchors (mirror cat.utils.PP_ANCHORS) ───────────────────────────

const PP_ANCHORS: Array<[number, number]> = [
  [1.0, 5],
  [1.5, 12],
  [2.0, 20],
  [2.5, 35],
  [3.0, 50],
  [3.5, 65],
  [4.0, 80],
  [4.5, 92],
  [5.0, 98],
];

function interpolatePP(level: number): number {
  const clamped = Math.max(1, Math.min(5, level));
  for (let i = 0; i < PP_ANCHORS.length - 1; i++) {
    const [l0, p0] = PP_ANCHORS[i];
    const [l1, p1] = PP_ANCHORS[i + 1];
    if (clamped >= l0 && clamped <= l1) {
      const t = (clamped - l0) / (l1 - l0);
      return p0 + t * (p1 - p0);
    }
  }
  return 50;
}

// ─── Component scores (0..100 each) ──────────────────────────────────

const MIN_CATEGORY_QUESTIONS = 5;
const CATEGORY_PASS_THRESHOLD = 0.6;

function catLevelScore(metrics: Partial<StudentMetrics>): number {
  if (metrics.cat_level == null) return 0;
  return Math.max(0, Math.min(100, (metrics.cat_level / 5) * 100));
}

function categoryCoverageScore(metrics: Partial<StudentMetrics>): number {
  const cats = metrics.category_accuracy ?? [];
  if (cats.length === 0) return 0;
  const above = cats.filter(
    c => c.total >= MIN_CATEGORY_QUESTIONS && c.accuracy >= CATEGORY_PASS_THRESHOLD,
  ).length;
  // Always normalise against the canonical 8 NCLEX categories regardless of
  // how many were observed — under-coverage shouldn't inflate the score.
  return (above / 8) * 100;
}

function consistencyScore(metrics: Partial<StudentMetrics>): number {
  const days = metrics.active_days_last_14 ?? 0;
  return Math.max(0, Math.min(100, (days / 14) * 100));
}

function ngnPerformanceScore(metrics: Partial<StudentMetrics>): number {
  if (metrics.ngn_accuracy != null) {
    return Math.max(0, Math.min(100, metrics.ngn_accuracy * 100));
  }
  // Fallback to overall accuracy from category breakdown.
  const cats = metrics.category_accuracy ?? [];
  let correct = 0;
  let total = 0;
  for (const c of cats) {
    correct += c.correct;
    total += c.total;
  }
  if (total === 0) return 0;
  return (correct / total) * 100;
}

function srComplianceScore(metrics: Partial<StudentMetrics>): number {
  const c = metrics.sr_compliance ?? 0;
  return Math.max(0, Math.min(100, c * 100));
}

// ─── Public API ──────────────────────────────────────────────────────

/** Composite 0..100 readiness score. Rounded to nearest integer. */
export function calculateReadinessScore(metrics: Partial<StudentMetrics>): number {
  const score =
    0.40 * catLevelScore(metrics) +
    0.20 * categoryCoverageScore(metrics) +
    0.20 * consistencyScore(metrics) +
    0.10 * ngnPerformanceScore(metrics) +
    0.10 * srComplianceScore(metrics);
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Risk classification — RED conditions are checked first because they should
 * never be downgraded by a passing AMBER condition.
 */
export function calculateRiskLevel(metrics: Partial<StudentMetrics>): RiskLevel {
  const readiness = metrics.readiness_score ?? calculateReadinessScore(metrics);
  const dtt = metrics.days_to_test;
  const pp = metrics.pass_probability;
  const dsa = metrics.days_since_active;

  // RED
  if (readiness < 50) return 'red';
  if (dtt != null && dtt < 14 && readiness < 65) return 'red';
  if (pp != null && pp < 40) return 'red';

  // AMBER
  if (readiness < 70) return 'amber';
  if (dsa != null && dsa >= 3 && dsa < 7) return 'amber';
  if (pp != null && pp >= 40 && pp < 60) return 'amber';

  return 'green';
}

const HIGH_WEIGHT_FLAG_CATEGORIES: Array<[string, string]> = [
  // [match-substring, display-name]
  ['pharmacology', 'Pharmacology'],
  ['management of care', 'Management of Care'],
];

/**
 * Returns one short human-readable string per flagged condition. Order is
 * stable (callers rely on it for snapshot tests). Empty array means the
 * student has no surfaceable risks.
 */
export function calculateRiskFlags(metrics: Partial<StudentMetrics>): string[] {
  const flags: string[] = [];
  const dsa = metrics.days_since_active;
  const velocity = metrics.cat_velocity;
  const pp = metrics.pass_probability;
  const dtt = metrics.days_to_test;
  const catLevel = metrics.cat_level;

  if (dsa != null && dsa >= 3) {
    flags.push(`Not active in ${dsa} day${dsa === 1 ? '' : 's'}`);
  }

  if (velocity != null && velocity < -0.1) {
    flags.push('CAT level declining');
  }

  if (pp != null && pp < 50) {
    flags.push('Pass probability below 50%');
  }

  if (dtt != null && dtt < 30 && catLevel != null && catLevel < 3) {
    flags.push(`Test in ${dtt} days - not yet at passing level`);
  }

  if (catLevel == null) {
    flags.push('No CAT taken yet');
  }

  // Per-category low-accuracy flags. Skip for very low n; we want >=5 questions
  // before flagging a category since 1-of-2 wrong is noise, not signal.
  const cats = metrics.category_accuracy ?? [];
  for (const [match, display] of HIGH_WEIGHT_FLAG_CATEGORIES) {
    const cat = cats.find(c => c.category.toLowerCase().includes(match));
    if (cat && cat.total >= MIN_CATEGORY_QUESTIONS && cat.accuracy < 0.5) {
      flags.push(`${display} below 50%`);
    }
  }

  return flags;
}

/**
 * Project pass probability forward to the test date using the student's
 * current CAT velocity. Returns null when we don't have enough signal to
 * trust the projection (no velocity yet, or no test date set).
 *
 * The projected level is clamped to [1, 5] before being mapped through the
 * same anchor table used by current pass probability — so a wildly negative
 * velocity can't push the projection below "Developing".
 */
export function calculateProjectedPP(
  catLevel: number,
  velocity: number | null,
  daysToTest: number | null,
): number | null {
  if (velocity == null || daysToTest == null) return null;
  const projectedLevel = catLevel + (velocity * daysToTest) / 7;
  const clamped = Math.max(1, Math.min(5, projectedLevel));
  return Math.round(interpolatePP(clamped));
}

/**
 * Convenience helper used by tests + the dashboard to derive a velocity from
 * any two CAT sessions. Returns null when the inputs don't support a
 * meaningful slope (same date, missing date, missing levels).
 */
export function calculateVelocity(
  latestLevel: number,
  latestAt: string | Date,
  previousLevel: number,
  previousAt: string | Date,
): number | null {
  const t1 = new Date(latestAt).getTime();
  const t0 = new Date(previousAt).getTime();
  if (!Number.isFinite(t1) || !Number.isFinite(t0)) return null;
  const weeks = (t1 - t0) / (7 * 24 * 60 * 60 * 1000);
  if (weeks <= 0) return null;
  return (latestLevel - previousLevel) / weeks;
}

// ─── Re-export used by tests ─────────────────────────────────────────

export { interpolatePP as _interpolatePP, type CategoryAccuracy };
