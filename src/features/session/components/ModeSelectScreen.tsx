/**
 * ModeSelectScreen
 *
 * Choose between Test Mode and Study Mode before starting a session.
 * Routes: /session/mode
 *
 * Owner: Junior Engineer 3
 */

import { useNavigate } from 'react-router-dom'

import { useSessionStore } from '@/store/sessionStore'
import type { SessionMode } from '@/types'

const CHECK_SVG = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 5l2.5 2.5L8 2" stroke="#053571" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function ModeSelectScreen() {
  const navigate = useNavigate()
  const mode = useSessionStore((s) => s.mode)
  const setMode = useSessionStore((s) => s.setMode)

  const handleSelect = (m: SessionMode) => {
    setMode(m)
  }

  const handleStart = () => {
    navigate('/session/play')
  }

  return (
    <div className="content">
      <div className="anim" style={{ marginBottom: 24 }}>
        <div className="mode-badge">⚡ Daily Study Session</div>
        <div className="screen-title" style={{ fontSize: 24 }}>
          How Do You Want<br />To Study Today?
        </div>
        <div className="screen-sub" style={{ marginBottom: 0 }}>
          Choose your mode. You can&apos;t switch mid-session — just like the real NCLEX.
        </div>
      </div>

      {/* Test Mode */}
      <div
        className={`mode-card anim${mode === 'test' ? ' selected' : ''}`}
        style={{ animationDelay: '0.1s' }}
        onClick={() => handleSelect('test')}
      >
        <div className="mode-check">{mode === 'test' ? CHECK_SVG : null}</div>
        <div className="mode-icon-wrap" style={{ background: 'rgba(245,197,24,0.1)' }}>🎯</div>
        <div className="mode-title">Test Mode</div>
        <div className="mode-sub">
          Answer questions the way you will on the real NCLEX. No framework, no hints — just your clinical judgment.
        </div>
        <div className="mode-tags">
          <span className="mode-tag mode-tag-gold">Fast Paced</span>
          <span className="mode-tag mode-tag-gold">No CCCC</span>
          <span className="mode-tag mode-tag-green">SNL Review After</span>
        </div>
      </div>

      {/* Study Mode */}
      <div
        className={`mode-card anim${mode === 'study' ? ' selected' : ''}`}
        style={{ animationDelay: '0.15s' }}
        onClick={() => handleSelect('study')}
      >
        <div className="mode-check">{mode === 'study' ? CHECK_SVG : null}</div>
        <div className="mode-icon-wrap" style={{ background: 'rgba(96,165,250,0.1)' }}>📖</div>
        <div className="mode-title">Study Mode</div>
        <div className="mode-sub">
          Answer questions then unlock the full SNL Method — Core Problem, Complication, Connection, Confirmation — after every card.
        </div>
        <div className="mode-tags">
          <span className="mode-tag mode-tag-blue">Full CCCC</span>
          <span className="mode-tag mode-tag-blue">Clinical Lens</span>
          <span className="mode-tag mode-tag-blue">Coach&apos;s Pearl</span>
        </div>
      </div>

      <div className="anim" style={{ animationDelay: '0.2s', marginTop: 8 }}>
        <button className="btn-gold" onClick={handleStart}>
          Start {mode === 'test' ? 'Test' : 'Study'} Mode →
        </button>
      </div>
    </div>
  )
}
