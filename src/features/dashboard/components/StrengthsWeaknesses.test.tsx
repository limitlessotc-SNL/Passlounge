/**
 * StrengthsWeaknesses unit tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StrengthsWeaknesses } from './StrengthsWeaknesses'

const CATEGORIES = [
  { cat: 'Cardiac', pct: 100, icon: '🫀' },
  { cat: 'Pharmacology', pct: 67, icon: '💊' },
  { cat: 'Respiratory', pct: 33, icon: '🫁' },
  { cat: 'OB/Maternity', pct: 67, icon: '🤱' },
  { cat: 'Mental Health', pct: 67, icon: '🧠' },
]

describe('StrengthsWeaknesses', () => {
  it('renders section title', () => {
    render(<StrengthsWeaknesses categories={CATEGORIES} completed={true} />)
    expect(screen.getByText('Strengths & Weaknesses')).toBeInTheDocument()
  })

  it('renders all category names', () => {
    render(<StrengthsWeaknesses categories={CATEGORIES} completed={true} />)
    expect(screen.getByText(/Cardiac/)).toBeInTheDocument()
    expect(screen.getByText(/Pharmacology/)).toBeInTheDocument()
    expect(screen.getByText(/Respiratory/)).toBeInTheDocument()
  })

  it('renders accuracy percentages', () => {
    render(<StrengthsWeaknesses categories={CATEGORIES} completed={true} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('renders placeholder when not completed', () => {
    render(<StrengthsWeaknesses categories={[]} completed={false} />)
    expect(screen.getByText(/complete your diagnostic/i)).toBeInTheDocument()
  })

  it('sorts categories strongest to weakest', () => {
    const { container } = render(<StrengthsWeaknesses categories={CATEGORIES} completed={true} />)
    const rows = container.querySelectorAll('.sw-row')
    const names = Array.from(rows).map((r) => r.querySelector('.sw-name')?.textContent ?? '')
    expect(names[0]).toContain('Cardiac')
    expect(names[names.length - 1]).toContain('Respiratory')
  })

  it('renders correct number of rows', () => {
    const { container } = render(<StrengthsWeaknesses categories={CATEGORIES} completed={true} />)
    expect(container.querySelectorAll('.sw-row').length).toBe(5)
  })

  it('applies green color for 80%+ accuracy', () => {
    const { container } = render(<StrengthsWeaknesses categories={[{ cat: 'Cardiac', pct: 100, icon: '🫀' }]} completed={true} />)
    const pct = container.querySelector('.sw-pct') as HTMLElement
    expect(pct.style.color).toBe('rgb(74, 222, 128)')
  })

  it('applies gold color for 50-79% accuracy', () => {
    const { container } = render(<StrengthsWeaknesses categories={[{ cat: 'Pharma', pct: 67, icon: '💊' }]} completed={true} />)
    const pct = container.querySelector('.sw-pct') as HTMLElement
    expect(pct.style.color).toBe('rgb(245, 197, 24)')
  })

  it('applies red color for below 50% accuracy', () => {
    const { container } = render(<StrengthsWeaknesses categories={[{ cat: 'Resp', pct: 33, icon: '🫁' }]} completed={true} />)
    const pct = container.querySelector('.sw-pct') as HTMLElement
    expect(pct.style.color).toBe('rgb(248, 113, 113)')
  })

  it('bar width matches percentage', () => {
    const { container } = render(<StrengthsWeaknesses categories={[{ cat: 'Test', pct: 75, icon: '📋' }]} completed={true} />)
    const fill = container.querySelector('.sw-fill') as HTMLElement
    expect(fill.style.width).toBe('75%')
  })
})
