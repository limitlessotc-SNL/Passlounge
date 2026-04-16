/**
 * Particles
 *
 * Renders 20 floating particles in the background with randomized
 * positions, colors, sizes, and animation timing — matching the original HTML.
 *
 * Owner: Senior Engineer
 */

import { useMemo } from 'react'

const COLORS = ['#F5C518', 'rgba(245,197,24,0.4)', 'rgba(10,77,153,0.8)', 'rgba(255,255,255,0.4)']

interface ParticleData {
  id: number;
  left: string;
  background: string;
  width: string;
  height: string;
  animationDuration: string;
  animationDelay: string;
}

function generateParticles(count: number): ParticleData[] {
  return Array.from({ length: count }, (_, i) => {
    const sz = `${2 + Math.random() * 3}px`
    return {
      id: i,
      left: `${Math.random() * 100}%`,
      background: COLORS[i % COLORS.length],
      width: sz,
      height: sz,
      animationDuration: `${6 + Math.random() * 8}s`,
      animationDelay: `${Math.random() * 8}s`,
    }
  })
}

export function Particles() {
  const particles = useMemo(() => generateParticles(20), [])

  return (
    <div id="particles" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: '-8px',
            background: p.background,
            width: p.width,
            height: p.height,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
          }}
        />
      ))}
    </div>
  )
}
