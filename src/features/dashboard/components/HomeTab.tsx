/**
 * HomeTab
 *
 * Main dashboard screen — greeting, CAT score, stats, strengths/weaknesses,
 * today's focus, and start session button. Matches original HTML app-home.
 *
 * Owner: Junior Engineer 5
 */

import { useNavigate } from 'react-router-dom'

import { getCategoryBreakdown, getDiagnosticGrade } from '@/config/diagnostic-cards'
import { useDashboardStore } from '@/store/dashboardStore'
import { useSessionStore } from '@/store/sessionStore'
import { useStudentStore } from '@/store/studentStore'

import { CATScoreCard } from './CATScoreCard'
import { StatsGrid } from './StatsGrid'
import { StrengthsWeaknesses } from './StrengthsWeaknesses'
import { TodaysFocus } from './TodaysFocus'

export function HomeTab() {
  const navigate = useNavigate()
  const nickname = useStudentStore((s) => s.nickname)
  const { diagnosticResult, plStats, streakDays } = useDashboardStore()

  const completed = diagnosticResult.completed
  const pct = completed && diagnosticResult.total > 0
    ? Math.round((diagnosticResult.correct / diagnosticResult.total) * 100)
    : 0
  const grade = getDiagnosticGrade(pct)

  const breakdown = completed
    ? getCategoryBreakdown(
        useSessionStore.getState().cards.length > 0 ? useSessionStore.getState().cards : [],
        diagnosticResult.results,
      )
    : []

  const swCategories = breakdown.map((b) => ({ cat: b.cat, pct: b.pct, icon: b.icon }))
  const focusCategories = breakdown.map((b) => ({ cat: b.cat, correct: b.correct, total: b.total, pct: b.pct }))

  const handleStartSession = () => {
    if (!completed) {
      navigate('/diagnostic/info')
    } else {
      navigate('/session/mode')
    }
  }

  return (
    <div style={{ paddingTop: 20 }}>
      {/* Top bar */}
      <div className="dash-top anim">
        <div className="dash-greeting">
          Hey, <span>{nickname ? `Nurse ${nickname}` : 'Nurse'}</span> 👋
        </div>
        <div className="streak-pill">🔥 {streakDays} day streak</div>
      </div>

      {/* CAT Score Card */}
      <div className="anim" style={{ animationDelay: '0.05s' }}>
        <CATScoreCard
          catLevel={completed ? grade.catLevel : '—'}
          catLabel={completed ? grade.catLabel : ''}
          catSub={completed ? grade.catSub : ''}
          completed={completed}
        />
      </div>

      {/* Stats Grid */}
      <div className="anim" style={{ animationDelay: '0.1s' }}>
        <StatsGrid
          cardsStudied={plStats.cards}
          accuracy={completed ? `${pct}%` : '—'}
          xpEarned={plStats.xp}
          sessionsDone={plStats.sessions}
        />
      </div>

      {/* Strengths & Weaknesses */}
      <div className="anim" style={{ animationDelay: '0.15s' }}>
        <StrengthsWeaknesses categories={swCategories} completed={completed} />
      </div>

      {/* Today's Focus */}
      <div className="anim" style={{ animationDelay: '0.2s' }}>
        <TodaysFocus categories={focusCategories} completed={completed} />
      </div>

      {/* View Diagnostic Results */}
      {completed && (
        <div className="anim" style={{ animationDelay: '0.25s' }}>
          <button className="diag-review-btn" onClick={() => navigate('/diagnostic/results')}>
            📋 View My Diagnostic Results
          </button>
        </div>
      )}

      {/* Start Session */}
      <div className="anim" style={{ animationDelay: '0.3s' }}>
        <button className="dash-start-btn" onClick={handleStartSession}>
          {completed ? 'Start Session ⚡' : 'Start Diagnostic ⚡'}
        </button>
      </div>
    </div>
  )
}
