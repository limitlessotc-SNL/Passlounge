/**
 * ConfidenceScreen
 *
 * Onboarding Step 2/4 — "How Are You Feeling About The NCLEX?"
 * Routes: /onboarding/confidence
 *
 * Owner: Junior Engineer 2
 */

import { useNavigate } from 'react-router-dom'

import { useStudentStore } from '@/store/studentStore'
import type { ConfidenceLevel } from '@/types'

interface ConfOption {
  level: ConfidenceLevel;
  emoji: string;
  label: string;
  sub: string;
  bg: string;
  border: string;
}

const OPTIONS: ConfOption[] = [
  { level: 'terrified', emoji: '😰', label: 'Terrified', sub: "I don't even know where to start", bg: 'rgba(248,113,113,0.12)', border: '#f87171' },
  { level: 'nervous', emoji: '😟', label: 'Nervous', sub: "I've studied but I'm not sure it's enough", bg: 'rgba(251,146,60,0.12)', border: '#fb923c' },
  { level: 'unsure', emoji: '🤔', label: 'Unsure', sub: 'Some topics I get — others not so much', bg: 'rgba(250,204,21,0.12)', border: '#facc15' },
  { level: 'confident', emoji: '😊', label: 'Confident', sub: "I'm putting in the work — feeling good", bg: 'rgba(74,222,128,0.12)', border: '#4ade80' },
  { level: 'ready', emoji: '💪', label: 'Ready To Dominate', sub: "Let's get it — I was born for this", bg: 'rgba(245,197,24,0.12)', border: '#F5C518' },
]

export function ConfidenceScreen() {
  const navigate = useNavigate()
  const confidence = useStudentStore((s) => s.confidence)
  const setConfidence = useStudentStore((s) => s.setConfidence)

  const handlePick = (level: ConfidenceLevel) => {
    setConfidence(level)
    setTimeout(() => navigate('/onboarding/testdate'), 320)
  }

  return (
    <div className="content">
      <div className="progress-wrap anim">
        <div className="progress-meta">
          <span>Step 2 Of 5</span>
          <span>40%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '40%' }} />
        </div>
      </div>

      <button className="back-btn anim" style={{ animationDelay: '0.05s' }} onClick={() => navigate('/onboarding')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="step-pill anim" style={{ animationDelay: '0.1s' }}>Step 2 Of 5</div>

      <div className="screen-title anim" style={{ animationDelay: '0.15s' }}>
        How Are You<br />Feeling About<br />The NCLEX?
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.2s' }}>Your answer helps us coach you properly.</div>

      {OPTIONS.map((opt, i) => (
        <div
          key={opt.level}
          className={`conf-row anim${confidence === opt.level ? ' selected' : ''}`}
          style={{
            animationDelay: `${0.25 + i * 0.05}s`,
            ...(confidence === opt.level ? { borderColor: opt.border, background: opt.bg } : {}),
          }}
          onClick={() => handlePick(opt.level)}
        >
          <div className="conf-icon" style={{ background: opt.bg }}>{opt.emoji}</div>
          <div>
            <div className="conf-label">{opt.label}</div>
            <div className="conf-sub">{opt.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
