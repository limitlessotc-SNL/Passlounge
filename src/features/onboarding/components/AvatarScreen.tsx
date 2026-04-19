/**
 * AvatarScreen
 *
 * Onboarding Step 5/5 — "Pick Your Avatar"
 * Routes: /onboarding/avatar
 *
 * Owner: Junior Engineer 2
 */

import { useNavigate } from 'react-router-dom'

import { AVATAR_OPTIONS, getAvatarDisplay } from '@/config/avatars'
import { useStudentStore } from '@/store/studentStore'

export function AvatarScreen() {
  const navigate = useNavigate()
  const nickname = useStudentStore((s) => s.nickname)
  const avatar = useStudentStore((s) => s.avatar)
  const setAvatar = useStudentStore((s) => s.setAvatar)

  const previewGlyph = getAvatarDisplay(avatar, nickname)

  const handleContinue = () => {
    navigate('/onboarding/plan')
  }

  return (
    <div className="content">
      <div className="progress-wrap anim">
        <div className="progress-meta">
          <span>Step 5 Of 5</span>
          <span>100%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '100%' }} />
        </div>
      </div>

      <button
        className="back-btn anim"
        style={{ animationDelay: '0.05s' }}
        onClick={() => navigate('/onboarding/commitment')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="step-pill anim" style={{ animationDelay: '0.1s' }}>Step 5 Of 5</div>

      <div className="screen-title anim" style={{ animationDelay: '0.15s' }}>
        Pick Your<br />Avatar
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.2s' }}>
        This is how you&rsquo;ll show up in The Lounge.
      </div>

      {/* Live preview */}
      <div
        className="anim"
        style={{
          animationDelay: '0.22s',
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <div
          aria-label="Avatar preview"
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#053571,#0a4d99)',
            border: '3px solid rgba(245,197,24,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            fontWeight: 900,
            color: '#F5C518',
            boxShadow: '0 0 24px rgba(245,197,24,0.25)',
          }}
        >
          {previewGlyph}
        </div>
      </div>

      {/* Picker grid */}
      <div
        role="radiogroup"
        aria-label="Choose an avatar"
        className="anim"
        style={{
          animationDelay: '0.26s',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
          marginBottom: 20,
        }}
      >
        {AVATAR_OPTIONS.map((opt) => {
          const selected = avatar === opt.id
          const content = opt.emoji ?? (nickname || 'N').charAt(0).toUpperCase()
          return (
            <button
              key={opt.id || 'default'}
              role="radio"
              aria-checked={selected}
              aria-label={opt.label}
              type="button"
              onClick={() => setAvatar(opt.id)}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 12,
                background: selected ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.04)',
                border: selected ? '2px solid rgba(245,197,24,0.8)' : '1.5px solid rgba(255,255,255,0.08)',
                color: opt.emoji ? '#fff' : '#F5C518',
                fontSize: 24,
                fontWeight: 800,
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {content}
            </button>
          )
        })}
      </div>

      <button
        className="btn-gold anim"
        style={{ animationDelay: '0.3s' }}
        onClick={handleContinue}
        type="button"
      >
        Continue
      </button>
    </div>
  )
}
