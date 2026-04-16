/**
 * StudyTab
 *
 * Study screen with toggle between "Start Session" and "My Progress" views.
 * Matches the original HTML app-study.
 *
 * Owner: Junior Engineer 3
 */

import { useState } from 'react'

import { CardBankProgress } from '@/features/progress/components/CardBankProgress'
import { SessionHistory } from '@/features/progress/components/SessionHistory'
import { useDashboardStore } from '@/store/dashboardStore'

import { SessionSetup } from './SessionSetup'

type StudyView = 'start' | 'progress'

export function StudyTab() {
  const [view, setView] = useState<StudyView>('start')
  const { sessionHistory, seenCardTitles } = useDashboardStore()

  const seenCount = Object.keys(seenCardTitles).length
  const totalCards = 2000
  const reviewCount = sessionHistory.length > 0
    ? sessionHistory[sessionHistory.length - 1].wrong
    : 0

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
          <SessionHistory sessions={sessionHistory} />
        </div>
      )}
    </div>
  )
}
