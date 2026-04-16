/**
 * SessionSetup
 *
 * Session configuration: mode toggle, question count, card pool selector.
 * Matches the original HTML study-start-view.
 *
 * Owner: Junior Engineer 3
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSessionStore } from '@/store/sessionStore'
import type { SessionPool } from '@/types'

const CHECK_SVG = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 5l2.5 2.5L8 2" stroke="#053571" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Q_COUNTS = [10, 20, 30] as const

interface PoolOption {
  id: SessionPool;
  icon: string;
  title: string;
  sub: string;
}

const POOLS: PoolOption[] = [
  { id: 'all', icon: '🎯', title: 'All Cards', sub: 'Seen and unseen — full mix' },
  { id: 'new', icon: '🆕', title: 'New Cards Only', sub: 'Only cards you have never seen' },
  { id: 'missed', icon: '❌', title: 'Missed Cards Only', sub: 'Cards you got wrong in past sessions' },
]

export function SessionSetup() {
  const navigate = useNavigate()
  const { mode, pool, qCount, setMode, setPool, setQCount } = useSessionStore()
  const [showCustom, setShowCustom] = useState(false)
  const [customVal, setCustomVal] = useState('')

  const handleQCount = (val: number | 'custom') => {
    if (val === 'custom') {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      setQCount(val)
    }
  }

  const handleCustomChange = (v: string) => {
    setCustomVal(v)
    const max = mode === 'study' ? 30 : 75
    const num = Math.min(Math.max(parseInt(v) || 1, 1), max)
    setQCount(num)
  }

  const handleStart = () => {
    navigate('/session/play')
  }

  return (
    <div>
      {/* Step 1: Mode */}
      <div className="setup-section-lbl">Step 1 — Mode</div>

      <div
        className={`mode-card${mode === 'test' ? ' selected' : ''}`}
        onClick={() => setMode('test')}
      >
        <div className="mode-check">{mode === 'test' ? CHECK_SVG : null}</div>
        <div className="mode-icon-wrap" style={{ background: 'rgba(245,197,24,0.1)' }}>🎯</div>
        <div className="mode-title">Test Mode</div>
        <div className="mode-sub">Fast answers, no framework — NCLEX style.</div>
        <div className="mode-tags">
          <span className="mode-tag mode-tag-gold">Fast Paced</span>
          <span className="mode-tag mode-tag-gold">No CCCC</span>
        </div>
      </div>

      <div
        className={`mode-card${mode === 'study' ? ' selected' : ''}`}
        onClick={() => setMode('study')}
      >
        <div className="mode-check">{mode === 'study' ? CHECK_SVG : null}</div>
        <div className="mode-icon-wrap" style={{ background: 'rgba(96,165,250,0.1)' }}>📖</div>
        <div className="mode-title">Study Mode</div>
        <div className="mode-sub">Full SNL Method after every card.</div>
        <div className="mode-tags">
          <span className="mode-tag mode-tag-blue">Full CCCC</span>
          <span className="mode-tag mode-tag-blue">Coach&apos;s Pearl</span>
        </div>
      </div>

      {/* Step 2: Question Count */}
      <div className="setup-section-lbl" style={{ marginTop: 6 }}>Step 2 — Questions</div>
      <div className="q-count-row">
        {Q_COUNTS.map((n) => (
          <button
            key={n}
            className={`q-count-btn${qCount === n && !showCustom ? ' selected' : ''}`}
            onClick={() => handleQCount(n)}
          >
            {n}
          </button>
        ))}
        <button
          className={`q-count-btn${showCustom ? ' selected' : ''}`}
          onClick={() => handleQCount('custom')}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="custom-input-wrap" style={{ display: 'block' }}>
          <input
            className="custom-q-input"
            type="number"
            min={1}
            max={mode === 'study' ? 30 : 75}
            placeholder="Enter number..."
            value={customVal}
            onChange={(e) => handleCustomChange(e.target.value)}
          />
        </div>
      )}

      <div className="session-limit-note">
        Max {mode === 'study' ? 30 : 75} for {mode === 'study' ? 'Study' : 'Test'} Mode
      </div>

      {/* Step 3: Card Pool */}
      <div className="setup-section-lbl">Step 3 — Card Pool</div>
      {POOLS.map((p) => (
        <div
          key={p.id}
          className={`pool-card${pool === p.id ? ' selected' : ''}`}
          onClick={() => setPool(p.id)}
        >
          <div className="pool-icon">{p.icon}</div>
          <div style={{ flex: 1 }}>
            <div className="pool-title">{p.title}</div>
            <div className="pool-sub">{p.sub}</div>
          </div>
          <div className="pool-check">{pool === p.id ? CHECK_SVG : null}</div>
        </div>
      ))}

      <button className="btn-gold" style={{ marginTop: 8 }} onClick={handleStart}>
        Start {mode === 'test' ? 'Test' : 'Study'} Mode →
      </button>
    </div>
  )
}
