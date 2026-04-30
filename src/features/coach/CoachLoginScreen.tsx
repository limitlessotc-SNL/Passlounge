// src/features/coach/CoachLoginScreen.tsx
//
// Sign-in screen for SNL Educator. Branded distinctly from PassLounge so
// students don't accidentally try to log in here. No signup flow — coach
// accounts are provisioned by a super admin via the docs/setup/add-coach.md
// runbook.

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { supabase } from '@/config/supabase';
import { useCoachStore } from '@/store/coachStore';

const GOLD = '#F5C518';
const RED  = 'rgba(248,113,113,0.95)';

interface NavState {
  error?: string;
}

export function CoachLoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialize = useCoachStore((s) => s.initialize);

  const initialError = (location.state as NavState | null)?.error ?? null;

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(initialError);
  const [submitting, setSubmitting] = useState(false);

  // Clear navigation state once we've consumed it so a back-navigation
  // doesn't show the same error again.
  useEffect(() => {
    if (initialError) {
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authErr) {
        setError(authErr.message);
        return;
      }
      await initialize();
      const state = useCoachStore.getState();
      if (!state.isAuthenticated || !state.coach) {
        setError('Not authorized as educator');
        // Best-effort sign out — don't leave a half-authed Supabase session.
        await supabase.auth.signOut().catch(() => {});
        return;
      }
      if (!state.coach.is_active) {
        setError('Account deactivated');
        await supabase.auth.signOut().catch(() => {});
        return;
      }
      navigate('/coach', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      data-testid="coach-login-screen"
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
          maxWidth: 400,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          fontWeight: 700,
        }}>
          SNL Educator
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
          Sign in
        </h1>
        <p style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.55)',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Coach access to the cohort dashboard.
        </p>

        <label style={{ display: 'block' }}>
          <span style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
          }}>
            Email
          </span>
          <input
            className="pl-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            disabled={submitting}
            style={{ marginTop: 6 }}
          />
        </label>

        <label style={{ display: 'block' }}>
          <span style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
          }}>
            Password
          </span>
          <input
            className="pl-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={submitting}
            style={{ marginTop: 6 }}
          />
        </label>

        {error && (
          <div
            data-testid="coach-login-error"
            style={{
              background: 'rgba(248,113,113,0.10)',
              border: '1px solid rgba(248,113,113,0.4)',
              borderRadius: 10,
              padding: '10px 12px',
              color: RED,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          style={{
            marginTop: 4,
            padding: '13px 14px',
            borderRadius: 12,
            background: GOLD,
            color: '#053571',
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            cursor: submitting || !email || !password ? 'default' : 'pointer',
            fontFamily: "'Outfit', sans-serif",
            opacity: submitting || !email || !password ? 0.5 : 1,
          }}
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>

        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center',
          marginTop: 8,
          lineHeight: 1.5,
        }}>
          Student? Sign in at <span style={{ color: GOLD }}>passlounge.vercel.app</span>
        </div>
      </form>
    </div>
  );
}
