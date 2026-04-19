/**
 * CPRAnalysisScreen
 *
 * Shown after Save (or from the dashboard CPR card). Explains what each
 * NCSBN category actually covers and what the student's result level
 * means for their study plan.
 *
 * Shows counts at the top (N below / M near / K above), then every
 * category sorted weakest-first with scope + topics + level-specific
 * advice pulled from cpr-category-info.
 *
 * Route: /cpr/analysis  (accepts ?from=onboarding)
 *
 * Owner: Junior Engineer 2
 */

import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  CPR_CATEGORIES,
  resultLabel,
  resultRank,
  type CPRResultLevel,
} from '@/config/cpr-categories'
import { getCategoryInfo } from '@/config/cpr-category-info'

import { useCPR } from '../hooks/useCPR'

const LEVEL_COLOR: Record<CPRResultLevel, string> = {
  above: 'rgba(74,222,128,0.9)',
  near: 'rgba(245,197,24,0.9)',
  below: 'rgba(248,113,113,0.9)',
}

const LEVEL_HEADLINE: Record<CPRResultLevel, string> = {
  above: 'Solid ground',
  near: 'Almost there',
  below: 'Top priority',
}

export function CPRAnalysisScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isOnboarding = params.get('from') === 'onboarding'
  const { latest, loadLatest } = useCPR()

  // If the user landed here directly (e.g., from the dashboard card or a
  // deep link), kick off a single load attempt on mount. If the row
  // really doesn't exist we render the empty state; no further retries.
  const loadAttempted = useRef(false)
  useEffect(() => {
    if (loadAttempted.current) return
    if (latest) return
    loadAttempted.current = true
    void loadLatest()
  }, [latest, loadLatest])

  const categories = latest?.categories ?? {}
  const belowCount = CPR_CATEGORIES.filter((c) => categories[c.id] === 'below').length
  const nearCount = CPR_CATEGORIES.filter((c) => categories[c.id] === 'near').length
  const aboveCount = CPR_CATEGORIES.filter((c) => categories[c.id] === 'above').length

  const sorted = [...CPR_CATEGORIES].sort(
    (a, b) => resultRank(categories[a.id]) - resultRank(categories[b.id]),
  )

  const handleContinue = () => {
    navigate(isOnboarding ? '/onboarding/confidence' : '/')
  }

  // Empty state — no CPR exists yet (user navigated here manually)
  if (!latest) {
    return (
      <div className="content">
        <div className="step-pill anim">CPR Analysis</div>
        <div className="screen-title anim" style={{ animationDelay: '0.1s' }}>
          No CPR On File
        </div>
        <div className="screen-sub anim" style={{ animationDelay: '0.15s' }}>
          Upload your Candidate Performance Report first to see a full breakdown.
        </div>
        <button
          className="btn-gold anim"
          style={{ animationDelay: '0.2s' }}
          onClick={() => navigate('/cpr/upload')}
          type="button"
        >
          Upload CPR
        </button>
        <button
          className="btn-ghost anim"
          style={{ animationDelay: '0.25s' }}
          onClick={handleContinue}
          type="button"
        >
          {isOnboarding ? 'Skip' : 'Back'}
        </button>
      </div>
    )
  }

  return (
    <div className="content scrollable">
      <div className="step-pill anim">Your Breakdown</div>

      <div className="screen-title anim" style={{ animationDelay: '0.1s' }}>
        What Your Results<br />Actually Mean
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.15s' }}>
        Each NCSBN category covers specific content. Here&rsquo;s where to spend your study time.
      </div>

      {/* Summary row */}
      <div
        className="anim"
        style={{
          animationDelay: '0.18s',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 18,
        }}
      >
        <SummaryPill count={belowCount} label="Below" color={LEVEL_COLOR.below} />
        <SummaryPill count={nearCount} label="Near" color={LEVEL_COLOR.near} />
        <SummaryPill count={aboveCount} label="Above" color={LEVEL_COLOR.above} />
      </div>

      {/* Category breakdown — weakest first */}
      {sorted.map((cat, i) => {
        const level = categories[cat.id]
        const info = getCategoryInfo(cat.id)
        if (!info) return null

        return (
          <div
            key={cat.id}
            className="anim"
            style={{
              animationDelay: `${0.2 + i * 0.04}s`,
              background: 'rgba(255,255,255,0.04)',
              border: level ? `1px solid ${LEVEL_COLOR[level]}40` : '1px solid rgba(255,255,255,0.08)',
              borderLeft: level ? `4px solid ${LEVEL_COLOR[level]}` : '4px solid rgba(255,255,255,0.15)',
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  {cat.label}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {info.weight} of the NCLEX
                </div>
              </div>
              {level && (
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: LEVEL_COLOR[level], textTransform: 'uppercase' as const, letterSpacing: 0.8 }}>
                    {resultLabel(level)}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                    {LEVEL_HEADLINE[level]}
                  </div>
                </div>
              )}
            </div>

            {/* Overview */}
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', marginBottom: 10, lineHeight: 1.45 }}>
              {info.overview}
            </div>

            {/* Topics */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
                Covered Content
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.65)', fontSize: 12.5, lineHeight: 1.55 }}>
                {info.topics.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>

            {/* Advice */}
            {level && (
              <div
                style={{
                  background: `${LEVEL_COLOR[level]}12`,
                  border: `1px solid ${LEVEL_COLOR[level]}40`,
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: LEVEL_COLOR[level], textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 4 }}>
                  What to do
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                  {info.advice[level]}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Continue */}
      <button
        className="btn-gold"
        onClick={handleContinue}
        type="button"
        style={{ marginTop: 8 }}
      >
        {isOnboarding ? 'Continue Onboarding →' : 'Back To Dashboard'}
      </button>
    </div>
  )
}

function SummaryPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div
      style={{
        padding: '14px 8px',
        borderRadius: 12,
        background: `${color}12`,
        border: `1px solid ${color}40`,
        textAlign: 'center' as const,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}
