// src/features/messaging/messaging.service.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(
    async () => ({ data: { user: { id: 'auth-user' } } }),
  ),
}));

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

import {
  fetchAnnouncements,
  fetchCoachInbox,
  fetchConversationWithCoach,
  fetchStudentInbox,
  fetchUnreadCount,
  markMessagesAsRead,
  sendAnnouncement,
  sendMessageToCoach,
  sendMessageToStudent,
} from './messaging.service';

interface Resolved {
  data: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

function resolved(value: Resolved) {
  return Promise.resolve({ error: null, ...value });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user' } } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── fetchStudentInbox ───────────────────────────────────────────────

describe('fetchStudentInbox', () => {
  it('returns mapped messages for the recipient with sender lookup applied', async () => {
    const rows = [
      { id: 'm1', sender_id: 'coach1', recipient_id: 'stu1', cohort_id: 'co1',
        subject: 'Hi', body: 'Hello', read_at: null, created_at: '2026-05-01T10:00:00Z',
        is_announcement: false },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          order:  vi.fn().mockReturnValue(resolved({ data: rows })),
        };
      }
      if (table === 'students') {
        return {
          select: vi.fn().mockReturnThis(),
          in:     vi.fn().mockReturnValue(resolved({ data: [] })),
        };
      }
      if (table === 'coaches') {
        return {
          select: vi.fn().mockReturnThis(),
          in:     vi.fn().mockReturnValue(resolved({
            data: [{ auth_id: 'coach1', name: 'Coach Bee' }],
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await fetchStudentInbox('stu1');
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe('Hello');
    expect(result[0].sender_name).toBe('Coach Bee');
  });

  it('returns [] on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnValue(resolved({ data: null, error: { message: 'rls' } })),
    });
    expect(await fetchStudentInbox('stu1')).toEqual([]);
  });
});

// ─── fetchConversationWithCoach ──────────────────────────────────────

describe('fetchConversationWithCoach', () => {
  it('queries with the bidirectional or filter and returns oldest-first', async () => {
    const rows = [
      { id: 'm1', sender_id: 'stu1', recipient_id: 'coach1', cohort_id: null,
        subject: '', body: 'first',  read_at: null, created_at: '2026-05-01T09:00:00Z',
        is_announcement: false },
      { id: 'm2', sender_id: 'coach1', recipient_id: 'stu1', cohort_id: null,
        subject: '', body: 'second', read_at: null, created_at: '2026-05-01T10:00:00Z',
        is_announcement: false },
    ];
    let orFilter: string | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnThis(),
          or:     vi.fn().mockImplementation((f: string) => { orFilter = f; return {
            order: vi.fn().mockReturnValue(resolved({ data: rows })),
          }; }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        in:     vi.fn().mockReturnValue(resolved({ data: [] })),
      };
    });

    const result = await fetchConversationWithCoach('stu1', 'coach1');
    expect(result.map(m => m.body)).toEqual(['first', 'second']);
    expect(orFilter).toContain('sender_id.eq.stu1');
    expect(orFilter).toContain('sender_id.eq.coach1');
  });
});

// ─── sendMessageToCoach + sendMessageToStudent ───────────────────────

describe('sendMessage*', () => {
  it('sendMessageToCoach inserts with sender_id from auth', async () => {
    let inserted: Record<string, unknown> | null = null;
    mockFrom.mockReturnValue({
      insert: vi.fn().mockImplementation((row: Record<string, unknown>) => {
        inserted = row;
        return resolved({ data: null });
      }),
    });
    await sendMessageToCoach({ recipient_id: 'coach1', body: 'hey', cohort_id: 'co1' });
    expect(inserted).toMatchObject({
      sender_id: 'auth-user',
      recipient_id: 'coach1',
      cohort_id: 'co1',
      body: 'hey',
      is_announcement: false,
    });
  });

  it('sendMessageToCoach throws when not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(
      sendMessageToCoach({ recipient_id: 'coach1', body: 'hey' }),
    ).rejects.toThrow(/Not signed in/);
  });

  it('sendMessageToStudent surfaces supabase error', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue(resolved({ data: null, error: { message: 'rls deny' } })),
    });
    await expect(
      sendMessageToStudent({ recipient_id: 'stu1', body: 'hey' }),
    ).rejects.toThrow(/rls deny/);
  });
});

// ─── markMessagesAsRead ──────────────────────────────────────────────

describe('markMessagesAsRead', () => {
  it('no-ops when ids array is empty', async () => {
    await markMessagesAsRead([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('updates read_at filtered by recipient', async () => {
    const update = vi.fn().mockReturnThis();
    const inFn   = vi.fn().mockReturnThis();
    const eq     = vi.fn().mockReturnValue(resolved({ data: null }));
    mockFrom.mockReturnValue({ update, in: inFn, eq });
    await markMessagesAsRead(['m1', 'm2']);
    expect(update).toHaveBeenCalled();
    expect(inFn).toHaveBeenCalledWith('id', ['m1', 'm2']);
    expect(eq).toHaveBeenCalledWith('recipient_id', 'auth-user');
  });
});

// ─── fetchUnreadCount ────────────────────────────────────────────────

describe('fetchUnreadCount', () => {
  it('returns 0 for empty userId without querying', async () => {
    expect(await fetchUnreadCount('')).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns the count when supabase responds with a number', async () => {
    // Chain: from().select().eq().is().eq() — the trailing .eq() resolves.
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      is:     vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockReturnValue(resolved({ data: null, count: 7 })),
      })),
    });
    expect(await fetchUnreadCount('stu1')).toBe(7);
  });

  it('returns 0 on error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      is:     vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockReturnValue(resolved({
          data: null, count: null, error: { message: 'rls' },
        })),
      })),
    });
    expect(await fetchUnreadCount('stu1')).toBe(0);
  });
});

// ─── fetchAnnouncements ──────────────────────────────────────────────

describe('fetchAnnouncements', () => {
  it('filters by cohort + is_announcement true', async () => {
    let eqArgs: unknown[][] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        eqArgs = [];
        const eq = vi.fn().mockImplementation((...args) => {
          eqArgs.push(args);
          // Second .eq() returns the order-able terminator, so chain differs
          return eqArgs.length === 2
            ? { order: vi.fn().mockReturnValue(resolved({ data: [] })) }
            : { eq };
        });
        return { select: vi.fn().mockReturnThis(), eq };
      }
      return {
        select: vi.fn().mockReturnThis(),
        in:     vi.fn().mockReturnValue(resolved({ data: [] })),
      };
    });

    await fetchAnnouncements('co1');
    expect(eqArgs).toContainEqual(['cohort_id', 'co1']);
    expect(eqArgs).toContainEqual(['is_announcement', true]);
  });
});

// ─── fetchCoachInbox ─────────────────────────────────────────────────

describe('fetchCoachInbox', () => {
  it('groups messages by other party and computes unread count', async () => {
    const rows = [
      { id: 'm1', sender_id: 'stu1',  recipient_id: 'coach1', cohort_id: null,
        subject: '', body: 'a', read_at: null, created_at: '2026-05-01T09:00:00Z',
        is_announcement: false },
      { id: 'm2', sender_id: 'coach1', recipient_id: 'stu1',  cohort_id: null,
        subject: '', body: 'b', read_at: null, created_at: '2026-05-01T10:00:00Z',
        is_announcement: false },
      { id: 'm3', sender_id: 'stu2',  recipient_id: 'coach1', cohort_id: null,
        subject: '', body: 'c', read_at: null, created_at: '2026-05-01T11:00:00Z',
        is_announcement: false },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') {
        return {
          select: vi.fn().mockReturnThis(),
          or:     vi.fn().mockReturnThis(),
          eq:     vi.fn().mockReturnThis(),
          order:  vi.fn().mockReturnValue(resolved({ data: rows })),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        in:     vi.fn().mockReturnValue(resolved({ data: [] })),
      };
    });

    const out = await fetchCoachInbox('coach1');
    expect(out.length).toBe(2);
    // Sorted newest first; stu2 had the latest message.
    expect(out[0].other_party_id).toBe('stu2');
    expect(out[1].other_party_id).toBe('stu1');
    // stu1 conversation has 1 inbound unread (m1, m3 from stu2 also unread but in its own conv).
    const stu1 = out.find(c => c.other_party_id === 'stu1')!;
    expect(stu1.unread_count).toBe(1); // only m1 (m2 is outbound from coach)
    expect(stu1.messages).toHaveLength(2);
  });
});

// ─── sendAnnouncement ────────────────────────────────────────────────

describe('sendAnnouncement', () => {
  it('inserts an announcement row + fans out to active cohort members', async () => {
    const inserts: Array<{ table: string; rows: unknown }> = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'coaches') {
        return {
          select:      vi.fn().mockReturnThis(),
          eq:          vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(resolved({ data: { id: 'coach-row-id' } })),
        };
      }
      if (table === 'announcements') {
        return {
          insert: vi.fn().mockImplementation((row) => {
            inserts.push({ table: 'announcements', rows: row });
            return resolved({ data: null });
          }),
        };
      }
      if (table === 'cohort_students') {
        return {
          select: vi.fn().mockReturnThis(),
          eq:     vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockReturnValue(resolved({
              data: [{ student_id: 'stu1' }, { student_id: 'stu2' }],
            })),
          })),
        };
      }
      if (table === 'messages') {
        return {
          insert: vi.fn().mockImplementation((rows) => {
            inserts.push({ table: 'messages', rows });
            return resolved({ data: null });
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await sendAnnouncement('coach-auth-1', 'co1', 'Heads up', 'Read this', true);
    expect(result.studentCount).toBe(2);
    expect(inserts.find(i => i.table === 'announcements')).toBeDefined();
    const fanout = inserts.find(i => i.table === 'messages');
    expect(fanout).toBeDefined();
    expect(Array.isArray(fanout!.rows)).toBe(true);
    const arr = fanout!.rows as Array<{ recipient_id: string; is_announcement: boolean }>;
    expect(arr.map(r => r.recipient_id).sort()).toEqual(['stu1', 'stu2']);
    expect(arr.every(r => r.is_announcement === true)).toBe(true);
  });

  it('throws when coach lookup fails', async () => {
    mockFrom.mockImplementation(() => ({
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(resolved({ data: null })),
    }));
    await expect(
      sendAnnouncement('auth-x', 'co1', 't', 'b'),
    ).rejects.toThrow(/Coach not found/);
  });
});
