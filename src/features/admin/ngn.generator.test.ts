// src/features/admin/ngn.generator.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockInvoke = vi.fn();
vi.mock('@/config/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import {
  generateBatchCards,
  generateSingleCard,
  levenshteinSimilarity,
} from './ngn.generator';

const validCard = {
  title: 'Sepsis matrix L4',
  scenario: 'A 64-year-old patient develops sepsis...',
  question: 'Classify each finding.',
  type: 'matrix',
  nclex_category: 'Physiological Adaptation',
  difficulty_level: 4,
  scoring_rule: '0/1',
  max_points: 4,
  content: { columns: ['A', 'B'], rows: [] },
  rationale: 'Why this matters.',
  source: 'Saunders 8th Ed.',
};

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

// ─── levenshteinSimilarity ───────────────────────────────────────────

describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings (case + whitespace insensitive)', () => {
    expect(levenshteinSimilarity('Hello', '  hello  ')).toBe(1);
  });

  it('returns 0 between two distinct empty-vs-non-empty strings', () => {
    expect(levenshteinSimilarity('', 'hello')).toBe(0);
  });

  it('returns 1 for two empty strings', () => {
    expect(levenshteinSimilarity('', '')).toBe(1);
  });

  it('returns ~1 for near-duplicates', () => {
    const sim = levenshteinSimilarity(
      'Sepsis matrix for septic shock recognition',
      'Sepsis matrix for septic shock recogniton', // typo
    );
    expect(sim).toBeGreaterThan(0.9);
  });

  it('drops well below threshold for unrelated strings', () => {
    const sim = levenshteinSimilarity(
      'Stroke management priorities',
      'Pediatric immunization schedule',
    );
    expect(sim).toBeLessThan(0.5);
  });
});

// ─── generateSingleCard ──────────────────────────────────────────────

describe('generateSingleCard', () => {
  it('invokes the Edge Function with the right payload', async () => {
    mockInvoke.mockResolvedValue({ data: { card: validCard }, error: null });

    await generateSingleCard('matrix', 'Physiological Adaptation', 4, [], 'sepsis hint');

    expect(mockInvoke).toHaveBeenCalledWith('generate-ngn-card', {
      body: {
        type: 'matrix',
        category: 'Physiological Adaptation',
        difficulty: 4,
        hint: 'sepsis hint',
        existingCards: [],
      },
    });
  });

  it('returns a fully-shaped GeneratedCard with isDuplicate=false on a fresh title', async () => {
    mockInvoke.mockResolvedValue({ data: { card: validCard }, error: null });
    const out = await generateSingleCard('matrix', 'Physiological Adaptation', 4, [
      { title: 'Totally unrelated topic', scenario: 'Pediatric immunization' },
    ]);
    expect(out.isDuplicate).toBe(false);
    expect(out.title).toBe(validCard.title);
    expect(out.similarity).toBeLessThan(0.5);
  });

  it('flags isDuplicate=true when an existing card is near-identical', async () => {
    mockInvoke.mockResolvedValue({ data: { card: validCard }, error: null });
    const out = await generateSingleCard('matrix', 'Physiological Adaptation', 4, [
      { title: 'Sepsis matrix L4', scenario: 'A 64-year-old patient develops sepsis...' },
    ]);
    expect(out.isDuplicate).toBe(true);
    expect(out.similarToTitle).toBe('Sepsis matrix L4');
    expect(out.similarity).toBeGreaterThanOrEqual(0.8);
  });

  it('throws when the Edge Function returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'rate limited' } });
    await expect(generateSingleCard('matrix', 'X', 3, []))
      .rejects.toThrow(/rate limited/);
  });

  it('throws when the function returns a card missing required fields', async () => {
    mockInvoke.mockResolvedValue({
      data: { card: { title: 'incomplete' } },
      error: null,
    });
    await expect(generateSingleCard('matrix', 'X', 3, []))
      .rejects.toThrow(/missing required field/);
  });
});

// ─── generateBatchCards ──────────────────────────────────────────────

describe('generateBatchCards', () => {
  it('caps the count at 20', async () => {
    mockInvoke.mockResolvedValue({ data: { card: validCard }, error: null });
    await generateBatchCards(
      { types: ['matrix'], categories: ['X'], difficulties: [3], count: 100 },
      [],
    );
    expect(mockInvoke).toHaveBeenCalledTimes(20);
  });

  it('floors the count at 1', async () => {
    mockInvoke.mockResolvedValue({ data: { card: validCard }, error: null });
    await generateBatchCards(
      { types: ['matrix'], categories: ['X'], difficulties: [3], count: 0 },
      [],
    );
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('rotates through all 7 types when types="mixed"', async () => {
    mockInvoke.mockResolvedValue({ data: { card: validCard }, error: null });
    await generateBatchCards(
      { types: 'mixed', categories: ['X'], difficulties: [3], count: 7 },
      [],
    );
    const calls = mockInvoke.mock.calls.map((c: unknown[]) => {
      const opts = c[1] as { body: { type: string } };
      return opts.body.type;
    });
    const uniqueTypes = new Set(calls);
    expect(uniqueTypes.size).toBe(7);
  });

  it('feeds previously-generated cards back as known existing cards intra-batch', async () => {
    mockInvoke.mockResolvedValue({ data: { card: validCard }, error: null });
    await generateBatchCards(
      { types: ['matrix'], categories: ['X'], difficulties: [3], count: 3 },
      [{ title: 'seed', scenario: 'seed' }],
    );
    // First call: 1 existing (seed). Second: 2 (seed + first generated).
    // Third: 3 (seed + 2 generated).
    const lengths = mockInvoke.mock.calls.map((c: unknown[]) => {
      const opts = c[1] as { body: { existingCards: unknown[] } };
      return opts.body.existingCards.length;
    });
    expect(lengths).toEqual([1, 2, 3]);
  });
});
