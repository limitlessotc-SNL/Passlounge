/**
 * LoginScreen
 *
 * Email + password login form — exact PassLounge design.
 * Routes: /login
 *
 * Owner: Junior Engineer 1
 */

import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function LoginScreen() {
  const navigate = useNavigate()
  const { login, error, isSubmitting } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const success = await login({ email, password })
    if (success) {
      navigate('/')
    }
  }

  return (
    <div className="content items-center">
      {/* Logo */}
      <div className="fade-up fade-up-1" style={{ marginTop: 48 }}>
        <div className="logo-ring">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <circle cx="36" cy="36" r="34" fill="#053571" />
            <polygon
              points="36,10 48,30 36,50 24,30"
              fill="#F5C518"
              opacity="0.9"
            />
            <text
              x="36"
              y="44"
              textAnchor="middle"
              fill="#053571"
              fontSize="13"
              fontWeight="900"
              fontFamily="Outfit, sans-serif"
            >
              SNL
            </text>
          </svg>
        </div>
      </div>

      {/* Brand */}
      <div className="fade-up fade-up-2 text-center" style={{ marginTop: 18 }}>
        <div className="brand-tag">PassLounge</div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          Where Nurses Come To Pass
        </p>
      </div>

      {/* Title */}
      <h1 className="fade-up fade-up-3 screen-title text-center" style={{ marginTop: 32 }}>
        Welcome Back
      </h1>

      {/* Form */}
      <form onSubmit={(e) => void handleSubmit(e)} className="flex-col gap-14 w-full" style={{ marginTop: 28 }}>
        <div className="fade-up fade-up-4">
          <input
            id="login-email"
            type="email"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-input"
            placeholder="Email address"
          />
        </div>

        <div className="fade-up fade-up-5" style={{ marginTop: 14 }}>
          <input
            id="login-password"
            type="password"
            required
            disabled={isSubmitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-input"
            placeholder="Password"
          />
        </div>

        <div className="fade-up fade-up-5 justify-end" style={{ display: 'flex', marginTop: 10 }}>
          <Link to="/forgot" className="link-gold" style={{ fontSize: 13 }}>
            Forgot password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="err-msg" style={{ marginTop: 8 }}>
            {error.message}
          </p>
        )}

        <div className="fade-up fade-up-6" style={{ marginTop: 20 }}>
          <button type="submit" disabled={isSubmitting} className="btn-gold">
            {isSubmitting ? 'Signing in...' : 'Sign In \u2192'}
          </button>
        </div>
      </form>

      {/* Footer */}
      <div className="fade-up fade-up-7 mt-auto text-center" style={{ paddingTop: 32 }}>
        <p className="link-muted">
          Don&apos;t have an account?{' '}
          <Link to="/signup">
            <span>Create one free</span>
          </Link>
        </p>
        <p className="powered-by">Powered by Student Nurse Lounge</p>
      </div>
    </div>
  )
}
