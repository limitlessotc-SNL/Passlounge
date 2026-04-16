/**
 * ProfileTab
 *
 * Profile screen with nickname, settings, and sign out button.
 * Matches the original HTML profile screen.
 *
 * Owner: Junior Engineer 2
 */

import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { useStudentStore } from '@/store/studentStore'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function ProfileTab() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthStore((s) => s.user)
  const nickname = useStudentStore((s) => s.nickname)
  const dailyCards = useStudentStore((s) => s.dailyCards)

  const initial = (nickname || 'N').charAt(0).toUpperCase()

  const getProjectedDate = (): string => {
    const daysNeeded = Math.ceil(2000 / dailyCards)
    const projDate = new Date()
    projDate.setDate(projDate.getDate() + daysNeeded)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[projDate.getMonth()]} ${projDate.getDate()}, ${projDate.getFullYear()}`
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ paddingTop: 20 }}>
      <div className="anim" style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 20 }}>
        Profile
      </div>

      {/* Avatar + name */}
      <div className="anim" style={{ animationDelay: '0.05s', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#053571,#0a4d99)', border: '2px solid rgba(245,197,24,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#F5C518', flexShrink: 0 }}>
          {initial}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Nurse {nickname || 'Nurse'}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{user?.email ?? ''}</div>
        </div>
      </div>

      {/* Settings card */}
      <div className="anim" style={{ animationDelay: '0.1s', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 }}>Daily Commitment</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#F5C518' }}>{dailyCards} cards/day</div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 }}>Projected Test-Ready</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{getProjectedDate()}</div>
        </div>
      </div>

      {/* Coming soon */}
      <div className="anim" style={{ animationDelay: '0.15s', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px', marginBottom: 12, textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
        Badges, XP history &amp; weakness map<br />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Coming soon</span>
      </div>

      {/* Sign out */}
      <div className="anim" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={() => void handleSignOut()}
          style={{ width: '100%', padding: 14, background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 14, color: 'rgba(248,113,113,0.8)', fontSize: 14, fontWeight: 700, fontFamily: "'Outfit',sans-serif", cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
