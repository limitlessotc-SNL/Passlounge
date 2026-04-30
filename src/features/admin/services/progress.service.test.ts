// src/features/admin/services/progress.service.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/utils/devMode', () => ({
  isDevSession: vi.fn(() => false),
}));

import { isDevSession } from '@/utils/devMode';

import { fetchStudentRoster } from './progress.service';

const mockIsDevSession = vi.mocked(isDevSession);

interface SupaChain {
  select: ReturnType<typeof vi.fn>;
  eq?:    ReturnType<typeof vi.fn>;
  resolved?: unknown;
}

function studentsChain(data: unknown, error: { message: string } | null = null) {
  const chain: SupaChain = {
    select: vi.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

function sessionsChain(data: unknown, error: { message: string } | null = null) {
  const chain: SupaChain = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

describe('progress.service · fetchStudentRoster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDevSession.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns one row per student with zero aggregates when no sessions exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') {
        return studentsChain([
          { id: 's1', nickname: 'Keisha', tester_type: 'first_time', onboarded: true,
            test_date: null, daily_cards: 35, created_at: '2026-01-01T00:00:00Z' },
        ]);
      }
      if (table === 'sessions') return sessionsChain([]);
      throw new Error(`Unexpected table: ${table}`);
    });

    const rows = await fetchStudentRoster();

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('s1');
    expect(rows[0].totalSessions).toBe(0);
    expect(rows[0].totalCorrect).toBe(0);
    expect(rows[0].accuracyPct).toBe(0);
    expect(rows[0].lastSessionAt).toBeNull();
  });

  it('aggregates completed sessions into per-student totals', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') {
        return studentsChain([
          { id: 's1', nickname: 'Keisha', tester_type: 'first_time', onboarded: true,
            test_date: '2026-07-15', daily_cards: 35, created_at: '2026-01-01T00:00:00Z' },
          { id: 's2', nickname: 'Jamal',  tester_type: 'repeat', onboarded: true,
            test_date: null, daily_cards: 50, created_at: '2026-02-01T00:00:00Z' },
        ]);
      }
      if (table === 'sessions') {
        return sessionsChain([
          { student_id: 's1', correct: 18, wrong: 7, created_at: '2026-04-20T12:00:00Z' },
          { student_id: 's1', correct: 22, wrong: 3, created_at: '2026-04-25T12:00:00Z' },
          { student_id: 's2', correct: 10, wrong: 15, created_at: '2026-04-26T12:00:00Z' },
        ]);
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const rows = await fetchStudentRoster();
    const k = rows.find(r => r.id === 's1')!;
    const j = rows.find(r => r.id === 's2')!;

    expect(k.totalSessions).toBe(2);
    expect(k.totalCorrect).toBe(40);
    expect(k.totalWrong).toBe(10);
    expect(k.accuracyPct).toBe(80); // 40/50
    expect(k.lastSessionAt).toBe('2026-04-25T12:00:00Z'); // most recent

    expect(j.totalSessions).toBe(1);
    expect(j.accuracyPct).toBe(40); // 10/25
  });

  it('omits students with no nickname using "Nurse" as fallback', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') {
        return studentsChain([
          { id: 's1', nickname: null, tester_type: null, onboarded: false,
            test_date: null, daily_cards: null, created_at: null },
        ]);
      }
      if (table === 'sessions') return sessionsChain([]);
      throw new Error(`Unexpected table: ${table}`);
    });

    const rows = await fetchStudentRoster();
    expect(rows[0].nickname).toBe('Nurse');
    expect(rows[0].dailyCards).toBe(35);
    expect(rows[0].testerType).toBeNull();
    expect(rows[0].onboarded).toBe(false);
  });

  it('throws with the supabase error message when students query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return studentsChain(null, { message: 'permission denied' });
      if (table === 'sessions') return sessionsChain([]);
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(fetchStudentRoster()).rejects.toThrow(/permission denied/);
  });

  it('throws with the supabase error message when sessions query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'students') return studentsChain([]);
      if (table === 'sessions') return sessionsChain(null, { message: 'rls fail' });
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(fetchStudentRoster()).rejects.toThrow(/rls fail/);
  });

  it('returns the dev mock when isDevSession() is true', async () => {
    mockIsDevSession.mockReturnValue(true);

    const rows = await fetchStudentRoster();

    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.some(r => r.nickname === 'Keisha')).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
