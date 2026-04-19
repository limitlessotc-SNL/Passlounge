/**
 * SessionSetup
 *
 * Session configuration: mode toggle, question count, card pool selector.
 * Matches the original HTML study-start-view.
 *
 * Owner: Junior Engineer 3
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SessionNameModal } from '@/components/modals/SessionNameModal'
import { fetchStudyCards } from '@/features/session/services/cards.service'
import { useDashboardStore } from '@/store/dashboardStore'
import { useSessionStore } from '@/store/sessionStore'
import type { SessionPool, StudyCard } from '@/types'

const CHECK_SVG = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 5l2.5 2.5L8 2" stroke="#053571" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Q_COUNTS = [10, 20, 30] as const

interface PoolOption {
  id: SessionPool;
  icon: string;
  title: string;
  sub: string;
}

const POOLS: PoolOption[] = [
  { id: 'all', icon: '🎯', title: 'All Cards', sub: 'Seen and unseen — full mix' },
  { id: 'new', icon: '🆕', title: 'New Cards Only', sub: 'Only cards you have never seen' },
  { id: 'missed', icon: '❌', title: 'Missed Cards Only', sub: 'Cards you got wrong in past sessions' },
]

/**
 * Builds the session card pool based on selected filter.
 * all: everything, new: never-seen, missed: previously wrong.
 */
function filterCardPool(
  cards: StudyCard[],
  poolType: SessionPool,
  seenTitles: Record<string, boolean>,
  missedTitles: Record<string, boolean>,
): StudyCard[] {
  if (poolType === 'new') {
    const unseen = cards.filter((c) => !seenTitles[c.title])
    return unseen.length > 0 ? unseen : cards
  }
  if (poolType === 'missed') {
    const missed = cards.filter((c) => missedTitles[c.title])
    return missed.length > 0 ? missed : cards
  }
  return cards
}

/** Fisher-Yates shuffle (pure, non-mutating). */
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

export function SessionSetup() {
  const navigate = useNavigate()
  const { mode, pool, qCount, setMode, setPool, setQCount, setSessionName, startSession } = useSessionStore()
  const seenTitles = useDashboardStore((s) => s.seenCardTitles)
  const sessionHistory = useDashboardStore((s) => s.sessionHistory)
  const [showCustom, setShowCustom] = useState(false)
  const [customVal, setCustomVal] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleQCount = (val: number | 'custom') => {
    if (val === 'custom') {
      setShowCustom(true)
    } else {
      setShowCustom(false)
      setQCount(val)
    }
  }

  const handleCustomChange = (v: string) => {
    setCustomVal(v)
    const max = mode === 'study' ? 30 : 75
    const num = Math.min(Math.max(parseInt(v) || 1, 1), max)
    setQCount(num)
  }

  const handleStart = () => {
    setShowNameModal(true)
  }

  const handleNameConfirm = async (name: string) => {
    setSessionName(name)
    setShowNameModal(false)
    setLoading(true)
    setError(null)

    try {
      // 1. Load all study cards (Supabase with hardcoded fallback)
      const allCards = await fetchStudyCards()

      if (allCards.length === 0) {
        setError('No cards available. Please try again.')
        setLoading(false)
        return
      }

      // 2. Build missed-card map from session history
      const missedTitles: Record<string, boolean> = {}
      for (const sess of sessionHistory) {
        sess.cards.forEach((card, idx) => {
          if (sess.results[idx] === false) missedTitles[card.title] = true
        })
      }

      // 3. Apply pool filter + shuffle + count limit
      const filtered = filterCardPool(allCards, pool, seenTitles, missedTitles)
      const shuffled = shuffleArray(filtered)
      const count = Math.min(qCount, shuffled.length)
      const sessionCards = shuffled.slice(0, count)

      if (sessionCards.length === 0) {
        setError('No cards match the selected filter.')
        setLoading(false)
        return
      }

      // 4. Start the session with loaded cards
      startSession(sessionCards, false)
      setLoading(false)
      navigate('/session/play')
    } catch {
      setError('Failed to load cards. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Step 1: Mode */}
      <div className="setup-section-lbl">Step 1 — Mode</div>

      <div
        className={`mode-card${mode === 'test' ? ' selected' : ''}`}
        onClick={() => setMode('test')}
      >
        <div className="mode-check">{mode === 'test' ? CHECK_SVG : null}</div>
        <div className="mode-icon-wrap" style={{ background: 'rgba(245,197,24,0.1)' }}>🎯</div>
        <div className="mode-title">Test Mode</div>
        <div className="mode-sub">Fast answers, no framework — NCLEX style.</div>
        <div className="mode-tags">
          <span className="mode-tag mode-tag-gold">Fast Paced</span>
          <span className="mode-tag mode-tag-gold">No CCCC</span>
        </div>
      </div>

      <div
        className={`mode-card${mode === 'study' ? ' selected' : ''}`}
        onClick={() => setMode('study')}
      >
        <div className="mode-check">{mode === 'study' ? CHECK_SVG : null}</div>
        <div className="mode-icon-wrap" style={{ background: 'rgba(96,165,250,0.1)' }}>📖</div>
        <div className="mode-title">Study Mode</div>
        <div className="mode-sub">Full SNL Method after every card.</div>
        <div className="mode-tags">
          <span className="mode-tag mode-tag-blue">Full CCCC</span>
          <span className="mode-tag mode-tag-blue">Coach&apos;s Pearl</span>
        </div>
      </div>

      {/* Step 2: Question Count */}
      <div className="setup-section-lbl" style={{ marginTop: 6 }}>Step 2 — Questions</div>
      <div className="q-count-row">
        {Q_COUNTS.map((n) => (
          <button
            key={n}
            className={`q-count-btn${qCount === n && !showCustom ? ' selected' : ''}`}
            onClick={() => handleQCount(n)}
          >
            {n}
          </button>
        ))}
        <button
          className={`q-count-btn${showCustom ? ' selected' : ''}`}
          onClick={() => handleQCount('custom')}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="custom-input-wrap" style={{ display: 'block' }}>
          <input
            className="custom-q-input"
            type="number"
            min={1}
            max={mode === 'study' ? 30 : 75}
            placeholder="Enter number..."
            value={customVal}
            onChange={(e) => handleCustomChange(e.target.value)}
          />
        </div>
      )}

      <div className="session-limit-note">
        Max {mode === 'study' ? 30 : 75} for {mode === 'study' ? 'Study' : 'Test'} Mode
      </div>

      {/* Step 3: Card Pool */}
      <div className="setup-section-lbl">Step 3 — Card Pool</div>
      {POOLS.map((p) => (
        <div
          key={p.id}
          className={`pool-card${pool === p.id ? ' selected' : ''}`}
          onClick={() => setPool(p.id)}
        >
          <div className="pool-icon">{p.icon}</div>
          <div style={{ flex: 1 }}>
            <div className="pool-title">{p.title}</div>
            <div className="pool-sub">{p.sub}</div>
          </div>
          <div className="pool-check">{pool === p.id ? CHECK_SVG : null}</div>
        </div>
      ))}

      <button
        className="btn-gold"
        style={{ marginTop: 8 }}
        onClick={handleStart}
        disabled={loading}
      >
        {loading ? 'Loading cards...' : `Start ${mode === 'test' ? 'Test' : 'Study'} Mode →`}
      </button>

      {error && (
        <p className="err-msg" style={{ marginTop: 10 }}>{error}</p>
      )}

      <SessionNameModal
        visible={showNameModal}
        onStart={handleNameConfirm}
        onCancel={() => setShowNameModal(false)}
      />
    </div>
  )
}
