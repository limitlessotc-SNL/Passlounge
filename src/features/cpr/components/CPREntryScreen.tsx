/**
 * CPREntryScreen
 *
 * First step of the CPR flow — manual data entry. Every NCSBN category
 * must be marked Above / Near / Below. Attempt date is optional.
 *
 * Routes: /cpr/entry  (accepts ?from=onboarding)
 *
 * Owner: Junior Engineer 2
 */

import { useNavigate, useSearchParams } from 'react-router-dom'

import { CPR_CATEGORIES, isComplete, type CPRResultLevel } from '@/config/cpr-categories'
import { useCPRStore } from '@/store/cprStore'

const LEVELS: { value: CPRResultLevel; label: string; color: string }[] = [
  { value: 'above', label: 'Above', color: 'rgba(74,222,128,0.9)' },
  { value: 'near', label: 'Near', color: 'rgba(245,197,24,0.9)' },
  { value: 'below', label: 'Below', color: 'rgba(248,113,113,0.9)' },
]

export function CPREntryScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isOnboarding = params.get('from') === 'onboarding'
  const draft = useCPRStore((s) => s.draft)
  const setCategoryResult = useCPRStore((s) => s.setCategoryResult)
  const setAttemptDate = useCPRStore((s) => s.setAttemptDate)

  const complete = isComplete(draft.categories)

  const goBack = () =>
    navigate(isOnboarding ? '/onboarding' : '/')
  const goReview = () =>
    navigate(isOnboarding ? '/cpr/review?from=onboarding' : '/cpr/review')
  const goSkip = () => navigate('/onboarding/confidence')

  return (
    <div className="content scrollable">
      <div className="step-pill anim">Enter Your Results</div>

      <div className="screen-title anim" style={{ animationDelay: '0.1s' }}>
        How Did You Score<br />By Category?
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.15s' }}>
        Match each row to what the CPR said next to that category.
      </div>

      {/* Optional attempt date */}
      <label
        className="anim"
        style={{
          animationDelay: '0.18s',
          display: 'block',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
          Attempt Date (optional)
        </div>
        <input
          className="pl-input"
          type="date"
          value={draft.attempt_date ?? ''}
          onChange={(e) => setAttemptDate(e.target.value || null)}
          aria-label="Attempt date"
          style={{ marginBottom: 0 }}
        />
      </label>

      {/* Category rows */}
      {CPR_CATEGORIES.map((cat, i) => {
        const selected = draft.categories[cat.id]
        return (
          <div
            key={cat.id}
            className="anim"
            style={{
              animationDelay: `${0.2 + i * 0.03}s`,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              {cat.label}
            </div>
            <div
              role="radiogroup"
              aria-label={`${cat.label} result`}
              style={{ display: 'flex', gap: 6 }}
            >
              {LEVELS.map((lvl) => {
                const isSel = selected === lvl.value
                return (
                  <button
                    key={lvl.value}
                    role="radio"
                    aria-checked={isSel}
                    aria-label={`${cat.label} ${lvl.label}`}
                    type="button"
                    onClick={() => setCategoryResult(cat.id, lvl.value)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: 10,
                      background: isSel ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
                      border: isSel ? `2px solid ${lvl.color}` : '1.5px solid rgba(255,255,255,0.08)',
                      color: isSel ? lvl.color : 'rgba(255,255,255,0.6)',
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: "'Outfit',sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    {lvl.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          className="btn-ghost"
          onClick={goBack}
          type="button"
          style={{ flex: 1, marginBottom: 0 }}
        >
          Back
        </button>
        <button
          className="btn-gold"
          onClick={goReview}
          type="button"
          disabled={!complete}
          style={{ flex: 2, marginBottom: 0, opacity: complete ? 1 : 0.5 }}
        >
          Review →
        </button>
      </div>

      {isOnboarding && (
        <button
          type="button"
          onClick={goSkip}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
            fontFamily: "'Outfit',sans-serif",
            cursor: 'pointer',
            width: '100%',
            padding: 12,
            marginTop: 8,
          }}
        >
          Skip CPR for now
        </button>
      )}
    </div>
  )
}
