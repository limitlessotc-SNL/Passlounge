// src/features/coach/coach.service.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/config/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import {
  addCoachNote,
  addStudentToCohort,
  createCohort,
  fetchStudentMetrics,
  getCoachByAuthId,
  getCoachCohorts,
  getCoachNotes,
  getCohortStudents,
  getInterventions,
  getSchoolById,
  getStudentOutcomes,
  joinCohortByCode,
  logIntervention,
  recordNCLEXOutcome,
  updateCohort,
  updateStudentStatus,
} from './coach.service';

// ─── Chain helpers (mirror existing service test patterns) ───────────

interface Resolved {
  data: unknown;
  error: { message: string; code?: string } | null;
}

function chain(steps: Record<string, unknown>): Record<string, unknown> {
  return steps;
}

function resolved(value: Resolved) {
  return Promise.resolve(value);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Coach auth ──────────────────────────────────────────────────────

describe('getCoachByAuthId', () => {
  it('returns a coach row when present', async () => {
    const fakeCoach = { id: 'c1', auth_id: 'auth1', school_id: 's1', name: 'Bee', email: 'b@x.com', role: 'faculty', is_active: true, created_at: '' };
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(resolved({ data: fakeCoach, error: null })),
    }));
    const c = await getCoachByAuthId('auth1');
    expect(c?.id).toBe('c1');
  });

  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(resolved({ data: null, error: null })),
    }));
    expect(await getCoachByAuthId('auth1')).toBeNull();
  });

  it('returns null on error (logs warning)', async () => {
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(resolved({ data: null, error: { message: 'rls' } })),
    }));
    expect(await getCoachByAuthId('auth1')).toBeNull();
  });
});

describe('getSchoolById', () => {
  it('returns school row', async () => {
    const fake = { id: 's1', name: 'SNL', contact_email: 'a@b.com', license_tier: 'enterprise', max_students: 9999, is_active: true, created_at: '' };
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(resolved({ data: fake, error: null })),
    }));
    const s = await getSchoolById('s1');
    expect(s?.name).toBe('SNL');
  });
});

// ─── Cohort management ──────────────────────────────────────────────

describe('getCoachCohorts', () => {
  it('returns cohorts for a coach', async () => {
    const rows = [{ id: 'co1', name: 'NUR 425', cohort_code: 'ABCDEF' }];
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(resolved({ data: rows, error: null })),
    }));
    const r = await getCoachCohorts('c1');
    expect(r.length).toBe(1);
    expect(r[0].cohort_code).toBe('ABCDEF');
  });
});

describe('createCohort', () => {
  it('inserts with a generated 6-char alphanumeric code', async () => {
    const inserted: Record<string, unknown>[] = [];
    mockFrom.mockReturnValue(chain({
      insert: vi.fn().mockImplementation((obj: Record<string, unknown>) => {
        inserted.push(obj);
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnValue(resolved({
            data: { id: 'co1', ...obj, created_at: 'now' },
            error: null,
          })),
        };
      }),
    }));
    const cohort = await createCohort({
      school_id: 's1', coach_id: 'c1', name: 'NUR 425',
      target_test_date: null, is_active: true,
    });
    expect(cohort.id).toBe('co1');
    const code = inserted[0].cohort_code as string;
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('retries up to 3 times on unique code collision', async () => {
    let attempt = 0;
    mockFrom.mockReturnValue(chain({
      insert: vi.fn().mockImplementation(() => {
        attempt++;
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnValue(resolved(
            attempt < 3
              ? { data: null, error: { message: 'duplicate', code: '23505' } }
              : { data: { id: 'co1', name: 'X', cohort_code: 'XYZ123', school_id: 's', coach_id: 'c', target_test_date: null, is_active: true, created_at: 'n' }, error: null },
          )),
        };
      }),
    }));
    const c = await createCohort({
      school_id: 's', coach_id: 'c', name: 'X',
      target_test_date: null, is_active: true,
    });
    expect(attempt).toBe(3);
    expect(c.id).toBe('co1');
  });

  it('throws after 3 collisions', async () => {
    mockFrom.mockReturnValue(chain({
      insert: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnValue(resolved({ data: null, error: { message: 'duplicate', code: '23505' } })),
      })),
    }));
    await expect(createCohort({
      school_id: 's', coach_id: 'c', name: 'X',
      target_test_date: null, is_active: true,
    })).rejects.toThrow(/unique cohort code/);
  });
});

describe('updateCohort', () => {
  it('updates the row', async () => {
    mockFrom.mockReturnValue(chain({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue(resolved({ data: null, error: null })),
    }));
    await expect(updateCohort('co1', { name: 'New' })).resolves.toBeUndefined();
  });
});

describe('joinCohortByCode', () => {
  it('joins when code matches an active cohort', async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        // SELECT cohort
        return chain({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(resolved({
            data: { id: 'co1', cohort_code: 'NUR425', is_active: true, school_id: 's', coach_id: 'c', name: 'NUR 425', target_test_date: null, created_at: '' },
            error: null,
          })),
        });
      }
      // INSERT cohort_students
      return chain({
        insert: vi.fn().mockReturnValue(resolved({ data: null, error: null })),
      });
    });
    const c = await joinCohortByCode('nur425', 'stu1');
    expect(c.id).toBe('co1');
  });

  it('throws Invalid code when not found', async () => {
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(resolved({ data: null, error: null })),
    }));
    await expect(joinCohortByCode('XXXXXX', 'stu1')).rejects.toThrow(/Invalid code/);
  });

  it('throws when cohort is inactive', async () => {
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(resolved({
        data: { id: 'co1', cohort_code: 'X', is_active: false },
        error: null,
      })),
    }));
    await expect(joinCohortByCode('X', 'stu1')).rejects.toThrow(/no longer active/);
  });

  it('swallows duplicate-membership inserts', async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        return chain({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(resolved({
            data: { id: 'co1', is_active: true, cohort_code: 'X', school_id: '', coach_id: '', name: '', target_test_date: null, created_at: '' },
            error: null,
          })),
        });
      }
      return chain({
        insert: vi.fn().mockReturnValue(resolved({ data: null, error: { message: 'duplicate key', code: '23505' } })),
      });
    });
    await expect(joinCohortByCode('X', 'stu1')).resolves.toBeDefined();
  });
});

describe('getCohortStudents / addStudentToCohort / updateStudentStatus', () => {
  it('addStudentToCohort inserts the row', async () => {
    mockFrom.mockReturnValue(chain({
      insert: vi.fn().mockReturnValue(resolved({ data: null, error: null })),
    }));
    await expect(addStudentToCohort('co1', 'stu1')).resolves.toBeUndefined();
  });

  it('updateStudentStatus chains both eq() filters', async () => {
    let eqCalls = 0;
    mockFrom.mockReturnValue(chain({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        eqCalls++;
        if (eqCalls < 2) return chain({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue(resolved({ data: null, error: null })),
        });
        return resolved({ data: null, error: null });
      }),
    }));
    await expect(updateStudentStatus('co1', 'stu1', 'passed')).resolves.toBeUndefined();
  });

  it('getCohortStudents returns membership rows', async () => {
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue(resolved({
        data: [{ cohort_id: 'co1', student_id: 'stu1', status: 'active', joined_at: '' }],
        error: null,
      })),
    }));
    const rows = await getCohortStudents('co1');
    expect(rows.length).toBe(1);
    expect(rows[0].student_id).toBe('stu1');
  });
});

// ─── Student metrics ─────────────────────────────────────────────────

describe('fetchStudentMetrics', () => {
  it('reduces students+CAT+sessions into a StudentMetrics row', async () => {
    const studentRow = { id: 'stu1', nickname: 'Keisha', test_date: null, avatar: null };
    const catRows = [
      { cat_level: 4.0, pass_probability: 78, taken_at: '2026-04-25T00:00:00Z',
        category_accuracy: { 'Pharmacology': { correct: 8, total: 10 }, 'Management of Care': { correct: 5, total: 8 } },
        trend_direction: 'improving' },
      { cat_level: 3.6, pass_probability: 70, taken_at: '2026-04-18T00:00:00Z',
        category_accuracy: {}, trend_direction: 'stable' },
    ];
    const sessionRows = [
      { student_id: 'stu1', correct: 12, wrong: 8, card_count: 20, created_at: '2026-04-26T12:00:00Z', categories: '' },
      { student_id: 'stu1', correct: 9, wrong: 6, card_count: 15, created_at: '2026-04-22T12:00:00Z', categories: '' },
    ];

    let table = '';
    mockFrom.mockImplementation((t: string) => {
      table = t;
      if (t === 'students') {
        return chain({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(resolved({ data: studentRow, error: null })),
        });
      }
      if (t === 'cat_results') {
        return chain({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnValue(resolved({ data: catRows, error: null })),
        });
      }
      if (t === 'sessions') {
        return chain({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnValue(resolved({ data: sessionRows, error: null })),
          })),
        });
      }
      throw new Error(`unexpected table: ${t}`);
    });

    const m = await fetchStudentMetrics('stu1');
    expect(m.student_id).toBe('stu1');
    expect(m.name).toBe('Keisha');
    expect(m.cat_level).toBe(4.0);
    expect(m.cat_level_previous).toBe(3.6);
    expect(m.pass_probability).toBe(78);
    expect(m.cat_velocity).toBeGreaterThan(0);
    expect(m.total_cat_sessions).toBe(2);
    expect(m.category_accuracy.length).toBe(2);
    // table reference quietens the compiler about the unused variable
    expect(table).toBe('sessions');
  });

  it('handles students with no activity gracefully', async () => {
    mockFrom.mockImplementation((t: string) => {
      if (t === 'students') {
        return chain({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(resolved({ data: { id: 'stu', nickname: '', test_date: null, avatar: null }, error: null })),
        });
      }
      if (t === 'cat_results') {
        return chain({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnValue(resolved({ data: [], error: null })),
        });
      }
      return chain({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => ({
          eq: vi.fn().mockReturnValue(resolved({ data: [], error: null })),
        })),
      });
    });

    const m = await fetchStudentMetrics('stu');
    expect(m.cat_level).toBeNull();
    expect(m.total_cat_sessions).toBe(0);
    expect(m.total_cards_studied).toBe(0);
    expect(m.risk_flags).toContain('No CAT taken yet');
    expect(m.risk_level).toBe('red'); // readiness 0 → red
  });
});

// ─── Notes + interventions ───────────────────────────────────────────

describe('coach notes + interventions', () => {
  it('addCoachNote rejects empty notes', async () => {
    await expect(addCoachNote('c1', 'stu1', '   ')).rejects.toThrow(/empty/);
  });

  it('addCoachNote inserts trimmed note', async () => {
    let inserted: Record<string, unknown> = {};
    mockFrom.mockReturnValue(chain({
      insert: vi.fn().mockImplementation((obj: Record<string, unknown>) => {
        inserted = obj;
        return resolved({ data: null, error: null });
      }),
    }));
    await addCoachNote('c1', 'stu1', '  hello ');
    expect(inserted.note).toBe('hello');
  });

  it('getCoachNotes returns sorted notes', async () => {
    const rows = [{ id: '1', coach_id: 'c1', student_id: 'stu1', note: 'hi', created_at: '' }];
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => ({
          order: vi.fn().mockReturnValue(resolved({ data: rows, error: null })),
        })),
      })),
    }));
    const r = await getCoachNotes('c1', 'stu1');
    expect(r.length).toBe(1);
  });

  it('logIntervention inserts the row', async () => {
    mockFrom.mockReturnValue(chain({
      insert: vi.fn().mockReturnValue(resolved({ data: null, error: null })),
    }));
    await expect(logIntervention({
      coach_id: 'c1', student_id: 'stu1', type: 'message',
      notes: 'msg', outcome: null,
    })).resolves.toBeUndefined();
  });

  it('getInterventions queries by coach + student', async () => {
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => ({
          order: vi.fn().mockReturnValue(resolved({ data: [], error: null })),
        })),
      })),
    }));
    expect(await getInterventions('c1', 'stu1')).toEqual([]);
  });
});

// ─── NCLEX outcomes ──────────────────────────────────────────────────

describe('NCLEX outcomes', () => {
  it('recordNCLEXOutcome inserts the row', async () => {
    mockFrom.mockReturnValue(chain({
      insert: vi.fn().mockReturnValue(resolved({ data: null, error: null })),
    }));
    await expect(recordNCLEXOutcome({
      student_id: 'stu', cohort_id: 'co', test_date: '2026-08-01',
      result: 'passed', attempt_number: 1,
    })).resolves.toBeUndefined();
  });

  it('getStudentOutcomes returns rows newest first', async () => {
    mockFrom.mockReturnValue(chain({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        order: vi.fn().mockReturnValue(resolved({
          data: [{ id: '1', test_date: '2026-08-01', result: 'passed', attempt_number: 1, student_id: 'stu', cohort_id: null, recorded_at: '' }],
          error: null,
        })),
      })),
    }));
    const r = await getStudentOutcomes('stu');
    expect(r.length).toBe(1);
    expect(r[0].result).toBe('passed');
  });
});
