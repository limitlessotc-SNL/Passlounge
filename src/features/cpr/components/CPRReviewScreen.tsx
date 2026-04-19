/**
 * CPRReviewScreen
 *
 * Step 3 of the CPR flow — summary + confirm. Shows every answered
 * category with color coding, overall result, and attempt date. Saving
 * triggers insert + (optional) photo upload via useCPR.saveDraft().
 *
 * Routes: /cpr/review  (accepts ?from=onboarding)
 *
 * Owner: Junior Engineer 2
 */

import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  CPR_CATEGORIES,
  isComplete,
  resultLabel,
  type CPRResultLevel,
} from '@/config/cpr-categories'
import { useCPRStore } from '@/store/cprStore'

import { useCPR } from '../hooks/useCPR'

const LEVEL_COLORS: Record<CPRResultLevel, string> = {
  above: 'rgba(74,222,128,0.9)',
  near: 'rgba(245,197,24,0.9)',
  below: 'rgba(248,113,113,0.9)',
}

export function CPRReviewScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isOnboarding = params.get('from') === 'onboarding'
  const draft = useCPRStore((s) => s.draft)
  const { saveDraft, isSaving, error, pendingFile } = useCPR()

  const complete = isComplete(draft.categories)

  const goBack = () =>
    navigate(isOnboarding ? '/cpr/entry?from=onboarding' : '/cpr/entry')

  const handleSave = async () => {
    const row = await saveDraft()
    if (!row) return
    // Funnel both flows through the analysis screen so users always see
    // what their results mean before moving on.
    navigate(isOnboarding ? '/cpr/analysis?from=onboarding' : '/cpr/analysis')
  }

  return (
    <div className="content scrollable">
      <div className="step-pill anim">Review &amp; Save</div>

      <div className="screen-title anim" style={{ animationDelay: '0.1s' }}>
        Looks Good?
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.15s' }}>
        You can always re-upload later if something changes.
      </div>

      <div
        className="anim"
        style={{
          animationDelay: '0.2s',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Attempt Date</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {draft.attempt_date ?? 'Not set'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Overall Result</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: draft.overall_result === 'pass' ? 'rgba(74,222,128,0.9)' : draft.overall_result === 'fail' ? 'rgba(248,113,113,0.9)' : '#fff' }}>
            {draft.overall_result ? draft.overall_result.toUpperCase() : 'Not set'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Photo</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {pendingFile ? pendingFile.name : 'None'}
          </span>
        </div>
      </div>

      {CPR_CATEGORIES.map((cat) => {
        const level = draft.categories[cat.id]
        return (
          <div
            key={cat.id}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              {cat.label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: level ? LEVEL_COLORS[level] : 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              {level ? resultLabel(level) : '—'}
            </span>
          </div>
        )
      })}

      {error && <p className="err-msg" style={{ marginTop: 10 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          className="btn-ghost"
          onClick={goBack}
          type="button"
          disabled={isSaving}
          style={{ flex: 1, marginBottom: 0 }}
        >
          Back
        </button>
        <button
          className="btn-gold"
          onClick={() => void handleSave()}
          type="button"
          disabled={isSaving || !complete}
          style={{ flex: 2, marginBottom: 0, opacity: isSaving || !complete ? 0.5 : 1 }}
        >
          {isSaving ? 'Saving…' : 'Save CPR'}
        </button>
      </div>
    </div>
  )
}
