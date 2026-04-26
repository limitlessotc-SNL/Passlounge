// src/features/cat/CATTab.tsx
// Entry point for the /cat route. Manages the full CAT lifecycle:
//   idle → loading → active (CATScreen) → complete (CATResultsScreen)
//
// Also hosts a history-review mode: tapping any row in "Past CATs" renders
// CATResultsScreen for that saved report with a Back button.

import { useEffect, useState } from 'react';
import { CATScreen } from './CATScreen';
import { CATResultsScreen } from './CATResultsScreen';
import { useCATSession } from './useCATSession';
import { fetchCATHistory } from './cat.service';
import type { CATResult } from './cat.types';
import { getCATLevelLabel } from './cat.utils';
import { useAuthStore } from '@/store/authStore';

// Palette aligned with the rest of the app (see ProfileTab, CPRAnalysisScreen).
const GOLD = '#F5C518';
const GOLD_ALPHA = (a: number) => `rgba(245,197,24,${a})`;
const GREEN = 'rgba(74,222,128,0.9)';

export function CATTab() {
  // App convention: supaStudentId is set from user.id by AuthProvider.
  const studentId = useAuthStore((s) => s.supaStudentId) ?? '';

  const session = useCATSession(studentId);
  const [history, setHistory] = useState<CATResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [viewingHistoryResult, setViewingHistoryResult] = useState<CATResult | null>(null);

  // Load CAT history on mount
  useEffect(() => {
    if (!studentId) return;
    fetchCATHistory(studentId)
      .then(setHistory)
      .finally(() => setLoadingHistory(false));
  }, [studentId]);

  // Reload history after a session completes
  useEffect(() => {
    if (session.phase === 'complete' && studentId) {
      fetchCATHistory(studentId).then(setHistory);
    }
  }, [session.phase, studentId]);

  // ── History review takes precedence over idle (but not over an active session) ──
  if (viewingHistoryResult && session.phase === 'idle') {
    return (
      <CATResultsScreen
        result={viewingHistoryResult}
        onBack={() => setViewingHistoryResult(null)}
      />
    );
  }

  // ── Active session: full-screen card interface ──────────────────────────
  if (session.phase === 'active' || session.phase === 'loading' || session.phase === 'saving') {
    if (session.phase === 'loading') return <LoadingScreen message="Loading CAT…" />;
    if (session.phase === 'saving')  return <LoadingScreen message="Saving results…" />;
    return (
      <CATScreen
        session={session}
        onExit={async () => { await session.abandonSession(); }}
      />
    );
  }

  // ── Complete: show results ──────────────────────────────────────────────
  if (session.phase === 'complete' && session.result) {
    return (
      <CATResultsScreen
        result={session.result}
        onRetake={() => {
          session.reset();
          session.startSession();
        }}
      />
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (session.phase === 'error') {
    return (
      <ErrorScreen
        message={session.error ?? 'Something went wrong.'}
        onRetry={() => session.reset()}
      />
    );
  }

  // ── Idle: landing page ──────────────────────────────────────────────────
  const lastCAT    = history[0] ?? null;
  const hasHistory = history.length > 0;

  return (
    <div style={{
      minHeight: '100dvh',
      overflowY: 'auto',
      paddingBottom: 100,
      fontFamily: "'Outfit', 'Inter', sans-serif",
      color: '#fff',
    }}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '48px 24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 900,
          marginBottom: 8,
          fontFamily: "'Outfit', 'DM Serif Display', Georgia, serif",
        }}>
          CAT Mode
        </h1>
        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.5,
          maxWidth: 300,
          margin: '0 auto 24px',
        }}>
          150 adaptive questions. No score shown. Just you and the algorithm.
        </p>

        {/* Last result preview */}
        {lastCAT && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '16px',
            marginBottom: 20,
            display: 'inline-flex',
            gap: 24,
          }}>
            <Stat label="Last Level"  value={lastCAT.cat_level.toFixed(1)}    sub={getCATLevelLabel(lastCAT.cat_level)} />
            <Stat label="Readiness"   value={`${lastCAT.pass_probability}%`} />
            <Stat label="CATs Taken"  value={String(history.length)} />
          </div>
        )}

        <button
          onClick={() => session.startSession()}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: 360,
            margin: '0 auto',
            padding: '17px',
            borderRadius: 16,
            fontSize: 17,
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            background: GOLD,
            border: 'none',
            color: '#053571',
            cursor: 'pointer',
            letterSpacing: '0.01em',
            boxShadow: `0 8px 32px ${GOLD_ALPHA(0.25)}`,
          }}
        >
          {hasHistory ? 'Start New CAT →' : 'Start Your First CAT →'}
        </button>

        <p style={{
          marginTop: 12,
          fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
        }}>
          ~90 minutes · 150 questions · Mirrors real NCLEX
        </p>
      </div>

      {/* ── What to expect ───────────────────────────────────────────── */}
      <InfoSection>
        <InfoRow icon="📈" label="Adaptive difficulty" desc="Starts at Analysis level. Goes up when you're right, down when you're wrong." />
        <InfoRow icon="🎯" label="Blueprint-weighted"  desc="Questions match the NCLEX category distribution." />
        <InfoRow icon="🙈" label="No feedback"         desc="No correct/wrong revealed during the session — just like the real thing." />
        <InfoRow icon="📊" label="Dual scoring"        desc="NCLEX Pass Probability + CAT Level shown at the end." />
      </InfoSection>

      {/* ── History ──────────────────────────────────────────────────── */}
      {hasHistory && (
        <div style={{ padding: '0 16px' }}>
          <h2 style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: 12,
          }}>
            Past CATs · Tap to review
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((cat, i) => (
              <HistoryRow
                key={cat.id ?? i}
                cat={cat}
                onClick={() => setViewingHistoryResult(cat)}
              />
            ))}
          </div>
        </div>
      )}

      {loadingHistory && !hasHistory && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: 24 }}>
          Loading history…
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      color: '#fff',
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      <div style={{
        width: 40, height: 40,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: GOLD,
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 24,
      fontFamily: "'Outfit', 'Inter', sans-serif",
      color: '#fff',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 300 }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '12px 24px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        Try Again
      </button>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: GOLD }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{sub}</div>}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function InfoSection({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      margin: '0 16px 20px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '14px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );
}

function HistoryRow({ cat, onClick }: { cat: CATResult; onClick: () => void }) {
  const trendIcon  =
    cat.trend_direction === 'improving' ? '↑' :
    cat.trend_direction === 'declining' ? '↓' : '—';
  const trendColor =
    cat.trend_direction === 'improving' ? GREEN :
    cat.trend_direction === 'declining' ? 'rgba(248,113,113,0.9)' : 'rgba(255,255,255,0.3)';

  const date = cat.taken_at
    ? new Date(cat.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        color: '#fff',
        fontFamily: "'Outfit', sans-serif",
        textAlign: 'left',
        width: '100%',
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          Level {cat.cat_level.toFixed(1)}
          <span style={{ marginLeft: 6, fontSize: 14, color: trendColor }}>{trendIcon}</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{date}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 15,
          fontWeight: 800,
          color: cat.pass_probability >= 70 ? GREEN : GOLD,
        }}>
          {cat.pass_probability}%
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
          {cat.correct_count}/{cat.total_questions}
        </div>
      </div>
    </button>
  );
}
