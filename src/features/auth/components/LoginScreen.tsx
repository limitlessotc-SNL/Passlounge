/**
 * LoginScreen
 *
 * Email + password login form.
 * Routes: /login
 *
 * Owner: Junior Engineer 1
 */

import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function LoginScreen() {
  const { login, error, isSubmitting } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void login({ email, password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400">PassLounge</h1>
          <p className="mt-2 text-gray-400">Sign in to your account</p>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
              placeholder="••••••••"
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
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-400">
          <Link to="/forgot" className="text-yellow-400 hover:underline">
            Forgot password?
          </Link>
        </div>

        <div className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-yellow-400 hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
