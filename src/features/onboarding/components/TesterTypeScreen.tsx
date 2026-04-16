/**
 * TesterTypeScreen
 *
 * Onboarding Step 1/4 — "Is This Your First Time At The NCLEX?"
 * Routes: /onboarding
 *
 * Owner: Junior Engineer 2
 */

import { useNavigate } from 'react-router-dom'

import { useStudentStore } from '@/store/studentStore'

export function TesterTypeScreen() {
  const navigate = useNavigate()
  const nickname = useStudentStore((s) => s.nickname)
  const testerType = useStudentStore((s) => s.testerType)
  const setTesterType = useStudentStore((s) => s.setTesterType)

  const handlePick = (type: 'repeat' | 'first_time') => {
    setTesterType(type)
    setTimeout(() => navigate('/onboarding/confidence'), 320)
  }

  return (
    <div className="content">
      <div className="progress-wrap anim">
        <div className="progress-meta">
          <span>Step 1 Of 4</span>
          <span>25%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '25%' }} />
        </div>
      </div>

      <div className="step-pill anim" style={{ animationDelay: '0.05s' }}>Step 1 Of 4</div>

      <div className="screen-title anim" style={{ animationDelay: '0.1s' }}>
        Is This Your<br />First Time At<br />The NCLEX?
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.15s' }}>
        This shapes your entire experience,{' '}
        <span style={{ color: '#F5C518', fontWeight: 700 }}>
          Nurse {nickname || 'Nurse'}
        </span>
        .
      </div>

      <div
        className={`opt-card anim${testerType === 'repeat' ? ' selected' : ''}`}
        style={{ animationDelay: '0.2s' }}
        onClick={() => handlePick('repeat')}
      >
        <div className="opt-icon" style={{ background: 'rgba(245,197,24,0.1)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 11a7 7 0 1 1 7 7" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 11l2.5-2.5M4 11l2.5 2.5" stroke="#F5C518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="opt-title">Coming Back Stronger 🔥</div>
          <div className="opt-sub">I have tested before</div>
          <div className="opt-detail">Upload your Candidate Performance Report for a study plan built around your exact weak areas.</div>
        </div>
      </div>

      <div className="divider anim" style={{ animationDelay: '0.25s' }}>
        <div className="divider-line" />
        <div className="divider-text">OR</div>
        <div className="divider-line" />
      </div>

      <div
        className={`opt-card anim${testerType === 'first_time' ? ' selected' : ''}`}
        style={{ animationDelay: '0.3s' }}
        onClick={() => handlePick('first_time')}
      >
        <div className="opt-icon" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2l2.5 6.5H21l-5.5 4 2.5 6.5L11 15l-7 4 2.5-6.5L1 8.5h7.5z" fill="rgba(255,255,255,0.5)" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="opt-title">First Timer 🌟</div>
          <div className="opt-sub">Fresh out of nursing school and ready</div>
          <div className="opt-detail">Take our 15-question diagnostic to build your personalized study plan from scratch.</div>
        </div>
      </div>
    </div>
  )
}
