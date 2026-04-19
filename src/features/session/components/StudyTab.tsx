/**
 * StudyTab
 *
 * Study screen with toggle between "Start Session" and "My Progress" views.
 * Matches the original HTML app-study.
 *
 * Owner: Junior Engineer 3
 */

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CardBankProgress } from '@/features/progress/components/CardBankProgress'
import { SessionHistory } from '@/features/progress/components/SessionHistory'
import { useDashboardStore } from '@/store/dashboardStore'
import { useSessionStore } from '@/store/sessionStore'

import { SessionSetup } from './SessionSetup'

type StudyView = 'start' | 'progress'

export function StudyTab() {
  const navigate = useNavigate()
  const [view, setView] = useState<StudyView>('start')
  const { sessionHistory, seenCardTitles } = useDashboardStore()

  const seenCount = Object.keys(seenCardTitles).length
  const totalCards = 2000
  const reviewCount = sessionHistory.length > 0
    ? sessionHistory[sessionHistory.length - 1].wrong
    : 0

  /**
   * Load a past session into sessionStore and navigate to review screen.
   * Restores cards, results, answers, shuffles so ReviewScreen can display it.
   */
  const handleReview = useCallback(
    (sessionIdx: number) => {
      const sess = sessionHistory[sessionIdx]
      if (!sess || sess.cards.length === 0) return

      // Restore the session state
      useSessionStore.setState({
        cards: sess.cards,
        results: sess.results,
        answers: sess.answers,
        shuffles: sess.shuffles,
        mode: sess.mode,
        correctCount: sess.correct,
        wrongCount: sess.wrong,
        xp: 50 + sess.correct * 20,
        currentIdx: 0,
        isActive: false,
        isDiagnostic: false,
        sessionName: sess.name,
      })
      navigate('/session/review')
    },
    [sessionHistory, navigate],
  )

  return (
    <div style={{ paddingTop: 24 }}>
      <div className="anim" style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 14 }}>
        Study
      </div>

      {/* Toggle */}
      <div className="study-toggle anim" style={{ animationDelay: '0.05s' }}>
        <button
          className={`study-tog ${view === 'start' ? 'active' : 'inactive'}`}
          onClick={() => setView('start')}
        >
          Start Session
        </button>
        <button
          className={`study-tog ${view === 'progress' ? 'active' : 'inactive'}`}
          onClick={() => setView('progress')}
        >
          My Progress
        </button>
      </div>

      {/* Views */}
      {view === 'start' && (
        <div className="anim" style={{ animationDelay: '0.1s' }}>
          <SessionSetup />
        </div>
      )}

      {view === 'progress' && (
        <div className="anim" style={{ animationDelay: '0.1s' }}>
          <CardBankProgress
            totalCards={totalCards}
            seenCount={seenCount}
            reviewCount={reviewCount}
          />
          <SessionHistory sessions={sessionHistory} onReview={handleReview} />
        </div>
      )}
    </div>
  )
}
