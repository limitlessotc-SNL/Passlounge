// src/features/session/components/NGNSessionScreen.tsx
//
// Phase 1 NGN session: a self-contained route that runs through a small
// pool of NGN cards (any of the 7 question types), keeps a HUD + nav,
// and persists a completed-session row to the existing sessions table
// using the `mode: 'ngn-test' | 'ngn-study'` flag and a JSONB snapshot.
//
// Why this lives separately (not inside CardScreen): Phase 1 ships the
// foundation without touching the core student flow. Phase 2 will fold
// NGN handling into CardScreen with discriminated-union branching.
//
// URL params:
//   /session/ngn-play              → defaults: study mode, 10 cards
//   /session/ngn-play?mode=test    → test mode (no per-card feedback)
//   /session/ngn-play?count=20     → 20 cards (capped at pool size)

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ExitModal } from '@/components/modals/ExitModal'
import { supabase } from '@/config/supabase'
import { fetchAllNGNCards } from '@/features/ngn/ngn.service'
import { NGNCardScreen } from '@/features/ngn/NGNCardScreen'
import type { NGNCard, NGNScoreResult } from '@/features/ngn/ngn.types'
import { trackEvent } from '@/services/analytics'
import { useAuthStore } from '@/store/authStore'

const GOLD = '#F5C518'
const GREEN = 'rgba(74,222,128,0.9)'
const RED   = 'rgba(248,113,113,0.9)'

type Mode = 'study' | 'test'

interface SessionState {
  cards: NGNCard[]
  /** NGNScoreResult | undefined per card index. */
  results: Array<NGNScoreResult | undefined>
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

export function NGNSessionScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const studentId = useAuthStore((s) => s.supaStudentId)

  const mode: Mode = params.get('mode') === 'test' ? 'test' : 'study'
  const requestedCount = Math.max(1, Math.min(50, Number(params.get('count')) || 10))

  const [phase, setPhase] = useState<'loading' | 'active' | 'complete' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionState>({ cards: [], results: [] })
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showExit, setShowExit] = useState(false)

  // ─── Load + start ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    setError(null)
    fetchAllNGNCards()
      .then(all => {
        if (cancelled) return
        if (all.length === 0) {
          setError('No NGN cards available yet. Check back after the admin authors some.')
          setPhase('error')
          return
        }
        const picked = shuffle(all).slice(0, Math.min(requestedCount, all.length))
        setSession({
          cards: picked,
          results: new Array(picked.length).fill(undefined),
        })
        setPhase('active')
        trackEvent('ngn_session_started', {
          mode,
          card_count: picked.length,
        })
      })
      .catch(e => {
        if (cancelled) return
        setError((e as Error).message)
        setPhase('error')
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedCount])

  const totalCards = session.cards.length
  const currentCard = session.cards[currentIdx] ?? null
  const currentResult = session.results[currentIdx]
  const answered = currentResult !== undefined

  // Aggregate stats
  const stats = useMemo(() => {
    let correct = 0
    let wrong = 0
    let pointsEarned = 0
    let pointsMax = 0
    for (const r of session.results) {
      if (!r) continue
      if (r.was_correct) correct++; else wrong++
      pointsEarned += r.points_earned
      pointsMax    += r.max_points
    }
    return { correct, wrong, pointsEarned, pointsMax }
  }, [session.results])

  const pct = totalCards > 0 ? Math.round(((currentIdx + 1) / totalCards) * 100) : 0

  // ─── Answer handling ────────────────────────────────────────────
  const handleAnswer = useCallback((result: NGNScoreResult) => {
    setSession(prev => {
      if (prev.results[currentIdx] !== undefined) return prev // already answered
      const next = [...prev.results]
      next[currentIdx] = result
      return { ...prev, results: next }
    })
    // In test mode auto-advance after a brief beat (lets the click animation settle).
    if (mode === 'test') {
      window.setTimeout(() => {
        setCurrentIdx(idx => {
          if (idx < totalCards - 1) return idx + 1
          completeSession()
          return idx
        })
      }, 400)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, mode, totalCards])

  // ─── Persistence ────────────────────────────────────────────────
  const completeSession = useCallback(async () => {
    setPhase('complete')

    // Use the latest results snapshot, not the closure copy.
    const finalState = session
    const correct = finalState.results.filter(r => r?.was_correct).length
    const wrong   = finalState.results.length - correct
    const total   = finalState.cards.length
    const pctScore = total > 0 ? Math.round((correct / total) * 100) : 0

    const cats: Record<string, true> = {}
    for (const c of finalState.cards) cats[c.nclex_category] = true
    const categoryList = Object.keys(cats).join(', ')

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const now = new Date()
    const dateStr = `${months[now.getMonth()]} ${now.getDate()}`

    trackEvent('ngn_session_completed', {
      mode, correct_count: correct, total_count: total, pct: pctScore,
    })

    if (!studentId) return

    // Fire-and-forget persistence. Mode tagged ngn-* so the existing
    // history reader can branch on it later (Phase 2). Snapshot stores
    // NGN cards and NGNScoreResult-shaped results in the same JSONB
    // column the traditional flow uses.
    void supabase.from('sessions').insert({
      student_id: studentId,
      name: `NGN ${mode === 'test' ? 'Test' : 'Study'} session`,
      mode: `ngn-${mode}`,
      card_count: total,
      correct,
      wrong,
      xp: 50 + correct * 25,
      completed: true,
      date: dateStr,
      categories: categoryList,
      snapshot: {
        kind: 'ngn',
        cards: finalState.cards,
        results: finalState.results,
        pct: pctScore,
      },
    }).then(({ error: e }) => {
      if (e) console.warn('[ngn-session] save failed:', e.message)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, mode, studentId])

  const handleNext = useCallback(() => {
    if (currentIdx < totalCards - 1) {
      setCurrentIdx(currentIdx + 1)
    } else {
      void completeSession()
    }
  }, [currentIdx, totalCards, completeSession])

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1)
  }, [currentIdx])

  // ─── Render ─────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div data-testid="ngn-session-loading" style={containerStyle}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, padding: 24 }}>
          Loading NGN cards…
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div data-testid="ngn-session-error" style={containerStyle}>
        <div style={emptyBoxStyle}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            {error ?? 'Could not load this session.'}
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={primaryBtnStyle}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div data-testid="ngn-session-complete" style={containerStyle}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center' as const,
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>
            Session complete
          </h1>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            margin: '14px 0',
          }}>
            <Stat label="Correct"        value={`${stats.correct} / ${totalCards}`} tone={GREEN} />
            <Stat label="Points"         value={`${stats.pointsEarned} / ${stats.pointsMax}`} tone={GOLD} />
            <Stat label="Accuracy"       value={`${totalCards > 0 ? Math.round((stats.correct / totalCards) * 100) : 0}%`} />
            <Stat label="XP earned"      value={`+${50 + stats.correct * 25}`} tone={GOLD} />
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={primaryBtnStyle}
            data-testid="ngn-session-home-btn"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  // active
  if (!currentCard) return null

  return (
    <div data-testid="ngn-session-screen" style={containerStyle}>
      {/* Top nav row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
      }}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIdx === 0}
          aria-label="Previous card"
          style={navBtnStyle(currentIdx > 0)}
        >‹</button>
        <span style={{
          fontSize: 13, color: 'rgba(255,255,255,0.55)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {currentIdx + 1} / {totalCards}
        </span>
        <button
          type="button"
          onClick={handleNext}
          disabled={!answered}
          aria-label="Next card"
          style={navBtnStyle(answered)}
        >›</button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setShowExit(true)}
          aria-label="Exit session"
          data-testid="ngn-session-exit-btn"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.6)',
            padding: '4px 10px',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Exit
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        marginBottom: 8,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: GOLD,
          transition: 'width 200ms ease',
        }} />
      </div>

      {/* HUD — study mode only (matches CardScreen behavior). */}
      {mode === 'study' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 6,
          marginBottom: 6,
          fontSize: 12,
          color: 'rgba(255,255,255,0.6)',
        }}>
          <span style={{ color: GREEN }}>✓ {stats.correct}</span>
          <span style={{ color: RED   }}>✗ {stats.wrong}</span>
          <span>📊 {stats.pointsEarned} / {stats.pointsMax} pts</span>
        </div>
      )}

      {/* Card body — NGNCardScreen owns the question/answer/rationale UX
          and emits a single NGNScoreResult on submit. We key on currentIdx
          so the inner state resets cleanly when the student navigates. */}
      <NGNCardScreen
        key={currentCard.id ?? currentIdx}
        card={currentCard}
        mode={mode}
        onAnswer={handleAnswer}
      />

      {/* Study-mode "Next" button after answering (test mode auto-advances) */}
      {mode === 'study' && answered && (
        <button
          type="button"
          onClick={handleNext}
          data-testid="ngn-session-next-btn"
          style={{
            ...primaryBtnStyle,
            marginTop: 12,
          }}
        >
          {currentIdx < totalCards - 1 ? 'Next card →' : 'Finish session'}
        </button>
      )}

      <ExitModal
        visible={showExit}
        onCancel={() => setShowExit(false)}
        onConfirm={() => { setShowExit(false); navigate('/') }}
      />
    </div>
  )
}

// ─── Sub-components / styles ────────────────────────────────────────

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10,
      padding: 10,
    }}>
      <div style={{
        fontSize: 18, fontWeight: 800, color: tone ?? '#fff',
        fontVariantNumeric: 'tabular-nums' as const,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase' as const, letterSpacing: 1,
        color: 'rgba(255,255,255,0.45)',
        marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  padding: '16px 16px 80px',
  color: '#fff',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  minHeight: '100dvh',
}

const emptyBoxStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px dashed rgba(255,255,255,0.15)',
  borderRadius: 14,
  padding: 24,
  textAlign: 'center' as const,
}

const primaryBtnStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '12px 18px',
  borderRadius: 12,
  background: GOLD,
  color: '#053571',
  border: 'none',
  fontSize: 14,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
  width: '100%',
}

function navBtnStyle(active: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: active ? '#fff' : 'rgba(255,255,255,0.25)',
    fontSize: 18,
    cursor: active ? 'pointer' : 'default',
    opacity: active ? 1 : 0.45,
    fontFamily: "'Outfit', sans-serif",
  }
}
