/**
 * CPRCard
 *
 * Dashboard card summarizing the repeat tester's most recent CPR.
 * Loads the latest report on mount and renders:
 *   • empty state with "Upload CPR" CTA when no report exists
 *   • weak areas (below-passing) + strong areas (above-passing) chips
 *   • "Re-upload CPR" button to run the flow again
 *
 * Owner: Junior Engineer 2
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  CPR_CATEGORIES,
  getStrongCategories,
  getWeakCategories,
  resultLabel,
  resultRank,
  type CPRResultLevel,
} from '@/config/cpr-categories'

import { useCPR } from '../hooks/useCPR'

const LEVEL_COLOR: Record<CPRResultLevel, string> = {
  above: 'rgba(74,222,128,0.9)',
  near: 'rgba(245,197,24,0.9)',
  below: 'rgba(248,113,113,0.9)',
}

export function CPRCard() {
  const navigate = useNavigate()
  const { latest, loadLatest, isLoading } = useCPR()

  useEffect(() => {
    void loadLatest()
  }, [loadLatest])

  const startFlow = () => navigate('/cpr/entry')

  // ── Empty state ───────────────────────────────────────────────────
  if (!latest && !isLoading) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px dashed rgba(245,197,24,0.35)',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
        data-testid="cpr-card-empty"
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,197,24,0.9)', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 6 }}>
          Repeat Testers
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 10 }}>
          Upload your Candidate Performance Report and we&rsquo;ll build a study plan around your exact weak areas.
        </div>
        <button className="btn-gold" onClick={startFlow} type="button" style={{ marginBottom: 0 }}>
          Upload CPR
        </button>
      </div>
    )
  }

  if (!latest) return null

  const weak = getWeakCategories(latest.categories)
  const strong = getStrongCategories(latest.categories)

  const sorted = [...CPR_CATEGORIES].sort(
    (a, b) => resultRank(latest.categories[a.id]) - resultRank(latest.categories[b.id]),
  )

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
      data-testid="cpr-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,197,24,0.9)', letterSpacing: 1, textTransform: 'uppercase' as const }}>
          Your Last CPR
        </div>
        {latest.attempt_date && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {latest.attempt_date}
          </div>
        )}
      </div>

      {/* Weak areas */}
      {weak.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(248,113,113,0.9)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
            Focus Areas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {weak.map((c) => (
              <span
                key={c.id}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(248,113,113,0.12)',
                  color: 'rgba(248,113,113,0.95)',
                  border: '1px solid rgba(248,113,113,0.4)',
                }}
              >
                {c.short}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strong areas */}
      {strong.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(74,222,128,0.9)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
            Strengths
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {strong.map((c) => (
              <span
                key={c.id}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(74,222,128,0.12)',
                  color: 'rgba(74,222,128,0.95)',
                  border: '1px solid rgba(74,222,128,0.4)',
                }}
              >
                {c.short}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full breakdown */}
      <details style={{ marginTop: 10 }}>
        <summary
          style={{
            cursor: 'pointer',
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            textTransform: 'uppercase' as const,
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          Full Breakdown (8 Categories)
        </summary>
        <div style={{ marginTop: 8 }}>
          {sorted.map((c) => {
            const level = latest.categories[c.id]
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{c.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: level ? LEVEL_COLOR[level] : 'rgba(255,255,255,0.3)',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {level ? resultLabel(level) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </details>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="btn-gold"
          onClick={() => navigate('/cpr/analysis')}
          type="button"
          style={{ marginBottom: 0, flex: 2 }}
        >
          View Full Analysis
        </button>
        <button
          className="btn-ghost"
          onClick={startFlow}
          type="button"
          style={{ marginBottom: 0, flex: 1 }}
        >
          Re-upload
        </button>
      </div>
    </div>
  )
}
