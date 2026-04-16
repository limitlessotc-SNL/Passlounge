import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthGuard } from '@/components/guards/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'
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

/* ─── Placeholder screens (replaced in later phases) ──────────────────── */

function HomePlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">🏠</div>
      <div className="placeholder-title">Dashboard</div>
      <div className="placeholder-sub">Your study dashboard is coming in Phase 5.</div>
    </div>
  )
}

function StudyPlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">⚡</div>
      <div className="placeholder-title">Study</div>
      <div className="placeholder-sub">Session setup and progress tracking coming in Phase 6.</div>
    </div>
  )
}

function CATPlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">🐱</div>
      <div className="placeholder-title">CAT Mode</div>
      <div className="placeholder-sub">150-question NCLEX CAT simulation<br />coming soon.</div>
    </div>
  )
}

function CompetePlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">⚔️</div>
      <div className="placeholder-title">Compete</div>
      <div className="placeholder-sub">PvP Duels, Tournaments and Leaderboard<br />being built here.</div>
    </div>
  )
}

function LoungePlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">🏆</div>
      <div className="placeholder-title">The Lounge</div>
      <div className="placeholder-sub">Victory Wall, Study Squads and TikTok share<br />being built here.</div>
    </div>
  )
}

function ProfilePlaceholder() {
  return (
    <div className="placeholder-screen">
      <div className="placeholder-icon">👤</div>
      <div className="placeholder-title">Profile</div>
      <div className="placeholder-sub">Your profile and settings coming in Phase 6.</div>
    </div>
  )
}

function OnboardingPlaceholder() {
  return (
    <div className="content items-center" style={{ justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 52 }}>🎯</div>
      <div className="screen-title" style={{ marginTop: 16 }}>Onboarding</div>
      <div className="screen-sub">Coming in Phase 1.</div>
    </div>
  )
}

function App() {
  return (
    <div className="app-shell">
      <div className="orb orb1" />
      <div className="orb orb2" />
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/forgot" element={<ForgotScreen />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          {/* Onboarding (Phase 1 will replace this placeholder) */}
          <Route path="/onboarding" element={<OnboardingPlaceholder />} />

          {/* App routes with BottomNav */}
          <Route element={<AppLayout />}>
            <Route index element={<HomePlaceholder />} />
            <Route path="/study" element={<StudyPlaceholder />} />
            <Route path="/cat" element={<CATPlaceholder />} />
            <Route path="/compete" element={<CompetePlaceholder />} />
            <Route path="/lounge" element={<LoungePlaceholder />} />
            <Route path="/profile" element={<ProfilePlaceholder />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App
