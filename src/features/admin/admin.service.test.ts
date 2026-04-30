// src/features/admin/admin.service.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/config/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('@/config/env', () => ({
  env: { adminPassword: 'TestPass123', adminRateLimit: 5 },
}));

import { useAuthStore } from '@/store/authStore';

import {
  ADMIN_SESSION_TTL_MS,
  checkIsAdmin,
  checkRateLimit,
  clearAdminSession,
  getAdminSession,
  isAdminSessionValid,
  logAdminAction,
  recordAttempt,
  setAdminSession,
  verifyAdminPassword,
} from './admin.service';

function chain(overrides: Record<string, unknown> = {}) {
  return {
    select:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    gte:         vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAdminSession();
  useAuthStore.setState({
    user: { id: 'stu-1', email: 't@t.com' },
    supaStudentId: 'stu-1',
    token: 'tok',
    isAuthenticated: true,
    isLoading: false,
  });
});

afterEach(() => {
  clearAdminSession();
  useAuthStore.getState().logout();
});

// ─── verifyAdminPassword ─────────────────────────────────────────────

describe('verifyAdminPassword', () => {
  it('accepts the exact env password', () => {
    expect(verifyAdminPassword('TestPass123')).toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(verifyAdminPassword('Nope')).toBe(false);
  });

  it('rejects a length-mismatched password', () => {
    expect(verifyAdminPassword('TestPass')).toBe(false);
    expect(verifyAdminPassword('TestPass1234567')).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(verifyAdminPassword('')).toBe(false);
  });
});

// ─── checkRateLimit ──────────────────────────────────────────────────

describe('checkRateLimit', () => {
  it('returns full remaining attempts when no failed attempts in window', async () => {
    const c = chain({ order: vi.fn().mockResolvedValue({ data: [], error: null }) });
    mockFrom.mockReturnValue(c as never);
    const r = await checkRateLimit('stu-1');
    expect(r.locked).toBe(false);
    expect(r.remainingAttempts).toBe(5);
  });

  it('decrements remaining attempts based on failures only', async () => {
    const c = chain({
      order: vi.fn().mockResolvedValue({
        data: [
          { succeeded: false, attempted_at: new Date().toISOString() },
          { succeeded: true,  attempted_at: new Date().toISOString() },
          { succeeded: false, attempted_at: new Date().toISOString() },
        ],
        error: null,
      }),
    });
    mockFrom.mockReturnValue(c as never);
    const r = await checkRateLimit('stu-1');
    expect(r.locked).toBe(false);
    expect(r.remainingAttempts).toBe(3);
  });

  it('locks at exactly env.adminRateLimit failures', async () => {
    const c = chain({
      order: vi.fn().mockResolvedValue({
        data: Array.from({ length: 5 }, () => ({
          succeeded: false,
          attempted_at: new Date().toISOString(),
        })),
        error: null,
      }),
    });
    mockFrom.mockReturnValue(c as never);
    const r = await checkRateLimit('stu-1');
    expect(r.locked).toBe(true);
    expect(r.remainingAttempts).toBe(0);
  });

  it('fails-safe when supabase errors (does not lock the user out)', async () => {
    const c = chain({
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'down' } }),
    });
    mockFrom.mockReturnValue(c as never);
    const r = await checkRateLimit('stu-1');
    expect(r.locked).toBe(false);
  });
});

// ─── recordAttempt ───────────────────────────────────────────────────

describe('recordAttempt', () => {
  it('inserts a row with student_id + succeeded flag', async () => {
    const c = chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockReturnValue(c as never);
    await recordAttempt('stu-1', true);
    expect(c.insert).toHaveBeenCalledWith({ student_id: 'stu-1', succeeded: true });
  });
});

// ─── logAdminAction ──────────────────────────────────────────────────

describe('logAdminAction', () => {
  it('writes to admin_audit_log with the auth user id', async () => {
    const c = chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockReturnValue(c as never);
    await logAdminAction('admin.login', { foo: 'bar' });
    expect(c.insert).toHaveBeenCalledWith(expect.objectContaining({
      student_id: 'stu-1',
      action: 'admin.login',
      details: { foo: 'bar' },
    }));
  });

  it('no-ops when there is no signed-in student', async () => {
    useAuthStore.setState({ supaStudentId: null });
    const c = chain({ insert: vi.fn().mockResolvedValue({ error: null }) });
    mockFrom.mockReturnValue(c as never);
    await logAdminAction('admin.login');
    expect(c.insert).not.toHaveBeenCalled();
  });
});

// ─── checkIsAdmin ────────────────────────────────────────────────────

describe('checkIsAdmin', () => {
  it('returns true when students.is_admin = true', async () => {
    const c = chain({
      maybeSingle: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
    });
    mockFrom.mockReturnValue(c as never);
    expect(await checkIsAdmin('stu-1')).toBe(true);
  });

  it('returns false when row missing', async () => {
    const c = chain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockFrom.mockReturnValue(c as never);
    expect(await checkIsAdmin('stu-1')).toBe(false);
  });

  it('returns false on supabase error', async () => {
    const c = chain({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } }),
    });
    mockFrom.mockReturnValue(c as never);
    expect(await checkIsAdmin('stu-1')).toBe(false);
  });
});

// ─── In-memory session ───────────────────────────────────────────────

describe('admin session', () => {
  it('round-trips set / get / clear', () => {
    expect(getAdminSession()).toBeNull();
    setAdminSession({ studentId: 'stu-1', isAdminVerified: true, expiresAt: Date.now() + 1000 });
    expect(getAdminSession()?.studentId).toBe('stu-1');
    clearAdminSession();
    expect(getAdminSession()).toBeNull();
  });

  it('isAdminSessionValid is true when present, verified, fresh, and student matches', () => {
    setAdminSession({
      studentId: 'stu-1',
      isAdminVerified: true,
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    });
    expect(isAdminSessionValid()).toBe(true);
  });

  it('isAdminSessionValid is false when expired', () => {
    setAdminSession({
      studentId: 'stu-1',
      isAdminVerified: true,
      expiresAt: Date.now() - 1,
    });
    expect(isAdminSessionValid()).toBe(false);
  });

  it('isAdminSessionValid is false when not yet verified', () => {
    setAdminSession({
      studentId: 'stu-1',
      isAdminVerified: false,
      expiresAt: Date.now() + 60_000,
    });
    expect(isAdminSessionValid()).toBe(false);
  });

  it('isAdminSessionValid is false when bound to a different student', () => {
    setAdminSession({
      studentId: 'someone-else',
      isAdminVerified: true,
      expiresAt: Date.now() + 60_000,
    });
    expect(isAdminSessionValid()).toBe(false);
  });
});
