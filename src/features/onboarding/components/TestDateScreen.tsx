/**
 * TestDateScreen
 *
 * Onboarding Step 3/4 — "When's Test Day?"
 * Routes: /onboarding/testdate
 *
 * Owner: Junior Engineer 2
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useStudentStore } from '@/store/studentStore'

import { useOnboarding } from '../hooks/useOnboarding'

export function TestDateScreen() {
  const navigate = useNavigate()
  const nickname = useStudentStore((s) => s.nickname)
  const setTestDate = useStudentStore((s) => s.setTestDate)
  const testDays = useStudentStore((s) => s.testDays)
  const { getCountdownDays } = useOnboarding()
  const [dateValue, setDateValue] = useState('')
  const [showCountdown, setShowCountdown] = useState(false)

  const handleDateChange = (value: string) => {
    setDateValue(value)
    if (value) {
      const days = getCountdownDays(value)
      if (days > 0) {
        setTestDate(value, days)
        setShowCountdown(true)
      }
    }
  }

  return (
    <div className="content">
      <div className="progress-wrap anim">
        <div className="progress-meta">
          <span>Step 3 Of 5</span>
          <span>60%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '60%' }} />
        </div>
      </div>

      <button className="back-btn anim" style={{ animationDelay: '0.05s' }} onClick={() => navigate('/onboarding/confidence')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="step-pill anim" style={{ animationDelay: '0.1s' }}>Step 3 Of 5</div>

      <div className="screen-title anim" style={{ animationDelay: '0.15s' }}>
        When&apos;s Test<br />Day,{' '}
        <span style={{ color: '#F5C518' }}>{nickname || 'Nurse'}</span>?
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.2s' }}>
        Enter your date — we activate your countdown clock immediately.
      </div>

      <div className="anim" style={{ animationDelay: '0.25s' }}>
        <input
          type="date"
          className="pl-input"
          value={dateValue}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>

      {showCountdown && testDays > 0 && (
        <div className="cd-box anim" style={{ animationDelay: '0.3s' }}>
          <div className="cd-label">Your Countdown Is Live 🔥</div>
          <div className="cd-val">{testDays} days</div>
          <div className="cd-sub">until The NCLEX</div>
        </div>
      )}

      <div className="anim" style={{ animationDelay: '0.35s' }}>
        <button className="btn-gold" onClick={() => navigate('/onboarding/commitment')}>
          Lock It In → Let&apos;s Get To Work
        </button>
        <button className="btn-ghost" onClick={() => navigate('/onboarding/commitment')}>
          I don&apos;t have a date yet
        </button>
      </div>
    </div>
  )
}
