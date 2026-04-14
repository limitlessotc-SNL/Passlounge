import { Routes, Route, Navigate } from 'react-router-dom'

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
        {/* Temporary placeholder — real routes added in Phase 1 */}
        <Route
          path="/"
          element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-yellow-400 mb-4">
                  PassLounge
                </h1>
                <p className="text-gray-400">
                  React app running on dev environment
                </p>
                <p className="text-green-400 text-sm mt-2">
                  ✅ Vite + React + TypeScript + Tailwind + Supabase
                </p>
              </div>
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App