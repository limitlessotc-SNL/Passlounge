/**
 * StatsGrid unit tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatsGrid } from './StatsGrid'

describe('StatsGrid', () => {
  it('renders cards studied', () => {
    render(<StatsGrid cardsStudied={45} accuracy="73%" xpEarned={950} sessionsDone={3} />)
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('Cards Studied')).toBeInTheDocument()
  })

  it('renders accuracy', () => {
    render(<StatsGrid cardsStudied={0} accuracy="85%" xpEarned={0} sessionsDone={0} />)
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('Avg Accuracy')).toBeInTheDocument()
  })

  it('renders XP earned', () => {
    render(<StatsGrid cardsStudied={0} accuracy="—" xpEarned={1200} sessionsDone={0} />)
    expect(screen.getByText('1200')).toBeInTheDocument()
    expect(screen.getByText('XP Earned')).toBeInTheDocument()
  })

  it('renders sessions done', () => {
    render(<StatsGrid cardsStudied={0} accuracy="—" xpEarned={0} sessionsDone={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Sessions Done')).toBeInTheDocument()
  })

  it('renders all 4 stat boxes', () => {
    const { container } = render(<StatsGrid cardsStudied={10} accuracy="50%" xpEarned={100} sessionsDone={1} />)
    const boxes = container.querySelectorAll('.dash-stat')
    expect(boxes.length).toBe(4)
  })

  it('renders zero values correctly', () => {
    render(<StatsGrid cardsStudied={0} accuracy="—" xpEarned={50} sessionsDone={0} />)
    expect(screen.getAllByText('0').length).toBe(2)
  })
})
