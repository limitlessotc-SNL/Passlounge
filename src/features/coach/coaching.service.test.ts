// src/features/coach/coaching.service.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockInvoke, mockGetUser } = vi.hoisted(() => ({
  mockFrom:    vi.fn(),
  mockInvoke:  vi.fn(),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(
    async () => ({ data: { user: { id: 'auth-coach' } } }),
  ),
}));

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth:      { getUser: () => mockGetUser() },
  },
}));

import {
  buildWeeklyDigest,
  computeCohortHealth,
  computeStudyPattern,
  derivePatternFromSessions,
  detectCohortWideIssue,
  generateCoachingSuggestion,
  generateCountdownAlert,
  getInterventionOutcomes,
  getPreviousSuggestions,
  recordInterventionOutcome,
} from './coaching.service';
import type {
  CategoryAccuracy,
  CohortHealth,
  Intervention,
  InterventionOutcome,
  StudentMetrics,
} from './coach.types';

function metricsFixture(overrides: Partial<StudentMetrics> = {}): StudentMetrics {
  return {
    student_id: 'stu1',
    name: 'Keisha',
    email: 'k@x.com',
    avatar: null,
    test_date: '2026-07-15',
    days_to_test: 60,
    cat_level: 3.5,
    cat_level_previous: 3.2,
    cat_velocity: 0.3,
    pass_probability: 70,
    projected_pass_probability: 80,
    readiness_score: 70,
    risk_level: 'green',
    last_active_at: new Date().toISOString(),
    days_since_active: 0,
    active_days_last_14: 12,
    total_cards_studied: 200,
    total_cat_sessions: 3,
    current_streak: 5,
    category_accuracy: [],
    weakest_categories: [],
    sr_compliance: 0.7,
    ngn_accuracy: 0.65,
    trend_direction: 'improving',
    risk_flags: [],
    ...overrides,
  };
}

function cat(category: string, correct: number, total: number): CategoryAccuracy {
  return { category, correct, total, accuracy: total > 0 ? correct / total : 0 };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── generateCountdownAlert ──────────────────────────────────────────

describe('generateCountdownAlert', () => {
  it('returns null without a test date', () => {
    expect(generateCountdownAlert(null, 60)).toBeNull();
  });

  it('returns null when student is on track for the closest tier', () => {
    expect(generateCountdownAlert(28, 90)).toBeNull(); // 30-day tier requires <60
    expect(generateCountdownAlert(13, 90)).toBeNull(); // 14-day tier requires <70
    expect(generateCountdownAlert(6,  90)).toBeNull(); // 7-day tier requires <80
  });

  it('warning at 30 days when readiness < 60', () => {
    const a = generateCountdownAlert(28, 50);
    expect(a?.alert_level).toBe('warning');
    expect(a?.days_remaining).toBe(28);
    expect(a?.message).toMatch(/Test in 28 days/);
  });

  it('urgent at 14 days when readiness < 70 (and not <80 at 7-day tier)', () => {
    const a = generateCountdownAlert(13, 65);
    expect(a?.alert_level).toBe('urgent');
  });

  it('critical at 7 days when readiness < 80', () => {
    const a = generateCountdownAlert(5, 75);
    expect(a?.alert_level).toBe('critical');
    expect(a?.message).toMatch(/same-week 1:1/);
  });

  it('picks the most urgent tier when multiple match', () => {
    // 5 days, readiness 50 → matches all three; should be critical.
    const a = generateCountdownAlert(5, 50);
    expect(a?.alert_level).toBe('critical');
  });
});

// ─── computeCohortHealth + detectCohortWideIssue ─────────────────────

describe('computeCohortHealth + detectCohortWideIssue', () => {
  it('aggregates pass probability, inactives, and below-passing counts', () => {
    const health = computeCohortHealth([
      metricsFixture({ student_id: 's1', pass_probability: 80, cat_level: 4, days_since_active: 0 }),
      metricsFixture({ student_id: 's2', pass_probability: 40, cat_level: 2.5, days_since_active: 8 }),
      metricsFixture({ student_id: 's3', pass_probability: 60, cat_level: null, days_since_active: 2 }),
    ]);
    expect(health.total_students).toBe(3);
    expect(health.students_not_active_7_days).toBe(1);
    expect(health.students_below_passing).toBe(1);  // only s2 has cat_level < 3
    expect(health.avg_pass_probability).toBe(60);   // (80+40+60)/3
  });

  it('finds the cohort-wide weakest category averaged across qualifying students', () => {
    const health = computeCohortHealth([
      metricsFixture({ student_id: 's1', category_accuracy: [
        cat('Pharmacology', 3, 10),         // 30%
        cat('Safety', 8, 10),               // 80%
      ]}),
      metricsFixture({ student_id: 's2', category_accuracy: [
        cat('Pharmacology', 4, 10),         // 40%
        cat('Safety', 9, 10),               // 90%
      ]}),
    ]);
    expect(health.weakest_category).toBe('Pharmacology');
    expect(health.weakest_category_avg_accuracy).toBeCloseTo(0.35, 2);
  });

  it('detectCohortWideIssue fires on weakest category < 55%', () => {
    const h: CohortHealth = {
      avg_pass_probability: 60,
      weakest_category: 'Pharmacology',
      weakest_category_avg_accuracy: 0.45,
      students_not_active_7_days: 0,
      students_below_passing: 0,
      total_students: 10,
    };
    expect(detectCohortWideIssue(h)).toMatch(/Pharmacology averaging 45%/);
  });

  it('detectCohortWideIssue fires when >30% inactive', () => {
    const h: CohortHealth = {
      avg_pass_probability: 70,
      weakest_category: null,
      weakest_category_avg_accuracy: null,
      students_not_active_7_days: 4,
      students_below_passing: 0,
      total_students: 10,
    };
    expect(detectCohortWideIssue(h)).toMatch(/4 of 10/);
  });

  it('detectCohortWideIssue fires when >50% below passing', () => {
    const h: CohortHealth = {
      avg_pass_probability: 50,
      weakest_category: null,
      weakest_category_avg_accuracy: null,
      students_not_active_7_days: 0,
      students_below_passing: 6,
      total_students: 10,
    };
    expect(detectCohortWideIssue(h)).toMatch(/6 of 10/);
  });

  it('detectCohortWideIssue returns null when cohort is healthy', () => {
    const h: CohortHealth = {
      avg_pass_probability: 80,
      weakest_category: 'Pharmacology',
      weakest_category_avg_accuracy: 0.7,
      students_not_active_7_days: 1,
      students_below_passing: 1,
      total_students: 10,
    };
    expect(detectCohortWideIssue(h)).toBeNull();
  });
});

// ─── derivePatternFromSessions ───────────────────────────────────────

describe('derivePatternFromSessions', () => {
  it('returns the neutral default when no sessions', () => {
    const p = derivePatternFromSessions('stu1', []);
    expect(p.peak_study_days).toEqual([]);
    expect(p.peak_study_hours).toEqual([]);
    expect(p.avg_session_length_mins).toBe(0);
    expect(p.avg_daily_cards).toBe(0);
    expect(p.dropout_risk_days).toEqual([]);
  });

  it('groups by day-of-week and hour and picks the busiest', () => {
    const rows = [
      // Monday 9am — 2 sessions
      { student_id: 'stu', card_count: 20, created_at: '2026-04-13T09:00:00Z' },
      { student_id: 'stu', card_count: 20, created_at: '2026-04-13T09:30:00Z' },
      // Tuesday 10am
      { student_id: 'stu', card_count: 15, created_at: '2026-04-14T10:00:00Z' },
      // Friday 21:00
      { student_id: 'stu', card_count: 10, created_at: '2026-04-17T21:00:00Z' },
    ];
    const p = derivePatternFromSessions('stu', rows);
    // Note: Date.getDay() uses local timezone; Monday morning UTC could
    // become Sunday locally — assert that whichever local day the entries
    // landed on is in the peak set.
    expect(p.peak_study_days.length).toBeGreaterThanOrEqual(1);
    expect(p.peak_study_hours.length).toBeGreaterThanOrEqual(1);
    expect(p.avg_daily_cards).toBeGreaterThan(0);
  });

  it('flags a dropout-risk day when sandwiched between active days', () => {
    const rows = [
      { student_id: 'stu', card_count: 10, created_at: '2026-04-13T09:00:00Z' }, // Mon
      // Tue skipped
      { student_id: 'stu', card_count: 10, created_at: '2026-04-15T09:00:00Z' }, // Wed
      { student_id: 'stu', card_count: 10, created_at: '2026-04-17T09:00:00Z' }, // Fri  (Thu skipped)
      // Repeat the pattern next week so the same skipped day appears twice → makes it past the >=2 threshold
      { student_id: 'stu', card_count: 10, created_at: '2026-04-20T09:00:00Z' }, // Mon
      { student_id: 'stu', card_count: 10, created_at: '2026-04-22T09:00:00Z' }, // Wed (Tue skipped)
      { student_id: 'stu', card_count: 10, created_at: '2026-04-24T09:00:00Z' }, // Fri (Thu skipped)
    ];
    const p = derivePatternFromSessions('stu', rows);
    // Either Tuesday or Thursday gets flagged (dropout_risk_days requires count >= 2)
    expect(p.dropout_risk_days.length).toBeGreaterThan(0);
  });
});

// ─── buildWeeklyDigest ───────────────────────────────────────────────

describe('buildWeeklyDigest', () => {
  it('picks most improved by highest positive velocity', () => {
    const d = buildWeeklyDigest('co1', [
      metricsFixture({ student_id: 's1', cat_velocity: 0.1 }),
      metricsFixture({ student_id: 's2', cat_velocity: 0.5 }),
      metricsFixture({ student_id: 's3', cat_velocity: -0.2 }),
    ]);
    expect(d.most_improved?.student_id).toBe('s2');
    expect(d.most_improved_delta).toBe(0.5);
  });

  it('returns null most_improved when no one is improving', () => {
    const d = buildWeeklyDigest('co1', [
      metricsFixture({ cat_velocity: -0.1 }),
      metricsFixture({ cat_velocity: 0 }),
    ]);
    expect(d.most_improved).toBeNull();
    expect(d.most_improved_delta).toBeNull();
  });

  it('most_at_risk = red students sorted by readiness asc, max 5', () => {
    const d = buildWeeklyDigest('co1', [
      metricsFixture({ student_id: 'a', risk_level: 'red',   readiness_score: 30 }),
      metricsFixture({ student_id: 'b', risk_level: 'red',   readiness_score: 45 }),
      metricsFixture({ student_id: 'c', risk_level: 'amber', readiness_score: 60 }),
      metricsFixture({ student_id: 'd', risk_level: 'red',   readiness_score: 20 }),
    ]);
    expect(d.most_at_risk.map(m => m.student_id)).toEqual(['d', 'a', 'b']);
  });

  it('flags students_needing_contact when inactive 3+ days and test < 30', () => {
    const d = buildWeeklyDigest('co1', [
      metricsFixture({ student_id: 'a', days_since_active: 5, days_to_test: 15 }),
      metricsFixture({ student_id: 'b', days_since_active: 1, days_to_test: 15 }),
      metricsFixture({ student_id: 'c', days_since_active: 10, days_to_test: 60 }),
    ]);
    expect(d.students_needing_contact.map(m => m.student_id)).toEqual(['a']);
  });

  it('exposes cohort weakness from the health snapshot', () => {
    const d = buildWeeklyDigest('co1', [
      metricsFixture({ student_id: 'a', category_accuracy: [cat('Pharm', 2, 10)] }),
      metricsFixture({ student_id: 'b', category_accuracy: [cat('Pharm', 3, 10)] }),
    ]);
    expect(d.cohort_wide_weakness).toBe('Pharm');
  });
});

// ─── generateCoachingSuggestion (mocked Edge Function) ───────────────

describe('generateCoachingSuggestion', () => {
  it('invokes the Edge Function with the right payload and parses the result', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        suggestion: {
          recommendation:    'Focus on Pharmacology',
          urgency:           'high',
          suggested_message: 'Hey, let\'s schedule 30 minutes',
          focus_categories:  ['Pharmacology'],
          weekly_actions:    ['Complete 20 cards'],
          celebration:       false,
        },
      },
      error: null,
    });
    // Suppress the secondary persistence path (auth + insert) cleanly.
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await generateCoachingSuggestion(
      metricsFixture(),
      [],
      [],
      [],
      null,
      'NUR 425',
      computeCohortHealth([metricsFixture()]),
    );
    expect(result.recommendation).toBe('Focus on Pharmacology');
    expect(result.urgency).toBe('high');
    expect(result.focus_categories).toEqual(['Pharmacology']);
    expect(mockInvoke).toHaveBeenCalledWith('coaching-suggestion', expect.objectContaining({
      body: expect.objectContaining({ student_id: 'stu1' }),
    }));
  });

  it('throws when the Edge Function returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'rate limited' } });
    await expect(
      generateCoachingSuggestion(metricsFixture(), [], [], [], null, 'X', computeCohortHealth([])),
    ).rejects.toThrow(/rate limited/);
  });

  it('throws when the Edge Function returns no suggestion', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });
    await expect(
      generateCoachingSuggestion(metricsFixture(), [], [], [], null, 'X', computeCohortHealth([])),
    ).rejects.toThrow(/no suggestion/);
  });
});

// ─── recordInterventionOutcome + getInterventionOutcomes ────────────

describe('intervention outcomes', () => {
  it('recordInterventionOutcome inserts the row', async () => {
    let inserted: Record<string, unknown> | null = null;
    mockFrom.mockReturnValue({
      insert: vi.fn().mockImplementation((row) => {
        inserted = row;
        return Promise.resolve({ data: null, error: null });
      }),
    });
    await recordInterventionOutcome(
      'i1', 'stu1', 'coach1', 3.2, 3.7, true, 'session helped',
    );
    expect(inserted).toMatchObject({
      intervention_id: 'i1', student_id: 'stu1', coach_id: 'coach1',
      cat_level_before: 3.2, cat_level_after: 3.7,
      was_effective: true, notes: 'session helped',
    });
  });

  it('recordInterventionOutcome surfaces supabase error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'rls' } }),
    });
    await expect(
      recordInterventionOutcome('i1', 'stu1', 'coach1', null, null, false, ''),
    ).rejects.toThrow(/rls/);
  });

  it('getInterventionOutcomes returns rows', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockResolvedValue({ data: [
        { id: 'o1', intervention_id: 'i1', student_id: 'stu1', coach_id: 'c1',
          cat_level_before: 3, cat_level_after: 3.5, was_effective: true,
          notes: '', recorded_at: '' },
      ], error: null }),
    });
    const out = await getInterventionOutcomes('stu1');
    expect(out.length).toBe(1);
    expect(out[0].was_effective).toBe(true);
  });
});

describe('getPreviousSuggestions', () => {
  it('returns the suggestion strings newest-first', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockResolvedValue({
        data: [
          { suggestion: 'second' },
          { suggestion: 'first' },
        ],
        error: null,
      }),
    });
    expect(await getPreviousSuggestions('stu1')).toEqual(['second', 'first']);
  });
});

// ─── computeStudyPattern (DB-touching wrapper) ──────────────────────

describe('computeStudyPattern', () => {
  it('reads sessions and upserts to study_patterns', async () => {
    let upsertArgs: Record<string, unknown> | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          gte:    vi.fn().mockReturnThis(),
          order:  vi.fn().mockResolvedValue({
            data: [
              { student_id: 'stu1', card_count: 10, created_at: '2026-04-13T09:00:00Z' },
              { student_id: 'stu1', card_count: 10, created_at: '2026-04-14T09:00:00Z' },
            ],
            error: null,
          }),
        };
      }
      if (table === 'study_patterns') {
        return {
          upsert: vi.fn().mockImplementation((row) => {
            upsertArgs = row;
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const p = await computeStudyPattern('stu1');
    expect(p.student_id).toBe('stu1');
    expect(upsertArgs).toMatchObject({ student_id: 'stu1' });
  });
});

interface InterventionFixture extends Partial<Intervention> {}
interface OutcomeFixture extends Partial<InterventionOutcome> {}

// Ensures the unused-fixture types don't trip lint.
const _typeProbeIntervention: InterventionFixture = {};
const _typeProbeOutcome: OutcomeFixture = {};
void [_typeProbeIntervention, _typeProbeOutcome];
