/**
 * AnswerAnimations
 *
 * Renders the "epic" answer feedback animations from the original HTML:
 * - Correct: rings expand, confetti burst, XP score popup, toast
 * - Wrong: overlay flash, red rings, shake, toast
 * - Streak: fire emojis float up, streak counter popup
 * - Milestone: blue celebration at halfway point
 *
 * Driven by the `type` prop — parent sets it and auto-clears after timeout.
 *
 * Owner: Senior Engineer
 */

import { useEffect, useState } from 'react'

export type AnimationType = 'correct' | 'wrong' | 'streak' | 'milestone' | null

interface AnswerAnimationsProps {
  type: AnimationType;
  xp?: number;
  streakCount?: number;
  currentCard?: number;
  totalCards?: number;
  onComplete?: () => void;
}

interface ConfettiPiece {
  id: number;
  color: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
}

const CORRECT_COLORS = ['#4ade80', '#F5C518', '#60a5fa', '#f87171', '#a78bfa', '#34d399']
const MILESTONE_COLORS = ['#60a5fa', '#a78bfa', '#F5C518', '#4ade80']

function generateConfetti(colors: string[], count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: -60 + Math.random() * 120,
    size: 5 + Math.random() * 7,
    duration: 0.5 + Math.random() * 0.7,
    delay: Math.random() * 0.25,
  }))
}

export function AnswerAnimations({
  type,
  xp = 0,
  streakCount = 0,
  currentCard = 0,
  totalCards = 0,
  onComplete,
}: AnswerAnimationsProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (!type) return

    if (type === 'correct') {
      setConfetti(generateConfetti(CORRECT_COLORS, 30))
    } else if (type === 'milestone') {
      setConfetti(generateConfetti(MILESTONE_COLORS, 22))
    } else {
      setConfetti([])
    }

    const timer = setTimeout(() => {
      onComplete?.()
    }, 1500)

    return () => clearTimeout(timer)
  }, [type, onComplete])

  if (!type) return null

  const centerStyle = {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  }

  return (
    <>
      {/* Correct animation */}
      {type === 'correct' && (
        <>
          {/* Overlay flash */}
          <div
            className="anim-overlay"
            style={{
              inset: 0,
              background: 'rgba(74,222,128,0.15)',
              borderRadius: 20,
            }}
            data-testid="overlay-correct"
          />
          {/* Expanding rings */}
          <div
            className="anim-ring"
            style={{ ...centerStyle, width: 70, height: 70, border: '3px solid rgba(245,197,24,0.8)' }}
            data-testid="ring-gold"
          />
          <div
            className="anim-ring"
            style={{ ...centerStyle, width: 70, height: 70, border: '3px solid rgba(74,222,128,0.5)', animationDelay: '0.15s' }}
            data-testid="ring-green"
          />
          {/* Confetti burst */}
          {confetti.map((c) => (
            <div
              key={c.id}
              className="anim-conf"
              style={{
                left: `calc(50% + ${c.left}px)`,
                top: '45%',
                width: c.size,
                height: c.size,
                background: c.color,
                animationDuration: `${c.duration}s`,
                animationDelay: `${c.delay}s`,
              }}
            />
          ))}
          {/* Score popup */}
          <div className="anim-epic-score" style={centerStyle} data-testid="score-popup">
            <div style={{ fontSize: 38, fontWeight: 900, color: '#F5C518', lineHeight: 1, fontFamily: "'Outfit',sans-serif" }}>
              +{xp}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(245,197,24,0.6)', textTransform: 'uppercase' as const, letterSpacing: 2, fontFamily: "'Outfit',sans-serif" }}>
              XP Earned
            </div>
          </div>
          {/* Toast */}
          <div
            className="anim-epic-toast"
            style={{
              left: '50%',
              bottom: 120,
              background: 'linear-gradient(135deg,rgba(245,197,24,0.2),rgba(74,222,128,0.15))',
              border: '2px solid rgba(245,197,24,0.4)',
              color: '#F5C518',
            }}
            data-testid="toast-correct"
          >
            🔥 Nailed it!
          </div>
        </>
      )}

      {/* Wrong animation */}
      {type === 'wrong' && (
        <>
          <div
            className="anim-overlay"
            style={{
              inset: 0,
              background: 'rgba(248,113,113,0.2)',
              borderRadius: 20,
            }}
            data-testid="overlay-wrong"
          />
          <div
            className="anim-ring"
            style={{ ...centerStyle, width: 70, height: 70, border: '3px solid rgba(248,113,113,0.7)' }}
            data-testid="ring-red"
          />
          <div
            className="anim-ring"
            style={{ ...centerStyle, width: 70, height: 70, border: '3px solid rgba(248,113,113,0.4)', animationDelay: '0.15s' }}
            data-testid="ring-red-2"
          />
          <div className="anim-epic-score" style={centerStyle} data-testid="score-wrong">
            <div style={{ fontSize: 44, lineHeight: 1 }}>❌</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase' as const, letterSpacing: 1, fontFamily: "'Outfit',sans-serif", marginTop: 4 }}>
              Review This Card
            </div>
          </div>
          <div
            className="anim-epic-toast"
            style={{
              left: '50%',
              bottom: 120,
              background: 'rgba(248,113,113,0.12)',
              border: '2px solid rgba(248,113,113,0.4)',
              color: '#f87171',
            }}
            data-testid="toast-wrong"
          >
            📖 CCCC will show you why
          </div>
        </>
      )}

      {/* Streak animation */}
      {type === 'streak' && (
        <>
          <div
            className="anim-overlay"
            style={{ inset: 0, background: 'rgba(245,197,24,0.18)' }}
            data-testid="overlay-streak"
          />
          <div className="anim-epic-score" style={centerStyle} data-testid="score-streak">
            <div style={{ fontSize: 32, fontWeight: 900, color: '#F5C518', lineHeight: 1, fontFamily: "'Outfit',sans-serif" }}>
              🔥 x{streakCount}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,197,24,0.6)', textTransform: 'uppercase' as const, letterSpacing: 2, fontFamily: "'Outfit',sans-serif", marginTop: 4 }}>
              On Fire!
            </div>
          </div>
          <div
            className="anim-epic-toast"
            style={{
              left: '50%',
              bottom: 120,
              background: 'linear-gradient(135deg,rgba(245,197,24,0.2),rgba(251,146,60,0.15))',
              border: '2px solid rgba(245,197,24,0.5)',
              color: '#F5C518',
            }}
            data-testid="toast-streak"
          >
            {streakCount >= 10 ? `⚡ ${streakCount} in a row — UNSTOPPABLE!` : streakCount >= 5 ? `🔥 ${streakCount} in a row — you're on fire!` : `🔥 ${streakCount} in a row!`}
          </div>
        </>
      )}

      {/* Milestone animation */}
      {type === 'milestone' && (
        <>
          <div
            className="anim-overlay"
            style={{ inset: 0, background: 'rgba(96,165,250,0.18)' }}
            data-testid="overlay-milestone"
          />
          {confetti.map((c) => (
            <div
              key={c.id}
              className="anim-conf"
              style={{
                left: `calc(50% + ${c.left}px)`,
                top: '45%',
                width: c.size,
                height: c.size,
                background: c.color,
                animationDuration: `${c.duration}s`,
                animationDelay: `${c.delay}s`,
              }}
            />
          ))}
          <div className="anim-epic-score" style={centerStyle} data-testid="score-milestone">
            <div style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa', lineHeight: 1, fontFamily: "'Outfit',sans-serif" }}>
              {currentCard} / {totalCards}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(96,165,250,0.6)', textTransform: 'uppercase' as const, letterSpacing: 2, fontFamily: "'Outfit',sans-serif", marginTop: 4 }}>
              Halfway There!
            </div>
          </div>
          <div
            className="anim-epic-toast"
            style={{
              left: '50%',
              bottom: 120,
              background: 'linear-gradient(135deg,rgba(96,165,250,0.15),rgba(167,139,250,0.12))',
              border: '2px solid rgba(96,165,250,0.45)',
              color: '#60a5fa',
            }}
            data-testid="toast-milestone"
          >
            💪 Halfway — finish strong!
          </div>
        </>
      )}
    </>
  )
}
