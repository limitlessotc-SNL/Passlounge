/**
 * SessionHistory unit tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SessionSnapshot } from '@/types'

import { SessionHistory } from './SessionHistory'

const makeSession = (id: number, mode: 'test' | 'study' = 'test'): SessionSnapshot => ({
  id,
  name: `Session ${id}`,
  mode,
  date: 'Apr 15',
  categories: 'Cardiac, Pharmacology',
  correct: 8,
  wrong: 2,
  total: 10,
  pct: 80,
  cards: [],
  results: [],
  answers: [],
  shuffles: [],
})

describe('SessionHistory', () => {
  it('renders section title', () => {
    render(<SessionHistory sessions={[makeSession(1)]} />)
    expect(screen.getByText('Session History')).toBeInTheDocument()
  })

  it('renders empty state when no sessions', () => {
    render(<SessionHistory sessions={[]} />)
    expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument()
  })

  it('renders session name', () => {
    render(<SessionHistory sessions={[makeSession(1)]} />)
    expect(screen.getByText('Session 1')).toBeInTheDocument()
  })

  it('renders session date and categories', () => {
    render(<SessionHistory sessions={[makeSession(1)]} />)
    expect(screen.getByText(/apr 15 · cardiac, pharmacology/i)).toBeInTheDocument()
  })

  it('renders correct count', () => {
    render(<SessionHistory sessions={[makeSession(1)]} />)
    expect(screen.getByText('8 correct')).toBeInTheDocument()
  })

  it('renders wrong count', () => {
    render(<SessionHistory sessions={[makeSession(1)]} />)
    expect(screen.getByText('2 missed')).toBeInTheDocument()
  })

  it('renders accuracy percentage', () => {
    render(<SessionHistory sessions={[makeSession(1)]} />)
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('renders Test badge for test mode', () => {
    render(<SessionHistory sessions={[makeSession(1, 'test')]} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('renders Study badge for study mode', () => {
    render(<SessionHistory sessions={[makeSession(1, 'study')]} />)
    expect(screen.getByText('Study')).toBeInTheDocument()
  })

  it('renders review button', () => {
    render(<SessionHistory sessions={[makeSession(1)]} />)
    expect(screen.getByText('Review Session →')).toBeInTheDocument()
  })

  it('renders multiple sessions', () => {
    render(<SessionHistory sessions={[makeSession(1), makeSession(2), makeSession(3)]} />)
    expect(screen.getByText('Session 1')).toBeInTheDocument()
    expect(screen.getByText('Session 2')).toBeInTheDocument()
    expect(screen.getByText('Session 3')).toBeInTheDocument()
  })

  it('shows most recent session first', () => {
    const { container } = render(<SessionHistory sessions={[makeSession(1), makeSession(2)]} />)
    const titles = container.querySelectorAll('.sess-hist-title')
    expect(titles[0].textContent).toBe('Session 2')
    expect(titles[1].textContent).toBe('Session 1')
  })

  it('test badge has correct class', () => {
    const { container } = render(<SessionHistory sessions={[makeSession(1, 'test')]} />)
    const badge = container.querySelector('.sess-hist-badge')
    expect(badge?.className).toContain('badge-test-sm')
  })

  it('study badge has correct class', () => {
    const { container } = render(<SessionHistory sessions={[makeSession(1, 'study')]} />)
    const badge = container.querySelector('.sess-hist-badge')
    expect(badge?.className).toContain('badge-study-sm')
  })
})
