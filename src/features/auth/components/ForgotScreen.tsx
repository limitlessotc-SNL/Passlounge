/**
 * ForgotScreen
 *
 * Password reset request form.
 * Routes: /forgot
 *
 * Owner: Junior Engineer 1
 */

import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function ForgotScreen() {
  const { forgotPassword, error, isSubmitting, resetSent } = useAuth()
  const [email, setEmail] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void forgotPassword(email)
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
            Reset your password
          </h2>

          {resetSent ? (
            <div className="space-y-5 text-center">
              <div className="rounded-lg bg-green-900/30 px-4 py-3">
                <p className="text-sm text-green-400">
                  Check your email for a password reset link.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-block text-sm font-medium text-gold-400 transition hover:text-gold-300 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-5 text-center text-sm text-slate-400">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

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
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm font-medium text-gold-400 transition hover:text-gold-300 hover:underline">
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
