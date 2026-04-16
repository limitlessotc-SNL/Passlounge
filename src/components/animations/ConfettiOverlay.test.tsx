/**
 * ConfettiOverlay unit tests
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ConfettiOverlay } from './ConfettiOverlay'

describe('ConfettiOverlay', () => {
  it('renders confetti pieces', () => {
    const { container } = render(<ConfettiOverlay />)

    const pieces = container.querySelectorAll('.confetti-piece')
    expect(pieces.length).toBe(35)
  })

  it('each piece has animation styles', () => {
    const { container } = render(<ConfettiOverlay />)

    const piece = container.querySelector('.confetti-piece') as HTMLElement
    expect(piece).toBeTruthy()
    expect(piece.style.animationDuration).toBeTruthy()
    expect(piece.style.animationDelay).toBeTruthy()
  })

  it('pieces have varied colors', () => {
    const { container } = render(<ConfettiOverlay />)

    const pieces = container.querySelectorAll('.confetti-piece')
    const backgrounds = new Set<string>()
    pieces.forEach((p) => {
      backgrounds.add((p as HTMLElement).style.background)
    })
    expect(backgrounds.size).toBeGreaterThan(1)
  })
})
