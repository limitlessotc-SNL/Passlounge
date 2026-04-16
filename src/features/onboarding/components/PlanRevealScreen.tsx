/**
 * PlanRevealScreen
 *
 * Onboarding complete — shows plan summary, stats, confetti.
 * Routes: /onboarding/plan
 *
 * Owner: Junior Engineer 2
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ConfettiOverlay } from '@/components/animations/ConfettiOverlay'
import { useStudentStore } from '@/store/studentStore'

import { useOnboarding } from '../hooks/useOnboarding'

export function PlanRevealScreen() {
  const navigate = useNavigate()
  const nickname = useStudentStore((s) => s.nickname)
  const dailyCards = useStudentStore((s) => s.dailyCards)
  const testDays = useStudentStore((s) => s.testDays)
  const { completeOnboarding, getProjectedDate, error, isSaving } = useOnboarding()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) {
      setSaved(true)
      void completeOnboarding()
    }
  }, [saved, completeOnboarding])

  return (
    <div className="content scrollable">
      <ConfettiOverlay />

      {/* Check ring animation */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16 }}>
        <div className="check-ring">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M6 14l6 6L22 8" stroke="#F5C518" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="anim" style={{ fontSize: 11, color: '#F5C518', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8, animationDelay: '0.3s' }}>
          You&apos;re In The Lounge!
        </div>

        <div className="anim" style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 6, animationDelay: '0.4s' }}>
          Welcome, <span style={{ color: '#F5C518' }}>Nurse {nickname || 'Nurse'}</span>! 🎉
        </div>

        <div className="xp-burst">
          <span className="xp-num">+50 XP</span>
          <span className="xp-lbl">Onboarding Complete!</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid anim" style={{ animationDelay: '0.5s' }}>
        <div className="stat-box">
          <div className="stat-num">{dailyCards}</div>
          <div className="stat-lbl">Cards Per Day</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{testDays || '—'}</div>
          <div className="stat-lbl">Days To NCLEX</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">50</div>
          <div className="stat-lbl">XP Earned</div>
        </div>
      </div>

      {/* Projected Date */}
      <div className="anim" style={{ animationDelay: '0.6s', background: 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(245,197,24,0.6)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 }}>
          Projected Test-Ready Date
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#F5C518' }}>
          {getProjectedDate(dailyCards)}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
          Based on 2,000 cards at your daily commitment
        </div>
      </div>

      {/* Plan Details */}
      <div className="plan-card anim" style={{ animationDelay: '0.7s' }}>
        <div className="plan-row">
          <span className="plan-label">Starting Category</span>
          <span className="plan-val-gold">Cardiovascular 🫀</span>
        </div>
        <div className="plan-row">
          <span className="plan-label">Framework</span>
          <span className="plan-val">SNL Method</span>
        </div>
        <div className="plan-row">
          <span className="plan-label">CAT Level</span>
          <span className="plan-val">Diagnostic</span>
        </div>
        <div className="plan-row">
          <span className="plan-label">Competition</span>
          <span className="plan-val">Focus Mode</span>
        </div>
      </div>

      {/* Coach Pearl */}
      <div className="pearl-card anim" style={{ animationDelay: '0.8s' }}>
        <div className="pearl-from">
          <div className="pearl-dot" />
          A Note From Your Coach
        </div>
        <div className="pearl-text">
          &quot;Thank you for allowing me on this journey with you! Now let&apos;s cross the finish line and{' '}
          <span style={{ color: '#F5C518', fontWeight: 800 }}>PASS</span> the NCLEX.&quot;
        </div>
      </div>

      {error && (
        <p className="err-msg" style={{ marginBottom: 10 }}>{error.message}</p>
      )}

      <div className="anim" style={{ animationDelay: '0.9s' }}>
        <button
          className="btn-gold"
          disabled={isSaving}
          onClick={() => navigate('/onboarding/ready')}
        >
          {isSaving ? 'Saving...' : 'Start My Diagnostic Challenge'}
        </button>
      </div>
    </div>
  )
}
