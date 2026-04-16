/**
 * CommitmentScreen
 *
 * Onboarding Step 4/4 — "How Much Can You Commit Daily?"
 * Routes: /onboarding/commitment
 *
 * Owner: Junior Engineer 2
 */

import { useNavigate } from 'react-router-dom'

import { useStudentStore } from '@/store/studentStore'

import { useOnboarding } from '../hooks/useOnboarding'

interface CommitOption {
  cards: number;
  title: string;
  sub: string;
}

const OPTIONS: CommitOption[] = [
  { cards: 25, title: 'Busy But Committed', sub: '25 cards \u00b7 ~20 min \u00b7 Lots on my plate but I show up' },
  { cards: 35, title: 'Steady And Focused', sub: '35 cards \u00b7 ~25 min \u00b7 My sweet spot' },
  { cards: 50, title: 'All In', sub: "50 cards \u00b7 ~35 min \u00b7 I'm locking in and getting this done" },
]

export function CommitmentScreen() {
  const navigate = useNavigate()
  const dailyCards = useStudentStore((s) => s.dailyCards)
  const setDailyCards = useStudentStore((s) => s.setDailyCards)
  const { getProjectedDate } = useOnboarding()

  const handlePick = (cards: number) => {
    setDailyCards(cards)
    setTimeout(() => navigate('/onboarding/plan'), 320)
  }

  return (
    <div className="content">
      <div className="progress-wrap anim">
        <div className="progress-meta">
          <span>Step 4 Of 4</span>
          <span>100%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '100%' }} />
        </div>
      </div>

      <button className="back-btn anim" style={{ animationDelay: '0.05s' }} onClick={() => navigate('/onboarding/testdate')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="step-pill anim" style={{ animationDelay: '0.1s' }}>Step 4 Of 4</div>

      <div className="screen-title anim" style={{ animationDelay: '0.15s' }}>
        How Much Can<br />You Commit Daily?
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.2s' }}>
        Nurses are busy. Consistency beats intensity every time.
      </div>

      {OPTIONS.map((opt, i) => (
        <div
          key={opt.cards}
          className={`commit-card anim${dailyCards === opt.cards ? ' selected' : ''}`}
          style={{ animationDelay: `${0.25 + i * 0.06}s` }}
          onClick={() => handlePick(opt.cards)}
        >
          <div className="commit-title">{opt.title}</div>
          <div className="commit-sub">{opt.sub}</div>
          <div className="commit-proj">
            Test-ready by approx. {getProjectedDate(opt.cards)} ({Math.ceil(2000 / opt.cards)} days)
          </div>
        </div>
      ))}
    </div>
  )
}
