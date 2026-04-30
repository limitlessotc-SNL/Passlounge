// src/features/admin/AdminAuthScreen.tsx
//
// One-screen admin password entry. The flow:
//   1. Read the current rate-limit status on mount and after every attempt
//      so the user always sees how many tries they have left.
//   2. On submit: if locked → show the unlock time. Else verify password,
//      record attempt, and if the password is correct, server-check
//      students.is_admin = true. If both pass, mint an in-memory session
//      and navigate to /admin.
//
// Per the architectural decision in env.ts, the password is a UX gate.
// The is_admin server check is the real authorization boundary; the
// password layer just keeps casual users from fishing around /admin/*.

import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';

import {
  ADMIN_SESSION_TTL_MS,
  checkIsAdmin,
  checkRateLimit,
  logAdminAction,
  recordAttempt,
  setAdminSession,
  verifyAdminPassword,
} from './admin.service';
import type { RateLimitStatus } from './admin.types';

const GOLD = '#F5C518';
const RED  = 'rgba(248,113,113,0.95)';

export function AdminAuthScreen() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const supaStudentId   = useAuthStore((s) => s.supaStudentId);
  const isLoading       = useAuthStore((s) => s.isLoading);

  const [password, setPassword]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [rateLimit, setRateLimit]   = useState<RateLimitStatus | null>(null);

  useEffect(() => {
    if (supaStudentId) void checkRateLimit(supaStudentId).then(setRateLimit);
  }, [supaStudentId]);

  // Wait for the auth store to finish hydrating before we make any redirect
  // decision. Otherwise a fresh /admin/auth load redirects to /login while
  // isAuthenticated is still false, and PublicGuard then bounces the now-
  // hydrated session to /onboarding. (AuthGuard + AdminGuard gate the same way.)
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!supaStudentId)   return <Navigate to="/login" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !supaStudentId) return;
    setSubmitting(true);
    setError(null);

    try {
      // Always recheck rate limit just before verifying — the user's view
      // could be stale by the time they hit submit.
      const limit = await checkRateLimit(supaStudentId);
      setRateLimit(limit);
      if (limit.locked) {
        const wait = limit.unlocksAt
          ? Math.max(1, Math.ceil((limit.unlocksAt - Date.now()) / 60000))
          : 15;
        setError(`Too many failed attempts. Try again in about ${wait} minute${wait === 1 ? '' : 's'}.`);
        return;
      }

      const passwordOk = verifyAdminPassword(password);
      await recordAttempt(supaStudentId, passwordOk);

      if (!passwordOk) {
        const next = await checkRateLimit(supaStudentId);
        setRateLimit(next);
        const left = next.remainingAttempts;
        setError(
          left > 0
            ? `Wrong password. ${left} attempt${left === 1 ? '' : 's'} remaining.`
            : 'Account temporarily locked. Try again in 15 minutes.',
        );
        return;
      }

      const isAdmin = await checkIsAdmin(supaStudentId);
      if (!isAdmin) {
        setError('Your account isn\'t authorized for admin access.');
        return;
      }

      setAdminSession({
        studentId: supaStudentId,
        isAdminVerified: true,
        expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
      });
      void logAdminAction('admin.login');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{
          fontSize: 11, letterSpacing: 2,
          textTransform: 'uppercase' as const,
          color: 'rgba(255,255,255,0.45)',
          fontWeight: 700,
        }}>
          Restricted area
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Admin access</h1>
        <p style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.55)',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Enter the admin password to manage the NGN card library.
        </p>

        <label style={{ display: 'block', marginTop: 8 }}>
          <span style={{
            fontSize: 11,
            textTransform: 'uppercase' as const,
            letterSpacing: 1,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
          }}>
            Admin password
          </span>
          <input
            className="pl-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            autoFocus
            disabled={submitting || rateLimit?.locked}
            style={{ marginTop: 6 }}
          />
        </label>

        {rateLimit && !rateLimit.locked && rateLimit.remainingAttempts <= 3 && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {rateLimit.remainingAttempts} attempt{rateLimit.remainingAttempts === 1 ? '' : 's'} remaining
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: 10,
            padding: '10px 12px',
            color: RED,
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !password || rateLimit?.locked}
          style={{
            marginTop: 4,
            padding: '13px 14px',
            borderRadius: 12,
            background: GOLD,
            color: '#053571',
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            cursor: submitting || !password || rateLimit?.locked ? 'default' : 'pointer',
            fontFamily: "'Outfit', sans-serif",
            opacity: submitting || !password || rateLimit?.locked ? 0.5 : 1,
          }}
        >
          {submitting ? 'Verifying…' : 'Continue →'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 12,
            fontFamily: "'Outfit', sans-serif",
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          ← Back to app
        </button>
      </form>
    </div>
  );
}
