// src/features/coach/CoachDashboard.tsx
//
// The /coach landing screen. Top-level coach view with cohort tabs, a per-
// cohort summary strip, and a risk-sorted student list. Clicking a student
// opens StudentDetailPanel from the right.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CoachInbox } from '@/features/messaging/CoachInbox';
import { trackEvent } from '@/services/analytics';
import { useCoachStore } from '@/store/coachStore';

import { CohortManageModal } from './CohortManageModal';
import {
  fetchCohortMetrics,
  fetchCohortSummary,
  getCoachCohorts,
} from './coach.service';
import {
  buildWeeklyDigest,
  generateCountdownAlert,
} from './coaching.service';
import type {
  Cohort,
  CohortSummary,
  CountdownAlertLevel,
  RiskLevel,
  StudentMetrics,
  WeeklyDigest,
} from './coach.types';
import { StudentDetailPanel } from './StudentDetailPanel';

const GOLD  = '#F5C518';
const GREEN = 'rgba(74,222,128,0.9)';
const AMBER = 'rgba(245,158,11,0.9)';
const RED   = 'rgba(248,113,113,0.9)';

const RISK_RANK: Record<RiskLevel, number> = { red: 0, amber: 1, green: 2 };

export function CoachDashboard() {
  const navigate = useNavigate();
  const coach   = useCoachStore((s) => s.coach);
  const signOut = useCoachStore((s) => s.signOut);

  const [cohorts, setCohorts]               = useState<Cohort[]>([]);
  const [activeCohortId, setActiveCohortId] = useState<string | null>(null);
  const [summary, setSummary]               = useState<CohortSummary | null>(null);
  const [students, setStudents]             = useState<StudentMetrics[]>([]);
  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [openStudent, setOpenStudent]       = useState<StudentMetrics | null>(null);
  const [modalMode, setModalMode]           = useState<'create' | 'edit' | null>(null);
  const [inboxOpen, setInboxOpen]           = useState(false);
  const [inboxFocusId, setInboxFocusId]     = useState<string | null>(null);
  const [digestRefreshKey, setDigestRefreshKey] = useState(0);

  // Fire coach_dashboard_viewed once per mount.
  useEffect(() => {
    trackEvent('coach_dashboard_viewed');
  }, []);

  // Initial cohort list load
  useEffect(() => {
    if (!coach) return;
    let cancelled = false;
    setLoadingCohorts(true);
    setError(null);
    getCoachCohorts(coach.id)
      .then(c => {
        if (cancelled) return;
        setCohorts(c);
        if (c.length > 0 && !activeCohortId) {
          setActiveCohortId(c[0].id);
        }
      })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoadingCohorts(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id]);

  // Per-cohort metrics + summary
  useEffect(() => {
    if (!activeCohortId) {
      setSummary(null);
      setStudents([]);
      return;
    }
    let cancelled = false;
    setLoadingMetrics(true);
    setError(null);
    Promise.all([
      fetchCohortSummary(activeCohortId),
      fetchCohortMetrics(activeCohortId),
    ])
      .then(([s, m]) => {
        if (cancelled) return;
        setSummary(s);
        setStudents(m);
      })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoadingMetrics(false); });
    return () => { cancelled = true; };
  }, [activeCohortId]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const r = RISK_RANK[a.risk_level] - RISK_RANK[b.risk_level];
      if (r !== 0) return r;
      return (a.pass_probability ?? 0) - (b.pass_probability ?? 0);
    });
  }, [students]);

  const activeCohort = cohorts.find(c => c.id === activeCohortId) ?? null;

  // Weekly digest + countdown banner are recomputed whenever metrics
  // change, OR when the coach hits "Refresh digest" (digestRefreshKey).
  const digest: WeeklyDigest | null = useMemo(() => {
    if (!activeCohortId || students.length === 0) return null;
    return buildWeeklyDigest(activeCohortId, students);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCohortId, students, digestRefreshKey]);

  // Cohort-level countdown banner: triggers any time any student in the
  // active cohort is within 30 days, regardless of the digest's per-student
  // most-urgent. Pulls the lowest days_to_test as the cohort countdown.
  const countdownBanner = useMemo(() => {
    if (students.length === 0) return null;
    let nearest: number | null = null;
    let totalReadiness = 0;
    let n = 0;
    for (const m of students) {
      if (m.days_to_test != null && (nearest === null || m.days_to_test < nearest)) {
        nearest = m.days_to_test;
      }
      totalReadiness += m.readiness_score;
      n++;
    }
    if (nearest == null || nearest > 30) return null;
    const avg = n > 0 ? Math.round(totalReadiness / n) : 0;
    return generateCountdownAlert(nearest, avg);
  }, [students]);

  // Fire telemetry when the digest is computed for a cohort and when the
  // countdown alert escalates. Two separate effects so refreshes don't
  // double-fire.
  useEffect(() => {
    if (digest && activeCohortId) {
      trackEvent('weekly_digest_viewed', {
        cohort_id: activeCohortId,
        at_risk_count: digest.most_at_risk.length,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digest?.generated_at]);

  useEffect(() => {
    if (countdownBanner) {
      trackEvent('countdown_alert_triggered', {
        days_remaining: countdownBanner.days_remaining,
        alert_level: countdownBanner.alert_level,
        students_below_passing: digest?.cohort_health.students_below_passing ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownBanner?.alert_level, countdownBanner?.days_remaining]);

  async function handleSignOut() {
    await signOut();
    navigate('/coach/login', { replace: true });
  }

  function handleCohortSaved(c: Cohort) {
    setCohorts(prev => {
      const idx = prev.findIndex(p => p.id === c.id);
      if (idx === -1) return [c, ...prev];
      const copy = [...prev];
      copy[idx] = c;
      return copy;
    });
    if (modalMode === 'create') {
      setActiveCohortId(c.id);
      trackEvent('cohort_created', { cohort_id: c.id });
    }
  }

  return (
    <div
      data-testid="coach-dashboard"
      style={{
        minHeight: '100dvh',
        padding: '24px 32px 80px',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
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
            SNL Educator
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '4px 0 0' }}>
            Coach dashboard
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            {coach?.name ?? 'Coach'}
          </span>
          <button
            type="button"
            onClick={() => { setInboxFocusId(null); setInboxOpen(true); }}
            data-testid="coach-messages-btn"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(245,197,24,0.10)',
              border: `1px solid ${GOLD}`,
              color: GOLD,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            💬 Messages
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            data-testid="coach-signout-btn"
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
            Sign out
          </button>
        </div>
      </div>

      {/* Cohort tabs */}
      <div
        data-testid="cohort-tabs"
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {loadingCohorts ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Loading cohorts…
          </div>
        ) : (
          cohorts.map(c => (
            <button
              key={c.id}
              type="button"
              data-testid={`cohort-tab-${c.id}`}
              onClick={() => setActiveCohortId(c.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: activeCohortId === c.id ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)',
                border: activeCohortId === c.id ? `1.5px solid ${GOLD}` : '1.5px solid rgba(255,255,255,0.08)',
                color: activeCohortId === c.id ? GOLD : 'rgba(255,255,255,0.75)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {c.name}
              {!c.is_active && (
                <span style={{ marginLeft: 6, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                  (archived)
                </span>
              )}
            </button>
          ))
        )}
        <button
          type="button"
          data-testid="new-cohort-btn"
          onClick={() => setModalMode('create')}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: 'transparent',
            border: '1.5px dashed rgba(245,197,24,0.5)',
            color: GOLD,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          + New cohort
        </button>
      </div>

      {error && (
        <div
          data-testid="coach-dashboard-error"
          style={{
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: 12,
            padding: '10px 14px',
            color: RED,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state — no cohorts at all */}
      {!loadingCohorts && cohorts.length === 0 && (
        <div
          data-testid="empty-no-cohorts"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 14,
            padding: 32,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 14,
          }}
        >
          Create your first cohort to get started.
        </div>
      )}

      {/* Cohort-level countdown banner — appears above everything once
          any student is within 30 days of test date and the cohort is
          off pace. Color escalates: amber → red → pulsing red. */}
      {countdownBanner && (
        <CountdownBanner
          level={countdownBanner.alert_level}
          message={countdownBanner.message}
          cohortName={activeCohort?.name}
        />
      )}

      {/* Active cohort body */}
      {activeCohort && (
        <>
          {/* Summary strip */}
          <section
            data-testid="cohort-summary"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <SummaryStat label="Total students" value={summary ? String(summary.total_students) : '—'} highlight />
            <SummaryStat label="🔴 At risk"      value={summary ? String(summary.red_count)       : '—'} tone={RED} />
            <SummaryStat label="🟡 Watch"         value={summary ? String(summary.amber_count)     : '—'} tone={AMBER} />
            <SummaryStat label="🟢 On track"      value={summary ? String(summary.green_count)     : '—'} tone={GREEN} />
            <SummaryStat label="Avg pass %"       value={summary ? `${summary.avg_pass_probability}%` : '—'} />
            <SummaryStat label="Days to test"     value={summary?.days_to_test != null ? String(summary.days_to_test) : '—'} />
          </section>

          {digest && (
            <WeeklyDigestCard
              digest={digest}
              onRefresh={() => setDigestRefreshKey(k => k + 1)}
            />
          )}

          {/* Cohort code reminder */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              Cohort code:
              <span style={{
                marginLeft: 6,
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: 2,
              }}>
                {activeCohort.cohort_code}
              </span>
            </div>
            <button
              type="button"
              data-testid="edit-cohort-btn"
              onClick={() => setModalMode('edit')}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Edit cohort
            </button>
          </div>

          {/* Student list */}
          {loadingMetrics ? (
            <div style={{ padding: 24, color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              Loading students…
            </div>
          ) : students.length === 0 ? (
            <div
              data-testid="empty-no-students"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: 14,
                padding: 32,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Share cohort code{' '}
              <strong style={{ color: GOLD, letterSpacing: 2 }}>
                {activeCohort.cohort_code}
              </strong>{' '}
              with students to invite them.
            </div>
          ) : (
            <StudentList
              students={sortedStudents}
              onOpen={(s) => {
                trackEvent('student_detail_viewed', { student_id: s.student_id });
                setOpenStudent(s);
              }}
            />
          )}
        </>
      )}

      {/* Cohort modal */}
      {modalMode && coach && (
        <CohortManageModal
          mode={modalMode}
          schoolId={coach.school_id}
          coachId={coach.id}
          cohort={modalMode === 'edit' ? (activeCohort ?? undefined) : undefined}
          onClose={() => setModalMode(null)}
          onSaved={handleCohortSaved}
        />
      )}

      {/* Student detail panel */}
      {openStudent && coach && activeCohortId && (
        <StudentDetailPanel
          metrics={openStudent}
          coachId={coach.id}
          cohortId={activeCohortId}
          onClose={() => setOpenStudent(null)}
          onOpenMessages={(studentId) => {
            setInboxFocusId(studentId);
            setInboxOpen(true);
          }}
          cohortMetrics={students}
          cohortName={activeCohort?.name}
        />
      )}

      {/* CoachInbox — slide-in messaging panel */}
      {inboxOpen && coach && (
        <CoachInbox
          coachAuthId={coach.auth_id}
          cohorts={cohorts}
          focusStudentId={inboxFocusId}
          onClose={() => setInboxOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function SummaryStat({
  label, value, tone, highlight,
}: { label: string; value: string; tone?: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.04)',
      border: highlight ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: 14,
    }}>
      <div style={{
        fontSize: 24,
        fontWeight: 800,
        color: tone ?? (highlight ? GOLD : '#fff'),
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

function StudentList({
  students, onOpen,
}: { students: StudentMetrics[]; onOpen: (s: StudentMetrics) => void }) {
  return (
    <div
      data-testid="student-list"
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
            <Th label="Student"   />
            <Th label="CAT"       align="right" />
            <Th label="Pass %"    align="right" />
            <Th label="Trend"     align="center" />
            <Th label="Last active" align="right" />
            <Th label="Risk"      align="center" />
            <Th label=""          align="right" />
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <StudentRow key={s.student_id} s={s} onOpen={onOpen} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ label, align = 'left' }: { label: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <th style={{
      textAlign: align,
      padding: '10px 14px',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: 'rgba(255,255,255,0.45)',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      {label}
    </th>
  );
}

function StudentRow({ s, onOpen }: { s: StudentMetrics; onOpen: (s: StudentMetrics) => void }) {
  const trend = trendIcon(s.trend_direction);
  return (
    <tr
      data-testid={`student-row-${s.student_id}`}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <td style={cell()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg,#053571,#0a4d99)',
            border: `1.5px solid ${riskColor(s.risk_level)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: GOLD,
            flexShrink: 0,
          }}>
            {s.name.charAt(0).toUpperCase() || 'N'}
          </div>
          <span style={{ fontWeight: 700 }}>{s.name}</span>
        </div>
      </td>
      <td style={cell('right', { fontVariantNumeric: 'tabular-nums' })}>
        {s.cat_level != null ? s.cat_level.toFixed(1) : '—'}
      </td>
      <td style={cell('right', {
        fontVariantNumeric: 'tabular-nums',
        color: ppTone(s.pass_probability),
        fontWeight: 700,
      })}>
        {s.pass_probability != null ? `${s.pass_probability}%` : '—'}
      </td>
      <td style={cell('center', { color: trend.color })}>{trend.glyph}</td>
      <td style={cell('right', { color: 'rgba(255,255,255,0.65)' })}>
        {s.days_since_active != null ? `${s.days_since_active}d ago` : '—'}
      </td>
      <td style={cell('center')}>
        <RiskPill level={s.risk_level} />
      </td>
      <td style={cell('right')}>
        <button
          type="button"
          data-testid={`view-${s.student_id}`}
          onClick={() => onOpen(s)}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(245,197,24,0.10)',
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          View →
        </button>
      </td>
    </tr>
  );
}

function RiskPill({ level }: { level: RiskLevel }) {
  const c = riskColor(level);
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: 6,
      background: c.replace('0.9', '0.10'),
      border: `1px solid ${c}`,
      color: c,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {level}
    </span>
  );
}

function cell(align: 'left' | 'right' | 'center' = 'left', extra: React.CSSProperties = {}): React.CSSProperties {
  return { padding: '12px 14px', textAlign: align, ...extra };
}

function riskColor(level: RiskLevel): string {
  if (level === 'red')   return RED;
  if (level === 'amber') return AMBER;
  return GREEN;
}

function ppTone(pp: number | null): string {
  if (pp == null) return 'rgba(255,255,255,0.6)';
  if (pp >= 70) return GREEN;
  if (pp >= 50) return AMBER;
  return RED;
}

function trendIcon(dir: StudentMetrics['trend_direction']): { glyph: string; color: string } {
  if (dir === 'improving') return { glyph: '↑', color: GREEN };
  if (dir === 'declining') return { glyph: '↓', color: RED };
  if (dir === 'stable')    return { glyph: '—', color: 'rgba(255,255,255,0.5)' };
  return { glyph: '·', color: 'rgba(255,255,255,0.4)' };
}

// ─── Weekly digest card ───────────────────────────────────────────────

function WeeklyDigestCard({
  digest, onRefresh,
}: { digest: WeeklyDigest; onRefresh: () => void }) {
  const h = digest.cohort_health;
  return (
    <section
      data-testid="weekly-digest"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 11,
          textTransform: 'uppercase' as const,
          letterSpacing: 1,
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 800,
        }}>
          📋 This week's focus
        </div>
        <button
          type="button"
          onClick={onRefresh}
          data-testid="weekly-digest-refresh"
          style={{
            padding: '4px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Refresh
        </button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {digest.most_improved && digest.most_improved_delta != null && (
          <li data-testid="digest-most-improved" style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            🏆 <strong>Most improved:</strong> {digest.most_improved.name}{' '}
            <span style={{ color: GREEN }}>
              +{digest.most_improved_delta.toFixed(2)} levels/wk
            </span>
          </li>
        )}
        {digest.students_needing_contact.length > 0 && (
          <li data-testid="digest-need-contact" style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            ⚠️ <strong>Needs contact:</strong>{' '}
            {digest.students_needing_contact.length} student
            {digest.students_needing_contact.length === 1 ? '' : 's'}{' '}
            (<span style={{ color: AMBER }}>
              {digest.students_needing_contact.map(s => s.name).slice(0, 3).join(', ')}
              {digest.students_needing_contact.length > 3 ? '…' : ''}
            </span>)
          </li>
        )}
        {digest.cohort_wide_weakness && digest.cohort_wide_weakness_accuracy != null && (
          <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            📚 <strong>Cohort weakness:</strong> {digest.cohort_wide_weakness}{' '}
            <span style={{ color: digest.cohort_wide_weakness_accuracy < 0.55 ? RED : AMBER }}>
              avg {Math.round(digest.cohort_wide_weakness_accuracy * 100)}%
            </span>
          </li>
        )}
        {digest.countdown_alert && (
          <li style={{ fontSize: 13, color: AMBER }}>
            ⏰ {digest.countdown_alert}
          </li>
        )}
        <li style={{
          fontSize: 13,
          color: GOLD,
          fontWeight: 700,
          paddingTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          marginTop: 4,
        }}>
          🎯 {digest.coach_focus_this_week}
        </li>
      </ul>

      <div style={{
        marginTop: 10,
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
      }}>
        Cohort: {h.total_students} students · {h.students_below_passing} below passing ·{' '}
        {h.students_not_active_7_days} inactive 7+ days
      </div>
    </section>
  );
}

// ─── Cohort countdown banner ──────────────────────────────────────────

function CountdownBanner({
  level, message, cohortName,
}: { level: CountdownAlertLevel; message: string; cohortName?: string }) {
  const palette =
    level === 'critical' ? { bg: 'rgba(248,113,113,0.18)', border: RED,   text: '#fff' } :
    level === 'urgent'   ? { bg: 'rgba(248,113,113,0.10)', border: RED,   text: RED } :
                           { bg: 'rgba(245,158,11,0.10)',  border: AMBER, text: AMBER };
  const pulse = level === 'critical' ? ' pulse' : '';
  return (
    <div
      data-testid={`countdown-banner-${level}`}
      className={`anim${pulse}`}
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 14,
        color: palette.text,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      ⏰ {cohortName ? `${cohortName}: ` : ''}{message}
    </div>
  );
}
