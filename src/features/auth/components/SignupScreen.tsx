/**
 * SignupScreen
 *
 * Registration form — exact PassLounge design.
 * Routes: /signup
 *
 * Owner: Junior Engineer 1
 */

import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function SignupScreen() {
  const navigate = useNavigate()
  const { signup, error, isSubmitting } = useAuth()
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [mismatch, setMismatch] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    void signup({ email, password })
  }

  return (
    <div className="content">
      {/* Back button */}
      <button
        type="button"
        className="back-btn fade-up fade-up-1"
        onClick={() => navigate('/login')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      {/* User icon */}
      <div className="fade-up fade-up-2 items-center" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="user-icon-circle">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(245,197,24,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="fade-up fade-up-3 screen-title" style={{ marginTop: 20 }}>
        Create Your Account
      </h1>
      <p className="fade-up fade-up-3 screen-sub">
        Free access. Your progress saves forever.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-col w-full" style={{ marginTop: 24 }}>
        <div className="fade-up fade-up-4">
          <input
            id="signup-nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="pl-input"
            placeholder="Nickname (optional)"
          />
        </div>

        <div className="fade-up fade-up-5" style={{ marginTop: 14 }}>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-input"
            placeholder="Email address"
          />
        </div>

        <div className="fade-up fade-up-6" style={{ marginTop: 14 }}>
          <input
            id="signup-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-input"
            placeholder="Password"
          />
        </div>

        <div className="fade-up fade-up-7" style={{ marginTop: 14 }}>
          <input
            id="signup-confirm"
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="pl-input"
            placeholder="Confirm password"
          />
        </div>

        {mismatch && (
          <p role="alert" className="err-msg" style={{ marginTop: 12 }}>
            Passwords do not match
          </p>
        )}

        {error && (
          <p role="alert" className="err-msg" style={{ marginTop: 12 }}>
            {error.message}
          </p>
        )}

        <div className="fade-up fade-up-8" style={{ marginTop: 24 }}>
          <button type="submit" disabled={isSubmitting} className="btn-gold">
            {isSubmitting ? 'Creating account...' : 'Create Account \u2192'}
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="fade-up fade-up-9 mt-auto text-center" style={{ paddingTop: 24 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>
          By signing up you agree to our terms.
          <br />
          No spam. No credit card.
        </p>
        <p className="link-muted" style={{ marginTop: 14 }}>
          Already have an account?{' '}
          <Link to="/login">
            <span>Sign in</span>
          </Link>
        </p>
      </div>
    </div>
  )
}
