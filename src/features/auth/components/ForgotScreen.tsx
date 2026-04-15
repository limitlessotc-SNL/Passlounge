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
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400">PassLounge</h1>
          <p className="mt-2 text-gray-400">Reset your password</p>
        </div>

        {resetSent ? (
          <div className="space-y-4 text-center">
            <p className="text-green-400">
              Check your email for a password reset link.
            </p>
            <Link
              to="/login"
              className="inline-block text-sm text-yellow-400 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-400">
                  {error.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-yellow-400 py-2 font-semibold text-gray-900 hover:bg-yellow-300 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="text-center text-sm text-gray-400">
              <Link to="/login" className="text-yellow-400 hover:underline">
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
