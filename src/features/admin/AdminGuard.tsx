// src/features/admin/AdminGuard.tsx
//
// Wraps every /admin/* route except /admin/auth itself. Three gates:
//   1. Authenticated as a real Supabase user      → else /login
//   2. students.is_admin = true (server-checked)  → else /
//   3. In-memory admin session is still valid     → else /admin/auth
//
// All three are required. The is_admin lookup runs once per mount and the
// result determines whether to render or redirect.

import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';

import { checkIsAdmin, isAdminSessionValid } from './admin.service';

type AuthzState = 'checking' | 'allowed' | 'redirect-login' | 'redirect-home' | 'redirect-auth';

export function AdminGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const supaStudentId = useAuthStore((s) => s.supaStudentId);
  const [state, setState] = useState<AuthzState>('checking');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isAuthenticated || !supaStudentId) {
        if (!cancelled) setState('redirect-login');
        return;
      }
      const isAdmin = await checkIsAdmin(supaStudentId);
      if (cancelled) return;
      if (!isAdmin) {
        setState('redirect-home');
        return;
      }
      if (!isAdminSessionValid()) {
        setState('redirect-auth');
        return;
      }
      setState('allowed');
    }
    void run();
    return () => { cancelled = true; };
  }, [isAuthenticated, supaStudentId]);

  if (state === 'checking') {
    return (
      <div
        data-testid="admin-guard-loading"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        Verifying admin access…
      </div>
    );
  }
  if (state === 'redirect-login') return <Navigate to="/login" replace />;
  if (state === 'redirect-home')  return <Navigate to="/" replace />;
  if (state === 'redirect-auth')  return <Navigate to="/admin/auth" replace />;
  return <Outlet />;
}
