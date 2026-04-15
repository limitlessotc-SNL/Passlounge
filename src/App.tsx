import { Navigate, Route, Routes } from 'react-router-dom'

import { ForgotScreen } from '@/features/auth/components/ForgotScreen'
import { LoginScreen } from '@/features/auth/components/LoginScreen'
import { SignupScreen } from '@/features/auth/components/SignupScreen'

/**
 * App.tsx — Root Router
 *
 * Defines all routes for PassLounge.
 * Auth routes, onboarding routes, and protected app routes.
 *
 * Owner: Senior Engineer
 */

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/forgot" element={<ForgotScreen />} />

        {/* Default redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App