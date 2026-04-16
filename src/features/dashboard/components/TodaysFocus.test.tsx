/**
 * TodaysFocus unit tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TodaysFocus } from './TodaysFocus'

const CATEGORIES = [
  { cat: 'Cardiac', correct: 3, total: 3, pct: 100 },
  { cat: 'Pharmacology', correct: 2, total: 3, pct: 67 },
  { cat: 'Respiratory', correct: 1, total: 3, pct: 33 },
  { cat: 'OB/Maternity', correct: 2, total: 3, pct: 67 },
  { cat: 'Mental Health', correct: 2, total: 3, pct: 67 },
]

describe('TodaysFocus', () => {
  it('renders section title', () => {
    render(<TodaysFocus categories={CATEGORIES} completed={true} />)
    expect(screen.getByText("Today's Focus")).toBeInTheDocument()
  })

  it('renders placeholder when not completed', () => {
    render(<TodaysFocus categories={[]} completed={false} />)
    expect(screen.getByText(/complete your diagnostic/i)).toBeInTheDocument()
  })

  it('shows top 3 weakest categories', () => {
    render(<TodaysFocus categories={CATEGORIES} completed={true} />)
    expect(screen.getByText('Respiratory')).toBeInTheDocument()
    // Should show 3 focus rows
    const focusRows = screen.getAllByText(/correct · focus here/i)
    expect(focusRows.length).toBe(3)
  })

  it('weakest category appears first', () => {
    const { container } = render(<TodaysFocus categories={CATEGORIES} completed={true} />)
    const rows = container.querySelectorAll('.focus-row')
    const firstTitle = rows[0]?.querySelector('.focus-title')?.textContent
    expect(firstTitle).toBe('Respiratory')
  })

  it('shows correct/total for each category', () => {
    render(<TodaysFocus categories={CATEGORIES} completed={true} />)
    expect(screen.getByText(/1\/3 correct/)).toBeInTheDocument()
  })

  it('shows Priority badge for < 50% categories', () => {
    render(<TodaysFocus categories={CATEGORIES} completed={true} />)
    expect(screen.getByText('Priority')).toBeInTheDocument()
  })

  it('shows Review badge for 50-79% categories', () => {
    render(<TodaysFocus categories={CATEGORIES} completed={true} />)
    expect(screen.getAllByText('Review').length).toBeGreaterThanOrEqual(1)
  })

  it('does not show Cardiac (100%) in top 3', () => {
    render(<TodaysFocus categories={CATEGORIES} completed={true} />)
    expect(screen.queryByText('Cardiac')).not.toBeInTheDocument()
  })

  it('renders focus icons', () => {
    const { container } = render(<TodaysFocus categories={CATEGORIES} completed={true} />)
    const icons = container.querySelectorAll('.focus-icon')
    expect(icons.length).toBe(3)
  })

  it('handles fewer than 3 categories', () => {
    const few = [{ cat: 'Cardiac', correct: 1, total: 3, pct: 33 }]
    render(<TodaysFocus categories={few} completed={true} />)
    expect(screen.getByText('Cardiac')).toBeInTheDocument()
  })
})
