// src/features/cat/cat.utils.ts

import type { StudyCard } from '@/types';
import type {
  CATCategoryBreakdown,
  CATCategoryKey,
  CATQuestionTrace,
  TrendDirection,
} from './cat.types';
import {
  CAT_MAX_DIFFICULTY,
  CAT_MIN_DIFFICULTY,
  CAT_SESSION_LENGTH,
  CAT_WEIGHTED_WINDOW,
} from './cat.types';

// ─── Category normalisation ───────────────────────────────────────────────

const RAW_TO_CANONICAL: Record<string, CATCategoryKey> = {
  // Management of Care
  'management of care':          'management_of_care',
  'management of care (nclex-rn)': 'management_of_care',
  // Safety
  'safety':                          'safety',
  'safety and infection control':    'safety',
  // Pharmacology
  'pharmacology':                              'pharmacology',
  'pharmacological and parenteral therapies':  'pharmacology',
  'pharmacological therapies':                 'pharmacology',
  // Physiological Adaptation
  'physiological adaptation':   'physiological_adaptation',
  // Reduction of Risk
  'reduction of risk':           'reduction_of_risk',
  'reduction of risk potential': 'reduction_of_risk',
  // Basic Care & Comfort
  'basic care':             'basic_care',
  'basic care and comfort': 'basic_care',
  // Health Promotion
  'health promotion':                  'health_promotion',
  'health promotion and maintenance':  'health_promotion',
  // Psychosocial / Mental Health
  'psychosocial':            'psychosocial',
  'psychosocial integrity':  'psychosocial',
  'mental health':           'psychosocial',
};

/** Map any raw DB category string to a canonical key. Returns null if unknown. */
export function normalizeCategoryName(raw: string): CATCategoryKey | null {
  return RAW_TO_CANONICAL[raw.toLowerCase().trim()] ?? null;
}

// ─── Empty breakdown ──────────────────────────────────────────────────────

export function emptyBreakdown(): CATCategoryBreakdown {
  return {
    management_of_care:       { correct: 0, total: 0 },
    safety:                   { correct: 0, total: 0 },
    pharmacology:             { correct: 0, total: 0 },
    physiological_adaptation: { correct: 0, total: 0 },
    reduction_of_risk:        { correct: 0, total: 0 },
    basic_care:               { correct: 0, total: 0 },
    health_promotion:         { correct: 0, total: 0 },
    psychosocial:             { correct: 0, total: 0 },
  };
}

// ─── Blueprint weights & targets ──────────────────────────────────────────

export const BLUEPRINT_WEIGHTS: Record<CATCategoryKey, number> = {
  management_of_care:       0.19,
  safety:                   0.13,
  pharmacology:             0.12,
  physiological_adaptation: 0.11,
  reduction_of_risk:        0.11,
  basic_care:               0.09,
  health_promotion:         0.09,
  psychosocial:             0.09,
  // remaining ~7% fills proportionally from available cards
};

export function getBlueprintTargets(
  sessionLength: number = CAT_SESSION_LENGTH
): Record<CATCategoryKey, number> {
  return Object.fromEntries(
    (Object.entries(BLUEPRINT_WEIGHTS) as [CATCategoryKey, number][]).map(
      ([k, w]) => [k, Math.round(w * sessionLength)]
    )
  ) as Record<CATCategoryKey, number>;
}

// ─── CAT Level (weighted average of last 20 difficulties) ─────────────────

/**
 * Linear-weighted average of the most recent CAT_WEIGHTED_WINDOW question
 * difficulties, where the newest question carries the highest weight.
 *
 * Weights: 1, 2, 3 … n  (oldest→newest).
 * Normaliser: n*(n+1)/2.
 */
export function calculateCATLevel(trace: CATQuestionTrace[]): number {
  if (trace.length === 0) return 3;
  const window = trace.slice(-CAT_WEIGHTED_WINDOW);
  const n = window.length;
  const normalizer = (n * (n + 1)) / 2;
  const weighted = window.reduce((sum, q, i) => sum + q.difficulty_level * (i + 1), 0);
  return Math.round((weighted / normalizer) * 100) / 100;
}

// ─── Pass Probability ─────────────────────────────────────────────────────

/** Anchor points from spec: [catLevel, passProbability%] */
const PP_ANCHORS: [number, number][] = [
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

export function calculatePassProbability(
  catLevel: number,
  categoryAccuracy: CATCategoryBreakdown,
  trendDirection: TrendDirection
): number {
  let prob = interpolatePP(catLevel);

  // ±5 for high-weight category accuracy (MOC + Pharm + Safety)
  const hw: CATCategoryKey[] = ['management_of_care', 'pharmacology', 'safety'];
  let hwCorrect = 0, hwTotal = 0;
  for (const key of hw) {
    hwCorrect += categoryAccuracy[key].correct;
    hwTotal   += categoryAccuracy[key].total;
  }
  if (hwTotal > 0) {
    const acc = hwCorrect / hwTotal;
    if (acc > 0.7) prob += 5;
    else if (acc < 0.5) prob -= 5;
  }

  // ±3 for trend
  if (trendDirection === 'improving')  prob += 3;
  if (trendDirection === 'declining')  prob -= 3;

  return Math.round(Math.max(0, Math.min(100, prob)));
}

// ─── Trend ────────────────────────────────────────────────────────────────

export function calculateTrendDirection(
  currentLevel: number,
  previousLevel: number | null
): TrendDirection {
  if (previousLevel === null) return 'first';
  const delta = currentLevel - previousLevel;
  if (delta >  0.1) return 'improving';
  if (delta < -0.1) return 'declining';
  return 'stable';
}

// ─── Difficulty adaptation ────────────────────────────────────────────────

export function adaptDifficulty(current: number, wasCorrect: boolean): number {
  const next = wasCorrect ? current + 1 : current - 1;
  return Math.max(CAT_MIN_DIFFICULTY, Math.min(CAT_MAX_DIFFICULTY, next));
}

// ─── Category accuracy update ─────────────────────────────────────────────

export function updateCategoryAccuracy(
  current: CATCategoryBreakdown,
  rawCategory: string,
  wasCorrect: boolean
): CATCategoryBreakdown {
  const key = normalizeCategoryName(rawCategory);
  if (!key) return current;
  return {
    ...current,
    [key]: {
      correct: current[key].correct + (wasCorrect ? 1 : 0),
      total:   current[key].total + 1,
    },
  };
}

// ─── Blueprint-aware card selection ───────────────────────────────────────

/** Returns the category most under-represented relative to the blueprint target. */
function mostNeededCategory(
  accuracy: CATCategoryBreakdown,
  _questionsAnswered: number,
  sessionLength: number
): CATCategoryKey | null {
  const targets = getBlueprintTargets(sessionLength);
  let maxDeficit = 0;
  let needed: CATCategoryKey | null = null;

  for (const [key, target] of Object.entries(targets) as [CATCategoryKey, number][]) {
    const deficit = target - accuracy[key].total;
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      needed = key;
    }
  }
  return needed;
}

/** Pick one card from available at a given difficulty, honouring blueprint preference. */
function pickFromDifficulty(
  available: StudyCard[],
  difficulty: number,
  preferredCategory: CATCategoryKey | null
): StudyCard | null {
  const atLevel = available.filter(c => c.difficulty_level === difficulty);
  if (atLevel.length === 0) return null;

  if (preferredCategory) {
    const preferred = atLevel.filter(
      c => normalizeCategoryName(c.nclex_category ?? '') === preferredCategory
    );
    if (preferred.length > 0) {
      return preferred[Math.floor(Math.random() * preferred.length)];
    }
  }

  return atLevel[Math.floor(Math.random() * atLevel.length)];
}

/**
 * Main card selection.
 * - Tries target difficulty first.
 * - Expands outward (±1, ±2, …) if target level is exhausted.
 * - Prefers blueprint-deficit categories at each level.
 * - Never returns a card in usedCardIds.
 */
export function selectNextCard(
  allCards: StudyCard[],
  targetDifficulty: number,
  usedCardIds: Set<string>,
  categoryAccuracy: CATCategoryBreakdown,
  questionsAnswered: number,
  sessionLength: number = CAT_SESSION_LENGTH
): StudyCard | null {
  const available = allCards.filter(c => !(c.id && usedCardIds.has(c.id)))
  if (available.length === 0) return null;

  const preferred = mostNeededCategory(categoryAccuracy, questionsAnswered, sessionLength);

  // Exact level
  const exact = pickFromDifficulty(available, targetDifficulty, preferred);
  if (exact) return exact;

  // Expand outward from target
  for (let delta = 1; delta <= 4; delta++) {
    const higher = targetDifficulty + delta;
    const lower  = targetDifficulty - delta;
    if (higher <= CAT_MAX_DIFFICULTY) {
      const c = pickFromDifficulty(available, higher, preferred);
      if (c) return c;
    }
    if (lower >= CAT_MIN_DIFFICULTY) {
      const c = pickFromDifficulty(available, lower, preferred);
      if (c) return c;
    }
  }

  return null;
}

// ─── Content sanitizer ───────────────────────────────────────────────────
// Strips Saunders textbook citations and source attributions from scenarios,
// questions, and answer options before rendering in CAT mode. Citations
// ("per Saunders", "as specified in Saunders acute stroke management",
// "Saunders-specified...") can leak answers and don't belong in a test-mode
// interface. Applied at the service layer so the rest of the app never
// sees the uncleaned text.

// Clause terminators we respect: semicolon, em-dash, or a period that's
// actually a sentence end (period + space + capital letter). Plain periods
// inside abbreviations like "Ch." and "p." are NOT clause terminators, so
// we use a lookahead instead of a character class to detect real breaks.
const CLAUSE_END = /(?=\.\s+[A-Z]|[;—]|$)/.source;
const SAUNDERS_LEAD_IN = new RegExp(
  `\\s*(?:per|in|as specified in|according to|from|cited in|referenced in|by)\\s+Saunders.*?${CLAUSE_END}`,
  'gi',
);
const SAUNDERS_STANDALONE = new RegExp(
  `\\bSaunders(?:-specified|-cited|'s)?.*?${CLAUSE_END}`,
  'gi',
);
const NCSBN_SOURCE_TRAILER = /\s*\+\s*NCSBN\s*\d*(?:\s+Test Plan)?/gi;

export function sanitizeCardText(text: string): string {
  if (!text) return text;
  let cleaned = text;
  cleaned = cleaned.replace(SAUNDERS_LEAD_IN, '');
  cleaned = cleaned.replace(SAUNDERS_STANDALONE, '');
  cleaned = cleaned.replace(NCSBN_SOURCE_TRAILER, '');
  // Collapse the whitespace / orphan punctuation left behind.
  cleaned = cleaned.replace(/\s+([,.;])/g, '$1');
  cleaned = cleaned.replace(/^[,;\s]+/, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

// ─── Level label ──────────────────────────────────────────────────────────

export function getCATLevelLabel(level: number): string {
  if (level < 2) return 'Developing';
  if (level < 3) return 'Emerging';
  if (level < 4) return 'Proficient';
  if (level < 5) return 'Advanced';
  return 'Expert';
}

// ─── Category display name ────────────────────────────────────────────────

export const CATEGORY_DISPLAY_NAMES: Record<CATCategoryKey, string> = {
  management_of_care:       'Management of Care',
  safety:                   'Safety & Infection Control',
  pharmacology:             'Pharmacology',
  physiological_adaptation: 'Physiological Adaptation',
  reduction_of_risk:        'Reduction of Risk',
  basic_care:               'Basic Care & Comfort',
  health_promotion:         'Health Promotion',
  psychosocial:             'Psychosocial Integrity',
};
