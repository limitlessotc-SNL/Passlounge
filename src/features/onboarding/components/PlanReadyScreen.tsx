/**
 * PlanReadyScreen
 *
 * Post-onboarding "Your Plan Is Ready" screen.
 * Routes: /onboarding/ready
 *
 * Owner: Junior Engineer 2
 */

import { useNavigate } from 'react-router-dom'

import { useStudentStore } from '@/store/studentStore'

export function PlanReadyScreen() {
  const navigate = useNavigate()
  const nickname = useStudentStore((s) => s.nickname)

  return (
    <div className="content" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🎯</div>

      <div style={{ fontSize: 11, color: '#F5C518', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 10 }}>
        Your Plan Is Ready
      </div>

      <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 12 }}>
        Time To Get To<br />Work, <span style={{ color: '#F5C518' }}>{nickname || 'Nurse'}</span>. 💪
      </div>

      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 24 }}>
        Your diagnostic is complete. Your weakness map is built.
        Every session from here targets your exact gaps.
      </div>

      {/* Coach Note */}
      <div style={{ background: 'rgba(245,197,24,0.07)', border: '1.5px solid rgba(245,197,24,0.2)', borderRadius: 16, padding: 16, marginBottom: 24, textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: '#F5C518', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pearl-dot" />
          A Note From Your Coach
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
          &quot;The diagnostic tells us where to focus. Now we get to work filling those gaps — one card at a time.
          You showed up. That already puts you ahead of most.&quot;
        </div>
      </div>

      <button className="btn-gold" onClick={() => navigate('/')}>
        Enter The Lounge 🏠
      </button>
    </div>
  )
}
