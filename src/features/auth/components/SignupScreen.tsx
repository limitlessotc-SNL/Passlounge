/**
 * SignupScreen
 *
 * Email + password registration form.
 * Routes: /signup
 *
 * Owner: Junior Engineer 1
 */

import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function SignupScreen() {
  const { signup, error, isSubmitting } = useAuth()
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gold-400">
            PassLounge
          </h1>
          <p className="mt-1 text-sm tracking-wide text-slate-400">
            NCLEX Prep — Built for Nurses
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-navy-700/50 bg-navy-900 p-8 shadow-xl">
          <h2 className="mb-6 text-center text-xl font-semibold text-white">
            Create your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400 focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-gold-400 focus:ring-1 focus:ring-gold-400 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            {mismatch && (
              <p role="alert" className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
                Passwords do not match
              </p>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
                {error.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gold-400 py-3 text-sm font-bold tracking-wide text-navy-950 transition hover:bg-gold-300 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-gold-400 transition hover:text-gold-300 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
