// src/features/admin/admin.service.ts
//
// All admin-flow plumbing: password verification (UX gate, not security),
// rate limiting against admin_login_attempts, audit logging, is_admin
// lookup, and the in-memory admin session.
//
// SECURITY POSTURE: per the architectural decision logged in env.ts, the
// admin password is a UX gate. Real authorization sits in the RLS
// policies attached to ngn_cards (and any future admin-write tables) that
// check students.is_admin = true. Bypassing the password layer in the
// browser is trivial — but bypassing the RLS layer requires a server-
// side privilege the client doesn't have. Keep that ordering in mind
// when reading this file.

import { env } from '@/config/env';
import { supabase } from '@/config/supabase';
import { useAuthStore } from '@/store/authStore';
import { isDevSession } from '@/utils/devMode';

import type { AdminSession, RateLimitStatus } from './admin.types';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS        = 60 * 60 * 1000;

// ─── Dev-skip bypass ─────────────────────────────────────────────────
//
// The DevSkipButton mints a fake session with `studentId = 'dev-user-id'`
// which is NOT a UUID, so every admin_* table read/write fails with a
// Postgres "invalid input syntax for type uuid" error. In dev-only mode
// we short-circuit those calls so the admin UI is previewable without a
// real Supabase account. Cannot fire in production: DevSkipButton itself
// is gated on `import.meta.env.DEV` so isDevSession() is always false in
// prod builds, and we double-gate here on the same flag.

function isAdminDevBypass(): boolean {
  return import.meta.env.DEV && isDevSession();
}

// ─── Password ────────────────────────────────────────────────────────

/**
 * Constant-time string equality. The password isn't a security boundary,
 * so timing leaks aren't really exploitable here, but using `===` would
 * fail the audit checklist and there's no reason to be sloppy.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function verifyAdminPassword(password: string): boolean {
  if (!env.adminPassword) return false; // build without a password set never grants
  return timingSafeEqual(password, env.adminPassword);
}

// ─── Rate limiting ───────────────────────────────────────────────────

/**
 * Reads the last 15 minutes of login attempts for this student and blocks
 * once they hit env.adminRateLimit failures. Successful attempts don't
 * count toward the cap (they shouldn't be punished for trying again
 * later).
 */
export async function checkRateLimit(studentId: string): Promise<RateLimitStatus> {
  if (isAdminDevBypass()) {
    return { locked: false, remainingAttempts: env.adminRateLimit };
  }
  const since = new Date(Date.now() - FIFTEEN_MINUTES_MS).toISOString();
  const { data, error } = await supabase
    .from('admin_login_attempts')
    .select('succeeded, attempted_at')
    .eq('student_id', studentId)
    .gte('attempted_at', since)
    .order('attempted_at', { ascending: false });

  if (error) {
    // Failing safe: if we can't read attempts, assume no lockout. The
    // attacker doesn't get a shortcut, the legitimate admin doesn't get
    // bricked. Worst case the table is unreachable and they retry.
    console.warn('[admin] checkRateLimit error:', error.message);
    return { locked: false, remainingAttempts: env.adminRateLimit };
  }

  const failed = (data ?? []).filter(a => !a.succeeded).length;
  if (failed >= env.adminRateLimit) {
    const oldestFailed = (data ?? []).filter(a => !a.succeeded).at(-1);
    const unlocksAt = oldestFailed?.attempted_at
      ? new Date(oldestFailed.attempted_at).getTime() + FIFTEEN_MINUTES_MS
      : Date.now() + FIFTEEN_MINUTES_MS;
    return { locked: true, remainingAttempts: 0, unlocksAt };
  }
  return {
    locked: false,
    remainingAttempts: Math.max(0, env.adminRateLimit - failed),
  };
}

export async function recordAttempt(studentId: string, succeeded: boolean): Promise<void> {
  if (isAdminDevBypass()) return;
  const { error } = await supabase
    .from('admin_login_attempts')
    .insert({ student_id: studentId, succeeded });
  if (error) console.warn('[admin] recordAttempt error:', error.message);
}

// ─── Audit log ───────────────────────────────────────────────────────

export async function logAdminAction(
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  if (isAdminDevBypass()) {
    // eslint-disable-next-line no-console
    console.info('[admin.dev] would-log:', action, details ?? {});
    return;
  }
  const studentId = useAuthStore.getState().supaStudentId;
  if (!studentId) return;
  const { error } = await supabase
    .from('admin_audit_log')
    .insert({ student_id: studentId, action, details: details ?? {} });
  if (error) console.warn('[admin] logAdminAction error:', error.message);
}

// ─── is_admin lookup ─────────────────────────────────────────────────

export async function checkIsAdmin(studentId: string): Promise<boolean> {
  if (isAdminDevBypass()) return true;
  const { data, error } = await supabase
    .from('students')
    .select('is_admin')
    .eq('id', studentId)
    .maybeSingle();
  if (error) {
    console.warn('[admin] checkIsAdmin error:', error.message);
    return false;
  }
  return !!data?.is_admin;
}

// ─── In-memory session ──────────────────────────────────────────────
// Module-level singleton, never written to localStorage / sessionStorage.
// Lost on page refresh — that's the point.

let _session: AdminSession | null = null;

export function setAdminSession(session: AdminSession): void {
  _session = session;
}

export function getAdminSession(): AdminSession | null {
  return _session;
}

export function clearAdminSession(): void {
  _session = null;
}

/**
 * Valid means: present, verified, not expired, AND still bound to the
 * currently signed-in student. The studentId check protects against a
 * sign-out + sign-in-as-someone-else without a page refresh.
 */
export function isAdminSessionValid(): boolean {
  if (!_session) return false;
  if (!_session.isAdminVerified) return false;
  if (_session.expiresAt <= Date.now()) return false;
  const currentId = useAuthStore.getState().supaStudentId;
  return currentId === _session.studentId;
}

/** Default session expiry — exported for the auth screen to use. */
export const ADMIN_SESSION_TTL_MS = ONE_HOUR_MS;
