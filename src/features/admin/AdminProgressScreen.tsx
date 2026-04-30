// src/features/admin/AdminProgressScreen.tsx
//
// Desktop-first roster view for /admin/progress. One row per student with
// their cumulative session stats; sortable on every numeric/date column,
// nickname-search filter, plus a small summary strip across the top.
//
// The drill-down per-student detail panel is intentionally not in v1 — the
// roster is the highest-value workflow ("who's behind?") and detail can
// land later once we know which fields matter.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { isDevSession } from '@/utils/devMode';

import {
  fetchStudentRoster,
  type RosterRow,
  type TesterType,
} from './services/progress.service';

const GOLD = '#F5C518';
const GREEN = 'rgba(74,222,128,0.9)';
const RED   = 'rgba(248,113,113,0.9)';
const AMBER = 'rgba(245,158,11,0.9)';

type SortKey =
  | 'nickname'
  | 'testerType'
  | 'onboarded'
  | 'daysToTest'
  | 'dailyCards'
  | 'totalSessions'
  | 'accuracyPct'
  | 'lastSessionAt'
  | 'createdAt';

interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

export function AdminProgressScreen() {
  const navigate = useNavigate();

  const [rows, setRows]       = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState<SortState>({ key: 'lastSessionAt', dir: 'desc' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStudentRoster()
      .then(r => { if (!cancelled) setRows(r); })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r => r.nickname.toLowerCase().includes(q))
      : rows;
    return [...filtered].sort((a, b) => compare(a, b, sort));
  }, [rows, search, sort]);

  // Summary strip
  const totals = useMemo(() => {
    const onboarded   = rows.filter(r => r.onboarded).length;
    const activeWeek  = rows.filter(r => r.lastSessionAt
      && Date.now() - new Date(r.lastSessionAt).getTime() < 7 * 86_400_000).length;
    const totalSessionsAcross = rows.reduce((s, r) => s + r.totalSessions, 0);
    const correctAcross = rows.reduce((s, r) => s + r.totalCorrect, 0);
    const totalAcross   = rows.reduce((s, r) => s + r.totalCorrect + r.totalWrong, 0);
    const cohortAccuracy = totalAcross > 0 ? Math.round((correctAcross / totalAcross) * 100) : 0;
    return {
      total: rows.length,
      onboarded,
      activeWeek,
      totalSessionsAcross,
      cohortAccuracy,
    };
  }, [rows]);

  const devBypassActive = import.meta.env.DEV && isDevSession();

  return (
    <div
      data-testid="admin-progress-screen"
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
          <strong>Dev preview · mock roster.</strong> Real student data
          loads only when you sign in with a real Supabase admin account.
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 700,
          }}>
            PassLounge Admin
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 0' }}>
            Progress monitoring
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin')}
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
          ← Back to dashboard
        </button>
      </div>

      {/* Summary strip */}
      <section
        data-testid="roster-summary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <SummaryStat label="Students"           value={String(totals.total)} highlight />
        <SummaryStat label="Onboarded"          value={`${totals.onboarded} / ${totals.total}`} />
        <SummaryStat label="Active this week"   value={String(totals.activeWeek)} />
        <SummaryStat label="Sessions logged"    value={String(totals.totalSessionsAcross)} />
        <SummaryStat label="Cohort accuracy"    value={`${totals.cohortAccuracy}%`} />
      </section>

      {/* Search */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="search"
          placeholder="Search by nickname…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search by nickname"
          style={{
            flex: 1,
            maxWidth: 320,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 14,
            fontFamily: "'Outfit', sans-serif",
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          {filteredSorted.length} of {rows.length}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 24, color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
          Loading roster…
        </div>
      ) : error ? (
        <div
          data-testid="roster-error"
          style={{
            padding: 14,
            borderRadius: 12,
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.4)',
            color: RED,
            fontSize: 13,
          }}
        >
          Couldn't load roster: {error}
        </div>
      ) : rows.length === 0 ? (
        <div
          data-testid="roster-empty"
          style={{
            padding: 24,
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 12,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          No students in the database yet.
        </div>
      ) : (
        <RosterTable
          rows={filteredSorted}
          sort={sort}
          onSortChange={setSort}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function SummaryStat({
  label, value, highlight,
}: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.04)',
      border: highlight ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: 14,
    }}>
      <div style={{
        fontSize: 26,
        fontWeight: 800,
        color: highlight ? GOLD : '#fff',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        textTransform: 'uppercase',
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

interface RosterTableProps {
  rows: RosterRow[];
  sort: SortState;
  onSortChange: (s: SortState) => void;
}

function RosterTable({ rows, sort, onSortChange }: RosterTableProps) {
  function clickHeader(key: SortKey) {
    if (sort.key === key) {
      onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, dir: defaultDirFor(key) });
    }
  }

  return (
    <div
      data-testid="roster-table"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
      }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Th label="Student"     active={sort} sortKey="nickname"      onClick={clickHeader} />
            <Th label="Tester"      active={sort} sortKey="testerType"    onClick={clickHeader} />
            <Th label="Onboarded"   active={sort} sortKey="onboarded"     onClick={clickHeader} />
            <Th label="Test date"   active={sort} sortKey="daysToTest"    onClick={clickHeader} align="right" />
            <Th label="Daily"       active={sort} sortKey="dailyCards"    onClick={clickHeader} align="right" />
            <Th label="Sessions"    active={sort} sortKey="totalSessions" onClick={clickHeader} align="right" />
            <Th label="Accuracy"    active={sort} sortKey="accuracyPct"   onClick={clickHeader} align="right" />
            <Th label="Last active" active={sort} sortKey="lastSessionAt" onClick={clickHeader} align="right" />
            <Th label="Joined"      active={sort} sortKey="createdAt"     onClick={clickHeader} align="right" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => <Row key={r.id} row={r} />)}
        </tbody>
      </table>
    </div>
  );
}

interface ThProps {
  label:    string;
  sortKey:  SortKey;
  active:   SortState;
  onClick:  (key: SortKey) => void;
  align?:   'left' | 'right';
}

function Th({ label, sortKey, active, onClick, align = 'left' }: ThProps) {
  const isActive = active.key === sortKey;
  return (
    <th
      onClick={() => onClick(sortKey)}
      aria-sort={isActive ? (active.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={{
        textAlign: align,
        padding: '10px 14px',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: isActive ? GOLD : 'rgba(255,255,255,0.45)',
        fontWeight: 700,
        cursor: 'pointer',
        userSelect: 'none' as const,
        whiteSpace: 'nowrap' as const,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {label}
      {isActive && (
        <span style={{ marginLeft: 4, opacity: 0.85 }}>
          {active.dir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );
}

function Row({ row }: { row: RosterRow }) {
  return (
    <tr
      data-testid={`roster-row-${row.id}`}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <td style={cell()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg,#053571,#0a4d99)',
            border: '1.5px solid rgba(245,197,24,0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: GOLD,
            flexShrink: 0,
          }}>
            {(row.nickname || 'N').charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: 700 }}>{row.nickname}</span>
        </div>
      </td>
      <td style={cell()}>
        <TesterBadge value={row.testerType} />
      </td>
      <td style={cell()}>
        <OnboardedBadge onboarded={row.onboarded} />
      </td>
      <td style={cell('right')}>
        <TestDateCell testDate={row.testDate} daysToTest={row.daysToTest} />
      </td>
      <td style={cell('right', { fontVariantNumeric: 'tabular-nums' })}>{row.dailyCards}</td>
      <td style={cell('right', { fontVariantNumeric: 'tabular-nums' })}>{row.totalSessions}</td>
      <td style={cell('right')}>
        <AccuracyCell pct={row.accuracyPct} hasData={row.totalSessions > 0} />
      </td>
      <td style={cell('right', { color: 'rgba(255,255,255,0.65)' })}>
        {row.lastSessionAt ? formatRelative(row.lastSessionAt) : '—'}
      </td>
      <td style={cell('right', { color: 'rgba(255,255,255,0.55)' })}>
        {row.createdAt ? formatDate(row.createdAt) : '—'}
      </td>
    </tr>
  );
}

function cell(align: 'left' | 'right' = 'left', extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: '12px 14px',
    textAlign: align,
    ...extra,
  };
}

function TesterBadge({ value }: { value: TesterType | null }) {
  if (!value) return <span style={{ color: 'rgba(255,255,255,0.35)' }}>—</span>;
  const isFirst = value === 'first_time';
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 6,
      background: isFirst ? 'rgba(96,165,250,0.10)' : 'rgba(168,85,247,0.10)',
      border: isFirst ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(168,85,247,0.4)',
      color: isFirst ? 'rgba(147,197,253,1)' : 'rgba(216,180,254,1)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {isFirst ? 'First-time' : 'Repeat'}
    </span>
  );
}

function OnboardedBadge({ onboarded }: { onboarded: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 6,
      background: onboarded ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)',
      border: onboarded ? `1px solid ${GREEN}` : '1px solid rgba(255,255,255,0.1)',
      color: onboarded ? GREEN : 'rgba(255,255,255,0.45)',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {onboarded ? 'Yes' : 'Pending'}
    </span>
  );
}

function TestDateCell({ testDate, daysToTest }: { testDate: string | null; daysToTest: number | null }) {
  if (!testDate || daysToTest === null) {
    return <span style={{ color: 'rgba(255,255,255,0.35)' }}>—</span>;
  }
  const tone =
    daysToTest < 0  ? 'rgba(255,255,255,0.45)' :
    daysToTest < 14 ? RED :
    daysToTest < 45 ? AMBER :
    GREEN;
  const label =
    daysToTest < 0  ? 'past' :
    daysToTest === 0 ? 'today' :
    `${daysToTest}d`;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
      <span style={{ color: tone, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {label}
      </span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{testDate}</span>
    </div>
  );
}

function AccuracyCell({ pct, hasData }: { pct: number; hasData: boolean }) {
  if (!hasData) {
    return <span style={{ color: 'rgba(255,255,255,0.35)' }}>—</span>;
  }
  const tone =
    pct >= 75 ? GREEN :
    pct >= 60 ? AMBER :
    RED;
  return (
    <span style={{
      color: tone,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums' as const,
    }}>
      {pct}%
    </span>
  );
}

// ─── Sort + format helpers ────────────────────────────────────────────

function defaultDirFor(key: SortKey): 'asc' | 'desc' {
  // Strings ascend; numbers/dates descend (highest first feels right for "who's most active").
  if (key === 'nickname' || key === 'testerType') return 'asc';
  return 'desc';
}

function compare(a: RosterRow, b: RosterRow, sort: SortState): number {
  const dir = sort.dir === 'asc' ? 1 : -1;
  switch (sort.key) {
    case 'nickname':
      return a.nickname.localeCompare(b.nickname) * dir;
    case 'testerType':
      return cmpNullable(a.testerType, b.testerType) * dir;
    case 'onboarded':
      return ((a.onboarded ? 1 : 0) - (b.onboarded ? 1 : 0)) * dir;
    case 'daysToTest':
      return cmpNullableNumber(a.daysToTest, b.daysToTest) * dir;
    case 'dailyCards':
      return (a.dailyCards - b.dailyCards) * dir;
    case 'totalSessions':
      return (a.totalSessions - b.totalSessions) * dir;
    case 'accuracyPct':
      return (a.accuracyPct - b.accuracyPct) * dir;
    case 'lastSessionAt':
      return cmpNullableDate(a.lastSessionAt, b.lastSessionAt) * dir;
    case 'createdAt':
      return cmpNullableDate(a.createdAt, b.createdAt) * dir;
  }
}

function cmpNullable<T extends string | null>(a: T, b: T): number {
  if (a === b) return 0;
  if (a === null) return 1;  // nulls sink
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

function cmpNullableNumber(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function cmpNullableDate(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return formatDate(iso);
  const minute = 60_000, hour = 60 * minute, day = 24 * hour;
  if (diffMs < minute)     return 'just now';
  if (diffMs < hour)       return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day)        return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 7 * day)    return `${Math.floor(diffMs / day)}d ago`;
  return formatDate(iso);
}
