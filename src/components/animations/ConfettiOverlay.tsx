/**
 * ConfettiOverlay
 *
 * Renders 35 falling confetti pieces with randomized colors,
 * sizes, shapes, and timing — matching the original HTML confetti.
 *
 * Owner: Senior Engineer
 */

import { useEffect, useState } from 'react'

const COLORS = ['#F5C518', '#fff', '#053571', '#4ade80', '#f87171', '#a78bfa']

interface Piece {
  id: number;
  left: string;
  width: string;
  height: string;
  borderRadius: string;
  background: string;
  animationDuration: string;
  animationDelay: string;
}

function generatePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    width: `${6 + Math.random() * 9}px`,
    height: `${6 + Math.random() * 9}px`,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    background: COLORS[i % COLORS.length],
    animationDuration: `${1.5 + Math.random() * 2.5}s`,
    animationDelay: `${Math.random() * 1.5}s`,
  }))
}

export function ConfettiOverlay() {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    setPieces(generatePieces(35))
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: '-10px',
            width: p.width,
            height: p.height,
            borderRadius: p.borderRadius,
            background: p.background,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        />
      ))}
    </div>
  )
}
