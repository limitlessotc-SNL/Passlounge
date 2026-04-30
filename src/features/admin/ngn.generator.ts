// src/features/admin/ngn.generator.ts
//
// Client-side wrapper around the generate-ngn-card Edge Function. Hides
// the function-name + auth plumbing and adds a Levenshtein-based
// duplicate-similarity check so the admin UI can flag near-duplicates
// before persisting them.

import { supabase } from '@/config/supabase';
import type {
  NGNCard,
  NGNContent,
  NGNQuestionType,
  NGNScoringRule,
} from '@/features/ngn/ngn.types';

const FUNCTION_NAME = 'generate-ngn-card';
const DUPLICATE_THRESHOLD = 0.8; // similarity (1 - normalized distance) ≥ this flags as dup

export interface GenerateRequest {
  type:           NGNQuestionType;
  category:       string;
  difficulty:     number;
  hint?:          string;
  existingCards:  Array<{ title: string; scenario: string }>;
}

export interface GeneratedCard extends Omit<NGNCard, 'id' | 'created_at'> {
  /** True when the freshly-generated card looks similar (≥ 80%) to one in
   *  existingCards. Admin UI surfaces this as a warning, doesn't block. */
  isDuplicate: boolean;
  /** Highest similarity score against any existing card. */
  similarity: number;
  /** Title of the existing card that drove the similarity, when flagged. */
  similarToTitle?: string;
}

// ─── Single-card generation ──────────────────────────────────────────

export async function generateSingleCard(
  type: NGNQuestionType,
  category: string,
  difficulty: number,
  existingCards: Array<{ title: string; scenario: string }>,
  hint?: string,
): Promise<GeneratedCard> {
  const { data, error } = await supabase.functions.invoke<{ card: unknown }>(FUNCTION_NAME, {
    body: { type, category, difficulty, hint, existingCards } satisfies GenerateRequest,
  });
  if (error) throw new Error(`Edge function error: ${error.message}`);
  if (!data?.card) throw new Error('Edge function returned no card');

  const card = validateCardShape(data.card);
  return annotateDuplicate(card, existingCards);
}

// ─── Batch generation (sequential, dup-aware across the batch) ────────

export interface BatchConfig {
  types:        NGNQuestionType[] | 'mixed';
  categories:   string[]          | 'mixed';
  difficulties: number[]          | 'mixed';
  count:        number;
  hint?:        string;
}

export const ALL_TYPES: NGNQuestionType[] = [
  'extended_mr_n', 'extended_mr_all', 'bow_tie',
  'matrix', 'cloze', 'drag_drop', 'trend',
];
export const ALL_CATEGORIES = [
  'Management of Care',
  'Safety and Infection Control',
  'Health Promotion and Maintenance',
  'Psychosocial Integrity',
  'Basic Care and Comfort',
  'Pharmacological and Parenteral Therapies',
  'Reduction of Risk Potential',
  'Physiological Adaptation',
];
export const ALL_DIFFICULTIES = [1, 2, 3, 4, 5];

export async function generateBatchCards(
  config: BatchConfig,
  existingCards: Array<{ title: string; scenario: string }>,
): Promise<GeneratedCard[]> {
  const count = Math.min(20, Math.max(1, config.count));
  const out: GeneratedCard[] = [];
  // Pool that grows with each generation so the model is told about the
  // cards it just produced earlier in this batch (prevents intra-batch
  // dupes).
  const knownCards = [...existingCards];

  for (let i = 0; i < count; i++) {
    const type       = pickFromOption(config.types,        ALL_TYPES,        i);
    const category   = pickFromOption(config.categories,   ALL_CATEGORIES,   i);
    const difficulty = pickFromOption(config.difficulties, ALL_DIFFICULTIES, i);

    // Snapshot at call time so the Edge Function payload doesn't share a
    // reference that we mutate after invoke. Belt-and-suspenders for any
    // async inspection of the request body.
    const card = await generateSingleCard(
      type, category, difficulty, [...knownCards], config.hint,
    );
    out.push(card);
    knownCards.push({ title: card.title, scenario: card.scenario });
  }
  return out;
}

export function pickFromOption<T>(option: T[] | 'mixed', allValues: T[], i: number): T {
  if (option === 'mixed') return allValues[i % allValues.length];
  if (option.length === 0) return allValues[0]; // defensive
  return option[i % option.length];
}

// ─── Card-shape validation ───────────────────────────────────────────

function validateCardShape(raw: unknown): Omit<NGNCard, 'id' | 'created_at'> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Generated card was not an object');
  }
  const c = raw as Record<string, unknown>;
  const required = [
    'title', 'scenario', 'question', 'type',
    'nclex_category', 'difficulty_level', 'scoring_rule',
    'max_points', 'content', 'rationale', 'source',
  ];
  for (const k of required) {
    if (!(k in c)) throw new Error(`Generated card missing required field: ${k}`);
  }
  return {
    title:            String(c.title),
    scenario:         String(c.scenario),
    question:         String(c.question),
    type:             c.type as NGNQuestionType,
    nclex_category:   String(c.nclex_category),
    difficulty_level: Number(c.difficulty_level),
    scoring_rule:     c.scoring_rule as NGNScoringRule,
    max_points:       Number(c.max_points),
    content:          c.content as NGNContent,
    rationale:        String(c.rationale),
    source:           String(c.source),
  };
}

// ─── Levenshtein-based duplicate detection ───────────────────────────

function annotateDuplicate(
  card: Omit<NGNCard, 'id' | 'created_at'>,
  existing: Array<{ title: string; scenario: string }>,
): GeneratedCard {
  let bestSim = 0;
  let bestTitle: string | undefined;
  for (const e of existing) {
    const sim = Math.max(
      levenshteinSimilarity(card.title, e.title),
      levenshteinSimilarity(card.scenario, e.scenario),
    );
    if (sim > bestSim) { bestSim = sim; bestTitle = e.title; }
  }
  return {
    ...card,
    isDuplicate:    bestSim >= DUPLICATE_THRESHOLD,
    similarity:     Number(bestSim.toFixed(3)),
    similarToTitle: bestSim >= DUPLICATE_THRESHOLD ? bestTitle : undefined,
  };
}

/**
 * Returns 0..1 where 1 = identical, 0 = totally different. Computed as
 * 1 - (lev_distance / max_length). Empty strings score 1 against another
 * empty (definitionally equal) and 0 against anything.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const A = a.toLowerCase().trim();
  const B = b.toLowerCase().trim();
  if (!A.length && !B.length) return 1;
  if (!A.length || !B.length) return 0;
  const max = Math.max(A.length, B.length);
  return 1 - levenshtein(A, B) / max;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Single-row DP — O(min(m,n)) memory.
  const prev = new Array<number>(n + 1);
  const cur  = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(
        cur[j - 1] + 1,         // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}
