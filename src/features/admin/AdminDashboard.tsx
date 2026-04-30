// src/features/admin/AdminDashboard.tsx
//
// Landing page for the /admin section. Loads NGN card stats, surfaces
// quick links to the (Phase-C) create + batch screens, lists the most
// recent 10 cards, and offers a sign-out that clears the in-memory
// admin session.
//
// The session timer is purely informational — actual gating is handled
// by AdminGuard which re-checks isAdminSessionValid() on every navigation.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchAllNGNCards } from '@/features/ngn/ngn.service';
import type { NGNCard, NGNQuestionType } from '@/features/ngn/ngn.types';
import { isDevSession } from '@/utils/devMode';

import {
  clearAdminSession,
  getAdminSession,
  logAdminAction,
} from './admin.service';

const GOLD = '#F5C518';

const TYPE_LABEL: Record<NGNQuestionType, string> = {
  mcq:               'MCQ',
  extended_mr_n:     'Extended MR (Select N)',
  extended_mr_all:   'Extended MR (Select All)',
  bow_tie:           'Bow-tie',
  matrix:            'Matrix',
  cloze:             'Cloze',
  drag_drop:         'Drag-drop',
  trend:             'Trend',
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const [cards, setCards]     = useState<NGNCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow]         = useState(Date.now());

  useEffect(() => {
    void fetchAllNGNCards().then(c => {
      setCards(c);
      setLoading(false);
    });
  }, []);

  // Tick once per minute so the session timer doesn't go stale.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => window.clearInterval(t);
  }, []);

  const session = getAdminSession();
  const sessionMinutesLeft = session
    ? Math.max(0, Math.ceil((session.expiresAt - now) / 60000))
    : 0;

  const stats = useMemo(() => {
    const total = cards.length;
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const c of cards) {
      byType[c.type] = (byType[c.type] ?? 0) + 1;
      byCategory[c.nclex_category] = (byCategory[c.nclex_category] ?? 0) + 1;
    }
    return { total, byType, byCategory };
  }, [cards]);

  function handleSignOut() {
    void logAdminAction('admin.logout');
    clearAdminSession();
    navigate('/admin/auth', { replace: true });
  }

  const devBypassActive = import.meta.env.DEV && isDevSession();

  return (
    <div
      data-testid="admin-dashboard"
      style={{
        minHeight: '100dvh',
        padding: '32px 32px 80px',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {devBypassActive && (
        <div
          data-testid="dev-bypass-banner"
          style={{
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 12,
            color: 'rgba(248,113,113,0.95)',
            lineHeight: 1.5,
          }}
        >
          <strong>Dev preview · no real auth.</strong> Admin checks are
          short-circuited because this is a dev-skip session. RLS still gates
          real writes; insertNGNCard will fail until you sign in with a real
          Supabase account.
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 11,
            textTransform: 'uppercase' as const,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 700,
          }}>
            PassLounge Admin
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 0' }}>
            NGN library
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span
            data-testid="admin-session-timer"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}
          >
            Session expires in {sessionMinutesLeft} min
          </span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Sign out admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <section
        data-testid="admin-stats"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}
      >
        <StatCard label="Total NGN cards" value={String(stats.total)} highlight />
        <StatCard label="Distinct types"    value={String(Object.keys(stats.byType).length)} />
        <StatCard label="Distinct categories" value={String(Object.keys(stats.byCategory).length)} />
      </section>

      {/* Type / category breakdown */}
      {stats.total > 0 && (
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}>
          <BreakdownCard title="By type"
            entries={Object.entries(stats.byType).map(([k, n]) => ({
              label: TYPE_LABEL[k as NGNQuestionType] ?? k, count: n,
            }))} />
          <BreakdownCard title="By NCLEX category"
            entries={Object.entries(stats.byCategory).map(([k, n]) => ({ label: k, count: n }))} />
        </section>
      )}

      {/* Quick links */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        <QuickLink
          label="Progress monitoring"
          desc="Per-student roster + stats"
          onClick={() => navigate('/admin/progress')}
        />
        <QuickLink
          label="Create one card"
          desc="AI-assisted authoring"
          onClick={() => navigate('/admin/ngn/create')}
        />
        <QuickLink
          label="Batch generate"
          desc="Up to 20 cards at once"
          onClick={() => navigate('/admin/ngn/batch')}
        />
        <QuickLink
          label="View all cards"
          desc="Browse and edit"
          onClick={() => navigate('/admin/ngn/list')}
        />
      </section>

      {/* Recent cards */}
      <section>
        <h2 style={{
          fontSize: 11,
          textTransform: 'uppercase' as const,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 700,
          marginBottom: 8,
        }}>
          Recent cards
        </h2>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading…</div>
        ) : cards.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: 20,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            textAlign: 'center',
          }}>
            No NGN cards yet. Use the quick links above to author your first one.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {cards.slice(0, 10).map(c => (
              <li
                key={c.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <span>{c.title}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {TYPE_LABEL[c.type] ?? c.type}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                  L{c.difficulty_level} · {c.nclex_category}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.04)',
      border: highlight ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: 16,
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: highlight ? GOLD : '#fff' }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: 700,
        marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
}

function BreakdownCard({
  title, entries,
}: { title: string; entries: Array<{ label: string; count: number }> }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: 16,
    }}>
      <div style={{
        fontSize: 11,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: 700,
        marginBottom: 8,
      }}>
        {title}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {entries.map(e => (
          <li
            key={e.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              padding: '4px 0',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <span>{e.label}</span>
            <span style={{ color: GOLD, fontWeight: 700 }}>{e.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickLink({
  label, desc, onClick,
}: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: 'rgba(245,197,24,0.06)',
        border: '1px solid rgba(245,197,24,0.3)',
        borderRadius: 14,
        padding: 16,
        color: '#fff',
        cursor: 'pointer',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: GOLD, marginBottom: 4 }}>
        {label} →
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{desc}</div>
    </button>
  );
}
