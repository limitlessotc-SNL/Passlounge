/**
 * Particles unit tests
 */

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Particles } from './Particles'

describe('Particles', () => {
  it('renders 20 particle elements', () => {
    const { container } = render(<Particles />)

    const particles = container.querySelectorAll('.particle')
    expect(particles.length).toBe(20)
  })

  it('each particle has animation styles', () => {
    const { container } = render(<Particles />)

    const particle = container.querySelector('.particle') as HTMLElement
    expect(particle).toBeTruthy()
    expect(particle.style.animationDuration).toBeTruthy()
    expect(particle.style.animationDelay).toBeTruthy()
    expect(particle.style.left).toBeTruthy()
  })

  it('particles have varied backgrounds', () => {
    const { container } = render(<Particles />)

    const particles = container.querySelectorAll('.particle')
    const backgrounds = new Set<string>()
    particles.forEach((p) => {
      backgrounds.add((p as HTMLElement).style.background)
    })
    expect(backgrounds.size).toBeGreaterThan(1)
  })

  it('container has pointer-events none', () => {
    const { container } = render(<Particles />)

    const wrapper = container.querySelector('#particles') as HTMLElement
    expect(wrapper.style.pointerEvents).toBe('none')
  })
})
