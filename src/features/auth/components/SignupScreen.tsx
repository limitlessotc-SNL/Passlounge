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
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400">PassLounge</h1>
          <p className="mt-2 text-gray-400">Create your account</p>
        </div>

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

          <div>
            <label htmlFor="password" className="block text-sm text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm text-gray-300">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {mismatch && (
            <p role="alert" className="text-sm text-red-400">
              Passwords do not match
            </p>
          )}

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
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-yellow-400 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
