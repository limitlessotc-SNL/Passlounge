// src/features/cat/CATResultsScreen.tsx

import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, ReferenceLine, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import type { CATResult } from './cat.types';
import {
  BLUEPRINT_WEIGHTS,
  CATEGORY_DISPLAY_NAMES,
  getCATLevelLabel,
} from './cat.utils';
import type { CATCategoryKey } from './cat.types';

interface Props {
  result: CATResult;
  /** Handler for "Retake CAT" — shown only when viewing a just-completed result. */
  onRetake?: () => void;
  /** When provided, replaces Retake + Dashboard with a single Back button (for history review). */
  onBack?: () => void;
}

const PASSING_LINE = 3;

// Palette aligned with the rest of the app (see ProfileTab, CPRAnalysisScreen).
const GOLD      = '#F5C518';
const GOLD_ALPHA = (a: number) => `rgba(245,197,24,${a})`;
const GREEN     = 'rgba(74,222,128,0.9)';
const RED       = 'rgba(248,113,113,0.9)';

export function CATResultsScreen({ result, onRetake, onBack }: Props) {
  const navigate = useNavigate();
  const isHistoryView = !!onBack;

  const levelLabel = getCATLevelLabel(result.cat_level);
  const passPct    = result.pass_probability;

  // ── Probability colour ────────────────────────────────────────────────
  const probColour =
    passPct >= 80 ? GREEN :
    passPct >= 60 ? GOLD  : RED;

  // ── Trend display ─────────────────────────────────────────────────────
  const trendIcon =
    result.trend_direction === 'improving' ? '↑' :
    result.trend_direction === 'declining' ? '↓' : '—';
  const trendColour =
    result.trend_direction === 'improving' ? GREEN :
    result.trend_direction === 'declining' ? RED : 'rgba(255,255,255,0.4)';

  // ── Difficulty progression chart data ─────────────────────────────────
  const chartData = result.question_trace.map(q => ({
    q: q.question_number,
    level: q.difficulty_level,
  }));

  // ── Determine weak categories (accuracy < 70%) ────────────────────────
  const weakCategories = (Object.keys(result.category_accuracy) as CATCategoryKey[]).filter(k => {
    const { correct, total } = result.category_accuracy[k];
    return total > 0 && correct / total < 0.7;
  });

  function handleStudyWeak() {
    navigate('/study', { state: { weakCategories } });
  }

  return (
    <div style={{
      minHeight: '100dvh',
      overflowY: 'auto',
      paddingBottom: 120,
      fontFamily: "'Outfit', 'Inter', sans-serif",
      color: '#fff',
    }}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{
        padding: '40px 20px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 100,
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}>
          {isHistoryView ? 'Past CAT' : 'CAT Complete'}
        </div>

        {/* Pass probability — primary metric */}
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: probColour,
          lineHeight: 1,
          marginBottom: 8,
          fontFamily: "'Outfit', 'DM Serif Display', Georgia, serif",
        }}>
          {passPct}<span style={{ fontSize: 32 }}>%</span>
        </div>
        <div style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 4,
        }}>
          NCLEX Readiness
        </div>

        {/* CAT Level */}
        <div style={{
          marginTop: 16,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: GOLD_ALPHA(0.1),
          border: `1px solid ${GOLD_ALPHA(0.25)}`,
          borderRadius: 100,
          padding: '8px 18px',
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: GOLD }}>
            Level {result.cat_level.toFixed(1)}
          </span>
          <span style={{ fontSize: 13, color: GOLD_ALPHA(0.7), fontWeight: 600 }}>
            {levelLabel}
          </span>
          <span style={{ fontSize: 18, color: trendColour, fontWeight: 700 }}>
            {trendIcon}
          </span>
        </div>

        {/* Quick stats */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginTop: 20,
        }}>
          {[
            { label: 'Correct', val: result.correct_count, color: GREEN },
            { label: 'Wrong',   val: result.wrong_count,   color: RED },
            { label: 'Time',    val: formatDuration(result.duration_seconds), color: 'rgba(255,255,255,0.7)' },
          ].map(s => (
            <div key={s.label} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              padding: '12px 8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Difficulty progression chart ─────────────────────────────── */}
      <Section title="Your Path Through the CAT">
        <div style={{ height: 200, marginTop: 8 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="q"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={29}
              />
              <YAxis
                domain={[1, 5]}
                ticks={[1, 2, 3, 4, 5]}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                itemStyle={{ color: GOLD }}
                formatter={(value) => [`Level ${value}`, 'Difficulty']}
                labelFormatter={(label) => `Q${label}`}
              />
              <ReferenceLine
                y={PASSING_LINE}
                stroke="rgba(239,68,68,0.5)"
                strokeDasharray="6 4"
                label={{ value: 'Pass line', position: 'insideTopRight', fill: 'rgba(239,68,68,0.6)', fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="level"
                stroke={GOLD}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: GOLD }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{
          display: 'flex',
          gap: 16,
          marginTop: 8,
          justifyContent: 'center',
        }}>
          <LegendDot color="#ef4444" label="Passing line (L3)" dashed />
          <LegendDot color={GOLD}    label="Your path" />
        </div>
      </Section>

      {/* ── Category breakdown ───────────────────────────────────────── */}
      <Section title="Category Breakdown">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {(Object.keys(result.category_accuracy) as CATCategoryKey[]).map(key => {
            const { correct, total } = result.category_accuracy[key];
            if (total === 0) return null;
            const pct     = Math.round((correct / total) * 100);
            const passing = pct >= 70;
            const weight  = BLUEPRINT_WEIGHTS[key];
            return (
              <div key={key}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  fontSize: 13,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {CATEGORY_DISPLAY_NAMES[key]}
                    <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 6, fontSize: 11 }}>
                      {Math.round(weight * 100)}%
                    </span>
                  </span>
                  <span style={{
                    fontWeight: 700,
                    color: passing ? GREEN : RED,
                    fontSize: 13,
                  }}>
                    {pct}% <span style={{ fontSize: 10, opacity: 0.6 }}>({correct}/{total})</span>
                  </span>
                </div>
                <div style={{
                  height: 5,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: passing ? GREEN : RED,
                    borderRadius: 3,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ position: 'relative', height: 0 }}>
                  <div style={{
                    position: 'absolute',
                    left: '70%',
                    top: -5,
                    width: 1,
                    height: 5,
                    background: 'rgba(255,255,255,0.2)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        <p style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
          marginTop: 12,
          textAlign: 'center',
        }}>
          Target: 70% accuracy per category
        </p>
      </Section>

      {/* ── Previous CAT comparison ──────────────────────────────────── */}
      {result.previous_cat_level !== null && (
        <Section title="vs. Last CAT">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            padding: '8px 0',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                {result.previous_cat_level.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Last CAT</div>
            </div>
            <div style={{ fontSize: 28, color: trendColour, fontWeight: 900 }}>{trendIcon}</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: GOLD }}>
                {result.cat_level.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>This CAT</div>
            </div>
          </div>
        </Section>
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 20px 88px',   // leave room for BottomNav
        background: 'linear-gradient(to top, rgba(5,11,26,0.95) 60%, transparent)',
        // Cap width on desktop so the CTAs don't stretch to a 1900px button.
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {weakCategories.length > 0 && (
            <button
              onClick={handleStudyWeak}
              style={primaryBtnStyle}
            >
              Study Weak Areas →
            </button>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            {isHistoryView ? (
              <button onClick={onBack} style={secondaryBtnStyle}>Back</button>
            ) : (
              <>
                <button onClick={onRetake} style={secondaryBtnStyle}>Retake CAT</button>
                <button onClick={() => navigate('/')} style={secondaryBtnStyle}>Dashboard</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      margin: '0 16px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18,
      padding: '18px 16px',
    }}>
      <h3 style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.35)',
        marginBottom: 12,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function LegendDot({
  color, label, dashed,
}: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 20,
        height: 2,
        background: color,
        borderRadius: 1,
        borderTop: dashed ? `2px dashed ${color}` : undefined,
        opacity: dashed ? 0.6 : 1,
      }} />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
    </div>
  );
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ─── Button styles ────────────────────────────────────────────────────────
// Match the app's gold/navy system (see ProfileTab, CPRAnalysisScreen .btn-gold / .btn-ghost).
// Primary + secondary buttons share the same padding/size so the Study Weak
// Areas CTA doesn't visually tower over Retake / Dashboard.

const BTN_PADDING = '11px 14px';
const BTN_RADIUS  = 12;
const BTN_FONT    = 14;

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: BTN_PADDING,
  borderRadius: BTN_RADIUS,
  fontSize: BTN_FONT,
  fontWeight: 800,
  fontFamily: "'Outfit', sans-serif",
  background: GOLD,
  border: 'none',
  color: '#053571',
  cursor: 'pointer',
  letterSpacing: '0.01em',
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: BTN_PADDING,
  borderRadius: BTN_RADIUS,
  fontSize: BTN_FONT,
  fontWeight: 700,
  fontFamily: "'Outfit', sans-serif",
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  cursor: 'pointer',
};
