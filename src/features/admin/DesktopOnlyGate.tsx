// src/features/admin/DesktopOnlyGate.tsx
//
// Wraps every /admin/* route so the admin UI is only reachable on a
// desktop-class viewport (≥1280px). Phones, tablets in either orientation,
// and narrow browser windows hit a "Desktop required" gate instead of a
// crammed/overflowing layout.
//
// The gate is purely presentational — it does NOT replace AdminGuard's
// is_admin / session check. Real authorization still lives in RLS.

import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const MIN_DESKTOP_WIDTH = 1024;
const GOLD = '#F5C518';

function getInitialIsDesktop(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= MIN_DESKTOP_WIDTH;
}

export function DesktopOnlyGate({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const [isDesktop, setIsDesktop] = useState(getInitialIsDesktop);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= MIN_DESKTOP_WIDTH);
    window.addEventListener('resize', onResize);
    // Re-check on mount in case state was stale.
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (isDesktop) {
    return children ? <>{children}</> : <Outlet />;
  }

  return (
    <div
      data-testid="desktop-only-gate"
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
      <div
        style={{
          maxWidth: 420,
          textAlign: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: '32px 24px',
        }}
      >
        <div style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          fontWeight: 700,
          marginBottom: 8,
        }}>
          Restricted area
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 12 }}>
          Desktop required
        </h1>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.55,
          margin: 0,
        }}>
          PassLounge admin needs a desktop browser at least{' '}
          <strong>{MIN_DESKTOP_WIDTH}px</strong> wide. Open this URL on a computer to continue.
        </p>
        <div style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          marginTop: 16,
          fontFamily: 'monospace',
        }}>
          Current width: {typeof window !== 'undefined' ? window.innerWidth : '?'}px
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            marginTop: 22,
            padding: '12px 18px',
            borderRadius: 12,
            background: GOLD,
            color: '#053571',
            border: 'none',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          ← Back to app
        </button>
      </div>
    </div>
  );
}
