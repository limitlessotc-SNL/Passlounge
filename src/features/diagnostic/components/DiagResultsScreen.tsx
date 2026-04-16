/**
 * DiagResultsScreen
 *
 * Diagnostic results with score, category breakdown, study plan.
 * Routes: /diagnostic/results
 *
 * Owner: Junior Engineer 5
 */

import { useNavigate } from 'react-router-dom'

import { getCategoryBreakdown, getDiagnosticGrade } from '@/config/diagnostic-cards'
import { useDashboardStore } from '@/store/dashboardStore'
import { useSessionStore } from '@/store/sessionStore'
import { useStudentStore } from '@/store/studentStore'

export function DiagResultsScreen() {
  const navigate = useNavigate()
  const nickname = useStudentStore((s) => s.nickname)
  const { cards, results, correctCount } = useSessionStore()
  const diagnosticResult = useDashboardStore((s) => s.diagnosticResult)

  const total = diagnosticResult.completed ? diagnosticResult.total : cards.length
  const correct = diagnosticResult.completed ? diagnosticResult.correct : correctCount
  const diagResults = diagnosticResult.completed ? diagnosticResult.results : results

  const pct = total > 0 ? Math.round((correct / total) * 100) : 0
  const grade = getDiagnosticGrade(pct)
  const breakdown = getCategoryBreakdown(
    diagnosticResult.completed ? [] : cards,
    diagResults,
  )

  return (
    <div className="content scrollable" style={{ paddingTop: 20, paddingBottom: 100 }}>
      {/* Header */}
      <div className="anim" style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 11, color: '#F5C518', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>
          Diagnostic Complete
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 6 }}>
          Here&apos;s Where<br />You Stand, <span style={{ color: '#F5C518' }}>{nickname || 'Nurse'}</span>.
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          Your personalized study plan is ready below.
        </div>
      </div>

      {/* Score cards */}
      <div className="anim" style={{ animationDelay: '0.1s', display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, background: 'rgba(5,53,113,0.4)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#F5C518', lineHeight: 1 }}>{correct}/{total}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 5 }}>Score</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(5,53,113,0.4)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#F5C518', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 5 }}>Accuracy</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(5,53,113,0.4)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#F5C518', lineHeight: 1 }}>{grade.catLevel}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 5 }}>CAT Level</div>
        </div>
      </div>

      {/* Grade description */}
      <div className="anim" style={{ animationDelay: '0.15s', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 16 }}>{grade.gradeIcon}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{grade.gradeText}</div>
      </div>

      {/* Category Breakdown */}
      {breakdown.length > 0 && (
        <>
          <div className="dash-section-lbl anim" style={{ animationDelay: '0.2s' }}>Category Breakdown</div>
          {breakdown.map((cat, i) => {
            const color = cat.pct >= 80 ? '#4ade80' : cat.pct >= 50 ? '#F5C518' : '#f87171'
            const label = cat.pct >= 80 ? 'Strong' : cat.pct >= 50 ? 'Needs Review' : 'Priority ⚠️'
            return (
              <div key={cat.cat} className="anim" style={{ animationDelay: `${0.25 + i * 0.04}s`, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{cat.cat}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color }}>{cat.correct}/{cat.total}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                  </div>
                </div>
                <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${cat.pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Study Plan */}
      {breakdown.length > 0 && (
        <>
          <div className="dash-section-lbl anim" style={{ animationDelay: '0.45s', marginTop: 10 }}>Your Study Plan</div>
          <div className="anim" style={{ animationDelay: '0.5s', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, marginBottom: 18 }}>
            <div style={{ marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Based on your results — your recommended study order:</div>
            {breakdown.map((cat, i) => {
              const urgency = cat.pct < 50 ? '🔴 Priority' : cat.pct < 80 ? '🟡 Review' : '🟢 Maintain'
              return (
                <div key={cat.cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < breakdown.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#F5C518', width: 20 }}>{i + 1}.</div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#fff' }}>{cat.icon} {cat.cat}</div>
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{urgency}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="anim" style={{ animationDelay: '0.55s' }}>
        <button className="btn-gold" onClick={() => navigate('/')}>
          Go To My Dashboard 🏠
        </button>
      </div>
    </div>
  )
}
