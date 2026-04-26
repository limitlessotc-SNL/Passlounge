// src/features/ngn/ngn.service.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/config/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import {
  fetchAllNGNCards,
  fetchNGNCardTitlesAndScenarios,
  fetchNGNCardsByType,
  insertNGNCard,
  updateNGNCard,
} from './ngn.service';

function chain(overrides: Record<string, unknown> = {}) {
  const c: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return c;
}

const sampleRow = {
  id: 'ngn-1',
  title: 'Sepsis matrix',
  scenario: 'A 64-year-old patient...',
  question: 'Which findings are anticipated?',
  type: 'matrix',
  nclex_category: 'Physiological Adaptation',
  difficulty_level: 4,
  scoring_rule: '0/1',
  max_points: 4,
  content: { columns: ['A', 'B'], rows: [] },
  rationale: 'Because reasons.',
  source: 'Saunders 8th Ed.',
  created_by: 'admin-1',
  created_at: '2026-04-24T00:00:00Z',
};

describe('ngn.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  // ── reads ──────────────────────────────────────────────────────────

  describe('fetchAllNGNCards', () => {
    it('returns mapped rows on success', async () => {
      const c = chain({
        order: vi.fn().mockResolvedValue({ data: [sampleRow], error: null }),
      });
      mockFrom.mockReturnValue(c as never);

      const cards = await fetchAllNGNCards();
      expect(cards).toHaveLength(1);
      expect(cards[0].id).toBe('ngn-1');
      expect(cards[0].type).toBe('matrix');
      expect(cards[0].max_points).toBe(4);
    });

    it('returns [] on supabase error', async () => {
      const c = chain({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'oops' } }),
      });
      mockFrom.mockReturnValue(c as never);

      expect(await fetchAllNGNCards()).toEqual([]);
    });

    it('parses content arriving as a JSON string', async () => {
      const c = chain({
        order: vi.fn().mockResolvedValue({
          data: [{ ...sampleRow, content: '{"columns":["X","Y"],"rows":[]}' }],
          error: null,
        }),
      });
      mockFrom.mockReturnValue(c as never);

      const cards = await fetchAllNGNCards();
      expect(cards[0].content).toEqual({ columns: ['X', 'Y'], rows: [] });
    });
  });

  describe('fetchNGNCardsByType', () => {
    it('passes the type filter through to supabase', async () => {
      const c = chain({
        order: vi.fn().mockResolvedValue({ data: [sampleRow], error: null }),
      });
      mockFrom.mockReturnValue(c as never);

      await fetchNGNCardsByType('matrix');
      expect(c.eq).toHaveBeenCalledWith('type', 'matrix');
    });

    it('returns [] on error', async () => {
      const c = chain({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'down' } }),
      });
      mockFrom.mockReturnValue(c as never);

      expect(await fetchNGNCardsByType('bow_tie')).toEqual([]);
    });
  });

  describe('fetchNGNCardTitlesAndScenarios', () => {
    it('returns the compact projection', async () => {
      const c = chain({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', title: 'T', scenario: 'S' }],
          error: null,
        }),
      });
      mockFrom.mockReturnValue(c as never);

      const out = await fetchNGNCardTitlesAndScenarios();
      expect(out).toEqual([{ id: '1', title: 'T', scenario: 'S' }]);
    });

    it('returns [] on error', async () => {
      const c = chain({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } }),
      });
      mockFrom.mockReturnValue(c as never);

      expect(await fetchNGNCardTitlesAndScenarios()).toEqual([]);
    });
  });

  // ── writes ─────────────────────────────────────────────────────────

  describe('insertNGNCard', () => {
    it('returns the mapped row on success', async () => {
      const c = chain({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sampleRow, error: null }),
      });
      mockFrom.mockReturnValue(c as never);

      const out = await insertNGNCard({
        title: sampleRow.title,
        scenario: sampleRow.scenario,
        question: sampleRow.question,
        type: 'matrix',
        nclex_category: sampleRow.nclex_category,
        difficulty_level: 4,
        scoring_rule: '0/1',
        max_points: 4,
        content: sampleRow.content as never,
        rationale: '',
        source: '',
      });

      expect(out.id).toBe('ngn-1');
      expect(c.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: sampleRow.title,
        type: 'matrix',
      }));
    });

    it('throws when supabase returns an error', async () => {
      const c = chain({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS' } }),
      });
      mockFrom.mockReturnValue(c as never);

      await expect(insertNGNCard({
        title: 'x', scenario: 'y', question: 'z', type: 'mcq',
        nclex_category: 'Management of Care', difficulty_level: 3,
        scoring_rule: '0/1', max_points: 1, content: { opts: [], correct: 0 },
        rationale: '', source: '',
      })).rejects.toThrow('RLS');
    });
  });

  describe('updateNGNCard', () => {
    it('passes id and partial updates through', async () => {
      const c = chain({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      mockFrom.mockReturnValue(c as never);

      await updateNGNCard('ngn-1', { rationale: 'updated' });
      expect(c.update).toHaveBeenCalledWith(expect.objectContaining({ rationale: 'updated' }));
      expect(c.eq).toHaveBeenCalledWith('id', 'ngn-1');
    });

    it('throws when supabase returns an error', async () => {
      const c = chain({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } }),
      });
      mockFrom.mockReturnValue(c as never);

      await expect(updateNGNCard('ngn-1', { rationale: 'x' })).rejects.toThrow('denied');
    });
  });
});
