// src/features/coach/CoachGuard.tsx
//
// Protects every /coach/* route except /coach/login. Three states it cares
// about, in order:
//
//   1. coachStore is still loading the session  → spinner
//   2. no Supabase user OR no coach record       → redirect /coach/login
//   3. coach.is_active === false                 → redirect /coach/login with state
//   4. otherwise                                  → render <Outlet />
//
// We initialise the store on mount when it's still in the default loading
// state — this lets the guard work even on a hard refresh of /coach/*.

import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useCoachStore } from '@/store/coachStore';

export function CoachGuard() {
  const coach           = useCoachStore((s) => s.coach);
  const isLoading       = useCoachStore((s) => s.isLoading);
  const isAuthenticated = useCoachStore((s) => s.isAuthenticated);
  const initialize      = useCoachStore((s) => s.initialize);

  // Only kick the initial fetch if we haven't already.
  useEffect(() => {
    if (isLoading && !isAuthenticated) {
      void initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div
        data-testid="coach-guard-loading"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 14,
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        Verifying educator access…
      </div>
    );
  }

  if (!isAuthenticated || !coach) {
    return <Navigate to="/coach/login" replace />;
  }

  if (!coach.is_active) {
    return (
      <Navigate
        to="/coach/login"
        replace
        state={{ error: 'Account deactivated' }}
      />
    );
  }

  return <Outlet />;
}
