/**
 * ReviewScreen
 *
 * End-of-session summary showing correct/wrong/XP counts
 * and a reviewable list of all cards answered.
 * Routes: /session/review
 *
 * Owner: Junior Engineer 3
 */

import { useNavigate } from 'react-router-dom'

import { useSessionStore } from '@/store/sessionStore'

export function ReviewScreen() {
  const navigate = useNavigate()
  const { cards, results, correctCount, wrongCount, xp } = useSessionStore()

  return (
    <div className="content scrollable" style={{ paddingTop: 28, paddingBottom: 120 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div className="anim" style={{ fontSize: 11, color: '#F5C518', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 8 }}>
          Session Complete
        </div>
        <div className="anim" style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6, animationDelay: '0.05s' }}>
          Review With<br />SNL Method 📖
        </div>
        <div className="anim" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 16, animationDelay: '0.1s' }}>
          Tap any card to review the CCCC framework. Wrong answers are highlighted — start there.
        </div>

        {/* Stats */}
        <div className="anim" style={{ display: 'flex', gap: 10, marginBottom: 18, animationDelay: '0.15s' }}>
          <div style={{ flex: 1, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#4ade80' }}>{correctCount}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 2 }}>Correct</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#f87171' }}>{wrongCount}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 2 }}>Review</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.2)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#F5C518' }}>{xp}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 2 }}>XP</div>
          </div>
        </div>
      </div>

      {/* Card list */}
      {cards.map((card, idx) => {
        const isCorrect = results[idx] === true
        return (
          <div
            key={idx}
            className={`review-list-item anim${isCorrect === false ? ' wrong-item' : ''}`}
            style={{ animationDelay: `${0.2 + idx * 0.03}s` }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: isCorrect ? '#4ade80' : '#f87171', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="review-card-title">{card.title}</div>
              <div className="review-card-sub">
                {card.cat}{!isCorrect ? ' · ⚠ Priority Review' : ''}
              </div>
            </div>
            <div className="review-btn">Review →</div>
          </div>
        )
      })}

      {/* Bottom buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn-ghost" style={{ marginBottom: 0 }} onClick={() => navigate('/study')}>
          Study
        </button>
        <button className="btn-ghost" style={{ marginBottom: 0 }} onClick={() => navigate('/')}>
          Home
        </button>
      </div>
    </div>
  )
}
