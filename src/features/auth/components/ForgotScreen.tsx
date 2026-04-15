/**
 * ForgotScreen
 *
 * Password reset request — exact PassLounge design.
 * Routes: /forgot
 *
 * Owner: Junior Engineer 1
 */

import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function ForgotScreen() {
  const navigate = useNavigate()
  const { forgotPassword, error, isSubmitting, resetSent } = useAuth()
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await forgotPassword(email)
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

      {/* Title */}
      <h1 className="fade-up fade-up-2 screen-title" style={{ marginTop: 8 }}>
        Reset Password
      </h1>
      <p className="fade-up fade-up-2 screen-sub">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {/* Form */}
      <form onSubmit={(e) => void handleSubmit(e)} className="flex-col w-full" style={{ marginTop: 28 }}>
        <div className="fade-up fade-up-3">
          <input
            id="forgot-email"
            type="email"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-input"
            placeholder="Email address"
          />
        </div>

        {resetSent && (
          <p className="success-msg" style={{ marginTop: 14 }}>
            Check your email for a password reset link.
          </p>
        )}

        {error && (
          <p role="alert" className="err-msg" style={{ marginTop: 14 }}>
            {error.message}
          </p>
        )}

        <div className="fade-up fade-up-4" style={{ marginTop: 24 }}>
          <button type="submit" disabled={isSubmitting} className="btn-gold">
            {isSubmitting ? 'Sending...' : 'Send Reset Link \u2192'}
          </button>
        </div>
      </form>
    </div>
  )
}
