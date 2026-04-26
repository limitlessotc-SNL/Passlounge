// src/features/cat/cat.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CATResult } from './cat.types';
import { emptyBreakdown } from './cat.utils';

// ─── Mock supabase ────────────────────────────────────────────────────────

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/config/supabase';
import {
  fetchAllCardsForCAT,
  fetchCATHistory,
  fetchPreviousCATLevel,
  saveCATResult,
} from './cat.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

function mockChain(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    limit:  vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    ...overrides,
  };
  return chain;
}

function makeDBCard(overrides: Record<string, unknown> = {}) {
  return {
    id:               'card-1',
    title:            'Test Card',
    scenario:         'A patient…',
    question:         'What do you do?',
    opts:             ['A', 'B', 'C', 'D'],
    correct:          1,
    why_wrong:        {},
    layers:           [],
    nclex_category:   'Management of Care',
    cat:              'Management of Care',
    difficulty_level: 3,
    source:           '',
    pearl:            '',
    ...overrides,
  };
}

// ─── fetchAllCardsForCAT ──────────────────────────────────────────────────

describe('fetchAllCardsForCAT', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns mapped cards on success', async () => {
    const chain = mockChain({
      order: vi.fn().mockResolvedValue({ data: [makeDBCard()], error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const cards = await fetchAllCardsForCAT();
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('card-1');
    expect(cards[0].difficulty_level).toBe(3);
  });

  it('returns [] on Supabase error', async () => {
    const chain = mockChain({
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const cards = await fetchAllCardsForCAT();
    expect(cards).toEqual([]);
  });

  it('returns [] when data is empty', async () => {
    const chain = mockChain({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const cards = await fetchAllCardsForCAT();
    expect(cards).toEqual([]);
  });

  it('parses opts that arrive as JSON strings', async () => {
    const chain = mockChain({
      order: vi.fn().mockResolvedValue({
        data: [makeDBCard({ opts: '["A","B","C","D"]' })],
        error: null,
      }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const cards = await fetchAllCardsForCAT();
    expect(Array.isArray(cards[0].opts)).toBe(true);
    expect(cards[0].opts).toHaveLength(4);
  });

  it('falls back to cat field when nclex_category is absent', async () => {
    const chain = mockChain({
      order: vi.fn().mockResolvedValue({
        data: [makeDBCard({ nclex_category: null, cat: 'Pharmacology' })],
        error: null,
      }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const cards = await fetchAllCardsForCAT();
    expect(cards[0].nclex_category).toBe('Pharmacology');
  });
});

// ─── fetchPreviousCATLevel ────────────────────────────────────────────────

describe('fetchPreviousCATLevel', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns the cat_level from the most recent result', async () => {
    const chain = mockChain({
      single: vi.fn().mockResolvedValue({ data: { cat_level: 3.8 }, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const level = await fetchPreviousCATLevel('student-1');
    expect(level).toBe(3.8);
  });

  it('returns null when no prior CAT exists', async () => {
    const chain = mockChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'No rows' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const level = await fetchPreviousCATLevel('student-1');
    expect(level).toBeNull();
  });
});

// ─── saveCATResult ────────────────────────────────────────────────────────

describe('saveCATResult', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mockResult: Omit<CATResult, 'id' | 'taken_at'> = {
    student_id:         'student-1',
    cat_level:          3.5,
    pass_probability:   65,
    total_questions:    150,
    correct_count:      95,
    wrong_count:        55,
    duration_seconds:   3600,
    question_trace:     [],
    category_accuracy:  emptyBreakdown(),
    trend_direction:    'first',
    previous_cat_level: null,
  };

  it('resolves without error on success', async () => {
    const chain = mockChain({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await expect(saveCATResult(mockResult)).resolves.toBeUndefined();
  });

  it('throws on Supabase error', async () => {
    const chain = mockChain({
      insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await expect(saveCATResult(mockResult)).rejects.toThrow('Insert failed');
  });
});

// ─── fetchCATHistory ──────────────────────────────────────────────────────

describe('fetchCATHistory', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns results ordered by taken_at descending', async () => {
    const mockData = [
      { id: '2', cat_level: 3.8, pass_probability: 65 },
      { id: '1', cat_level: 3.2, pass_probability: 52 },
    ];
    const chain = mockChain({
      limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const history = await fetchCATHistory('student-1');
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe('2');
  });

  it('returns [] on error', async () => {
    const chain = mockChain({
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
    });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const history = await fetchCATHistory('student-1');
    expect(history).toEqual([]);
  });
});
