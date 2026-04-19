/**
 * DiagInfoScreen
 *
 * "This Is Your Baseline Test" info screen before starting the diagnostic.
 * Routes: /diagnostic/info
 *
 * Owner: Junior Engineer 5
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { fetchDiagnosticCards } from '@/features/session/services/cards.service'
import { useSessionStore } from '@/store/sessionStore'

export function DiagInfoScreen() {
  const navigate = useNavigate()
  const startSession = useSessionStore((s) => s.startSession)
  const setMode = useSessionStore((s) => s.setMode)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const cards = await fetchDiagnosticCards()
      if (cards.length === 0) {
        setError('No diagnostic cards available. Please try again.')
        setLoading(false)
        return
      }
      // Diagnostic is always test mode (no CCCC)
      setMode('test')
      startSession(cards, true)
      setLoading(false)
      navigate('/diagnostic/play')
    } catch {
      setError('Failed to load diagnostic. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="content" style={{ justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="anim" style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(5,53,113,0.8),rgba(10,77,153,0.6))', border: '2px solid rgba(245,197,24,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>
          🎯
        </div>
        <div className="anim" style={{ animationDelay: '0.1s', fontSize: 10, color: '#F5C518', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 10 }}>
          Diagnostic Assessment
        </div>
        <div className="anim" style={{ animationDelay: '0.15s', fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 10 }}>
          This Is Your<br />Baseline Test.
        </div>
        <div className="anim" style={{ animationDelay: '0.2s', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
          Answer every question with your best clinical judgment. No hints. No framework. Just you and the question — exactly like the real NCLEX.
        </div>
      </div>

      <div className="anim" style={{ animationDelay: '0.25s', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 18 }}>📋</div>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>15 Questions</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Across 5 clinical categories</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 18 }}>⚡</div>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Test Mode Only</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>No CCCC — pure clinical assessment</div></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 18 }}>🔒</div>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>One Time Only</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>This assessment never repeats</div></div>
        </div>
      </div>

      <div className="anim" style={{ animationDelay: '0.3s' }}>
        <button className="btn-gold" onClick={() => void handleStart()} disabled={loading}>
          {loading ? 'Loading cards...' : "I'm Ready — Let's Go"}
        </button>
      </div>
      {error && (
        <p className="err-msg" style={{ marginTop: 10 }}>{error}</p>
      )}
      <div className="anim" style={{ animationDelay: '0.35s', fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 4 }}>
        Answer honestly for the most accurate results
      </div>
    </div>
  )
}
