// src/features/coach/StudentDetailPanel.tsx
//
// Slide-in right panel showing one student's full coaching context. The
// metrics row comes from the parent (already fetched by the dashboard); this
// component fetches the per-student notes / interventions / outcomes on
// mount and lets the coach add new ones inline. The panel does its own
// scrolling — overflow on the page body is handled by the dashboard.

import { useEffect, useState } from 'react';

import { supabase } from '@/config/supabase';

import {
  addCoachNote,
  getCoachNotes,
  getInterventions,
  getStudentOutcomes,
  logIntervention,
  recordNCLEXOutcome,
} from './coach.service';
import type {
  CategoryAccuracy,
  CoachNote,
  Intervention,
  InterventionType,
  NCLEXOutcome,
  NCLEXResult,
  RiskLevel,
  StudentMetrics,
} from './coach.types';

const GOLD  = '#F5C518';
const GREEN = 'rgba(74,222,128,0.9)';
const AMBER = 'rgba(245,158,11,0.9)';
const RED   = 'rgba(248,113,113,0.9)';

interface Props {
  metrics:  StudentMetrics;
  coachId:  string;
  cohortId: string;
  onClose:  () => void;
}

const RISK_COLOR: Record<RiskLevel, string> = {
  red:   RED,
  amber: AMBER,
  green: GREEN,
};

const INTERVENTION_TYPES: Array<{ value: InterventionType; label: string }> = [
  { value: 'message',  label: 'Message' },
  { value: 'session',  label: '1:1 session' },
  { value: 'resource', label: 'Resource shared' },
  { value: 'referral', label: 'Referral' },
  { value: 'other',    label: 'Other' },
];

export function StudentDetailPanel({ metrics, coachId, cohortId, onClose }: Props) {
  const [notes, setNotes]                 = useState<CoachNote[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [outcomes, setOutcomes]           = useState<NCLEXOutcome[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // Inline editor state
  const [newNote, setNewNote]                       = useState('');
  const [savingNote, setSavingNote]                 = useState(false);
  const [intervType, setIntervType]                 = useState<InterventionType>('session');
  const [intervNotes, setIntervNotes]               = useState('');
  const [savingIntervention, setSavingIntervention] = useState(false);
  const [outcomeResult, setOutcomeResult]           = useState<NCLEXResult>('passed');
  const [outcomeAttempt, setOutcomeAttempt]         = useState(1);
  const [savingOutcome, setSavingOutcome]           = useState(false);
  const [msgSubject, setMsgSubject]                 = useState('');
  const [msgBody, setMsgBody]                       = useState('');
  const [msgOpen, setMsgOpen]                       = useState(false);
  const [savingMsg, setSavingMsg]                   = useState(false);

  // Fetch notes / interventions / outcomes for this student.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getCoachNotes(coachId, metrics.student_id),
      getInterventions(coachId, metrics.student_id),
      getStudentOutcomes(metrics.student_id),
    ])
      .then(([n, i, o]) => {
        if (cancelled) return;
        setNotes(n);
        setInterventions(i);
        setOutcomes(o);
      })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [coachId, metrics.student_id]);

  async function handleSaveNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await addCoachNote(coachId, metrics.student_id, newNote);
      const fresh = await getCoachNotes(coachId, metrics.student_id);
      setNotes(fresh);
      setNewNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingNote(false);
    }
  }

  async function handleLogIntervention() {
    if (!intervNotes.trim()) return;
    setSavingIntervention(true);
    try {
      await logIntervention({
        coach_id: coachId,
        student_id: metrics.student_id,
        type: intervType,
        notes: intervNotes,
        outcome: null,
      });
      const fresh = await getInterventions(coachId, metrics.student_id);
      setInterventions(fresh);
      setIntervNotes('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingIntervention(false);
    }
  }

  async function handleRecordOutcome() {
    if (!metrics.test_date) return;
    setSavingOutcome(true);
    try {
      await recordNCLEXOutcome({
        student_id: metrics.student_id,
        cohort_id: cohortId,
        test_date: metrics.test_date,
        result: outcomeResult,
        attempt_number: outcomeAttempt,
      });
      const fresh = await getStudentOutcomes(metrics.student_id);
      setOutcomes(fresh);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingOutcome(false);
    }
  }

  async function handleSendMessage() {
    if (!msgBody.trim()) return;
    setSavingMsg(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const senderId = auth.user?.id;
      if (!senderId) throw new Error('Not signed in');
      const { error: e } = await supabase.from('messages').insert({
        sender_id:    senderId,
        recipient_id: metrics.student_id,
        cohort_id:    cohortId,
        subject:      msgSubject.trim(),
        body:         msgBody,
      });
      if (e) throw new Error(e.message);
      setMsgSubject('');
      setMsgBody('');
      setMsgOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingMsg(false);
    }
  }

  const showOutcomeBlock =
    metrics.test_date != null &&
    metrics.days_to_test != null &&
    metrics.days_to_test <= 0;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="panel-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 40,
        }}
      />
      {/* Panel */}
      <aside
        data-testid="student-detail-panel"
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          background: '#0a1629',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
          fontFamily: "'Outfit', 'Inter', sans-serif",
          zIndex: 50,
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg,#053571,#0a4d99)',
            border: `2px solid ${RISK_COLOR[metrics.risk_level]}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: GOLD,
          }}>
            {metrics.name.charAt(0).toUpperCase() || 'N'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{metrics.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              {metrics.email || 'no email on file'}
            </div>
          </div>
          <RiskBadge level={metrics.risk_level} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Quick stat grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
        }}>
          <Stat label="CAT level"    value={metrics.cat_level != null ? metrics.cat_level.toFixed(1) : '—'} />
          <Stat label="Pass %"       value={metrics.pass_probability != null ? `${metrics.pass_probability}%` : '—'} />
          <Stat label="Test date"    value={metrics.test_date ?? 'Not set'} />
          <Stat label="Days to test" value={metrics.days_to_test != null ? `${metrics.days_to_test}` : '—'} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setMsgOpen(o => !o)}
            data-testid="open-message-btn"
            style={btnStyle(GOLD, '#053571')}
          >
            📧 Message
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('coach-notes-input')?.focus()}
            data-testid="focus-note-btn"
            style={btnStyle('rgba(255,255,255,0.06)', '#fff', true)}
          >
            📝 Add Note
          </button>
        </div>

        {msgOpen && (
          <div data-testid="message-composer" style={panelBoxStyle()}>
            <input
              type="text"
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder="Subject (optional)"
              aria-label="Message subject"
              style={inputStyle()}
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Write a message…"
              aria-label="Message body"
              style={{ ...inputStyle(), minHeight: 90, marginTop: 6 }}
            />
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={savingMsg || !msgBody.trim()}
              data-testid="send-message-btn"
              style={{
                ...btnStyle(GOLD, '#053571'),
                marginTop: 8,
                opacity: !msgBody.trim() ? 0.5 : 1,
              }}
            >
              {savingMsg ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}

        {error && (
          <div data-testid="panel-error" style={{
            padding: 10, borderRadius: 10,
            background: 'rgba(248,113,113,0.10)',
            border: '1px solid rgba(248,113,113,0.4)',
            color: RED, fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {/* TRAJECTORY */}
        <Section title="Trajectory">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            alignItems: 'stretch',
          }}>
            <BigStat
              label="Pass probability"
              value={metrics.pass_probability != null ? `${metrics.pass_probability}%` : '—'}
              tone={ppTone(metrics.pass_probability)}
            />
            <BigStat
              label="Projected on test date"
              value={metrics.projected_pass_probability != null ? `${metrics.projected_pass_probability}%` : '—'}
              tone={ppTone(metrics.projected_pass_probability)}
            />
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            CAT velocity:{' '}
            <strong style={{
              color: metrics.cat_velocity != null && metrics.cat_velocity > 0 ? GREEN
                  : metrics.cat_velocity != null && metrics.cat_velocity < 0 ? RED
                  : 'rgba(255,255,255,0.7)',
            }}>
              {metrics.cat_velocity != null
                ? `${metrics.cat_velocity > 0 ? '+' : ''}${metrics.cat_velocity.toFixed(2)} levels/wk`
                : 'not enough data'}
            </strong>
            {metrics.cat_level_previous != null && metrics.cat_level != null && (
              <span style={{ marginLeft: 8 }}>
                ({metrics.cat_level_previous.toFixed(1)} → {metrics.cat_level.toFixed(1)})
              </span>
            )}
          </div>
        </Section>

        {/* CATEGORY HEATMAP */}
        <Section title="Category accuracy">
          {metrics.category_accuracy.length === 0 ? (
            <Empty>No CAT-level category data yet.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {metrics.category_accuracy.map(cat => (
                <CategoryRow key={cat.category} cat={cat} />
              ))}
            </div>
          )}
        </Section>

        {/* ACTIVITY */}
        <Section title="Activity">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <Stat label="Active days (last 14)" value={`${metrics.active_days_last_14} / 14`} />
            <Stat label="Last active" value={metrics.days_since_active != null
              ? `${metrics.days_since_active}d ago`
              : '—'} />
            <Stat label="Current streak"       value={`${metrics.current_streak}`} />
            <Stat label="Total cards studied"  value={`${metrics.total_cards_studied}`} />
            <Stat label="CAT sessions"         value={`${metrics.total_cat_sessions}`} />
          </div>
        </Section>

        {/* RISK FLAGS */}
        <Section title="Risk flags">
          {metrics.risk_flags.length === 0 ? (
            <Empty>No flags — student on track.</Empty>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {metrics.risk_flags.map(f => (
                <span
                  key={f}
                  style={{
                    fontSize: 11, fontWeight: 700,
                    padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(248,113,113,0.10)',
                    border: `1px solid ${RED}`,
                    color: RED,
                  }}
                >
                  ⚠️ {f}
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* COACH NOTES */}
        <Section title="Coach notes">
          {loading ? (
            <Empty>Loading…</Empty>
          ) : notes.length === 0 ? (
            <Empty>No notes yet.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {notes.map(n => (
                <div key={n.id} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  <div>{n.note}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                    {formatTs(n.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={panelBoxStyle()}>
            <textarea
              id="coach-notes-input"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note…"
              aria-label="New coach note"
              style={{ ...inputStyle(), minHeight: 70 }}
            />
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={savingNote || !newNote.trim()}
              data-testid="save-note-btn"
              style={{
                ...btnStyle(GOLD, '#053571'),
                marginTop: 8,
                opacity: !newNote.trim() ? 0.5 : 1,
              }}
            >
              {savingNote ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </Section>

        {/* INTERVENTION LOG */}
        <Section title="Intervention log">
          {loading ? (
            <Empty>Loading…</Empty>
          ) : interventions.length === 0 ? (
            <Empty>No interventions logged.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {interventions.map(i => (
                <div key={i.id} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  <div style={{
                    fontSize: 11,
                    color: GOLD,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {i.type}
                  </div>
                  <div>{i.notes || <em style={{ color: 'rgba(255,255,255,0.4)' }}>(no notes)</em>}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                    {formatTs(i.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={panelBoxStyle()}>
            <select
              value={intervType}
              onChange={(e) => setIntervType(e.target.value as InterventionType)}
              aria-label="Intervention type"
              style={{ ...inputStyle(), cursor: 'pointer' }}
            >
              {INTERVENTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <textarea
              value={intervNotes}
              onChange={(e) => setIntervNotes(e.target.value)}
              placeholder="What happened?"
              aria-label="Intervention notes"
              style={{ ...inputStyle(), minHeight: 60, marginTop: 6 }}
            />
            <button
              type="button"
              onClick={handleLogIntervention}
              disabled={savingIntervention || !intervNotes.trim()}
              data-testid="log-intervention-btn"
              style={{
                ...btnStyle(GOLD, '#053571'),
                marginTop: 8,
                opacity: !intervNotes.trim() ? 0.5 : 1,
              }}
            >
              {savingIntervention ? 'Logging…' : 'Log intervention'}
            </button>
          </div>
        </Section>

        {/* NCLEX OUTCOME */}
        <Section title="NCLEX outcome">
          {outcomes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              {outcomes.map(o => (
                <div key={o.id} style={{
                  fontSize: 12,
                  color: o.result === 'passed' ? GREEN : o.result === 'failed' ? RED : 'rgba(255,255,255,0.6)',
                }}>
                  Attempt {o.attempt_number}: <strong>{o.result.toUpperCase()}</strong>{' '}
                  · {o.test_date}
                </div>
              ))}
            </div>
          )}
          {showOutcomeBlock ? (
            <div style={panelBoxStyle()}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                Test date {metrics.test_date} has passed — record an outcome.
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {(['passed', 'failed', 'pending'] as NCLEXResult[]).map(r => (
                  <label key={r} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                    <input
                      type="radio"
                      name="outcome-result"
                      checked={outcomeResult === r}
                      onChange={() => setOutcomeResult(r)}
                      aria-label={`Outcome ${r}`}
                      style={{ accentColor: GOLD }}
                    />
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </label>
                ))}
              </div>
              <input
                type="number"
                min={1}
                value={outcomeAttempt}
                onChange={(e) => setOutcomeAttempt(Math.max(1, Number(e.target.value)))}
                aria-label="Attempt number"
                style={{ ...inputStyle(), width: 90 }}
              />
              <button
                type="button"
                onClick={handleRecordOutcome}
                disabled={savingOutcome}
                data-testid="record-outcome-btn"
                style={{ ...btnStyle(GOLD, '#053571'), marginTop: 8 }}
              >
                {savingOutcome ? 'Saving…' : 'Record outcome'}
              </button>
            </div>
          ) : outcomes.length === 0 ? (
            <Empty>Outcome recording opens after the test date.</Empty>
          ) : null}
        </Section>
      </aside>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      borderTop: '1px solid rgba(255,255,255,0.07)',
      paddingTop: 12,
    }}>
      <div style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: 700,
        marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10,
      padding: 10,
    }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
      <div style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: 700,
        marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

function BigStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      padding: 12,
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: tone }}>{value}</div>
      <div style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: 700,
      }}>
        {label}
      </div>
    </div>
  );
}

function CategoryRow({ cat }: { cat: CategoryAccuracy }) {
  const pct = Math.round(cat.accuracy * 100);
  const tone =
    cat.accuracy >= 0.7 ? GREEN :
    cat.accuracy >= 0.5 ? AMBER :
    RED;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.5fr 60px 1fr',
      gap: 8,
      alignItems: 'center',
      fontSize: 12,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.85)' }}>{cat.category}</div>
      <div style={{
        color: tone,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
      }}>
        {pct}% ({cat.correct}/{cat.total})
      </div>
      <div style={{
        position: 'relative',
        height: 8,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          width: `${Math.max(2, Math.min(100, pct))}%`,
          background: tone,
          borderRadius: 4,
        }} />
        {/* 70% target marker */}
        <div style={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: '70%',
          width: 1,
          background: 'rgba(255,255,255,0.3)',
        }} />
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const colour = RISK_COLOR[level];
  return (
    <span
      data-testid={`risk-badge-${level}`}
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '4px 8px',
        borderRadius: 6,
        background: `${colour.replace('0.9', '0.10')}`,
        border: `1px solid ${colour}`,
        color: colour,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      {level}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12,
      color: 'rgba(255,255,255,0.4)',
      padding: 8,
      fontStyle: 'italic' as const,
    }}>
      {children}
    </div>
  );
}

// ─── Style helpers ───────────────────────────────────────────────────

function btnStyle(bg: string, fg: string, ghost = false): React.CSSProperties {
  return {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 10,
    background: bg,
    color: fg,
    border: ghost ? '1px solid rgba(255,255,255,0.1)' : 'none',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 13,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  };
}

function panelBoxStyle(): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  };
}

function ppTone(pp: number | null): string {
  if (pp == null) return 'rgba(255,255,255,0.6)';
  if (pp >= 70) return GREEN;
  if (pp >= 50) return AMBER;
  return RED;
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
