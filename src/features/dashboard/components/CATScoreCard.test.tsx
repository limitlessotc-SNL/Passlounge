/**
 * CATScoreCard unit tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CATScoreCard } from './CATScoreCard'

describe('CATScoreCard', () => {
  it('renders CAT score header', () => {
    render(<CATScoreCard catLevel="3.5" catLabel="Proficient" catSub="Above passing" completed={true} />)
    expect(screen.getByText('Your CAT Score')).toBeInTheDocument()
  })

  it('renders cat level when completed', () => {
    render(<CATScoreCard catLevel="3.5" catLabel="Proficient" catSub="Above passing" completed={true} />)
    expect(screen.getByText('3.5')).toBeInTheDocument()
  })

  it('renders cat label when completed', () => {
    render(<CATScoreCard catLevel="3.5" catLabel="Proficient" catSub="Above" completed={true} />)
    expect(screen.getByText('Proficient')).toBeInTheDocument()
  })

  it('renders dash when not completed', () => {
    render(<CATScoreCard catLevel="—" catLabel="" catSub="" completed={false} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders placeholder text when not completed', () => {
    render(<CATScoreCard catLevel="—" catLabel="" catSub="" completed={false} />)
    expect(screen.getByText('Complete your diagnostic')).toBeInTheDocument()
  })

  it('renders passing line label', () => {
    render(<CATScoreCard catLevel="3.5" catLabel="Proficient" catSub="Above" completed={true} />)
    expect(screen.getByText(/passing line/i)).toBeInTheDocument()
  })

  it('renders level 1 and level 5 labels', () => {
    render(<CATScoreCard catLevel="3.5" catLabel="Proficient" catSub="Above" completed={true} />)
    expect(screen.getByText('Level 1')).toBeInTheDocument()
    expect(screen.getByText('Level 5')).toBeInTheDocument()
  })

  it('progress bar has correct width when completed', () => {
    const { container } = render(<CATScoreCard catLevel="4.0" catLabel="Distinguished" catSub="" completed={true} />)
    const fill = container.querySelector('.cat-prog-fill') as HTMLElement
    expect(fill.style.width).toBe('80%')
  })

  it('progress bar has 0% width when not completed', () => {
    const { container } = render(<CATScoreCard catLevel="—" catLabel="" catSub="" completed={false} />)
    const fill = container.querySelector('.cat-prog-fill') as HTMLElement
    expect(fill.style.width).toBe('0%')
  })

  it('renders passing marker at 60%', () => {
    const { container } = render(<CATScoreCard catLevel="3.5" catLabel="P" catSub="" completed={true} />)
    const marker = container.querySelector('.cat-prog-marker') as HTMLElement
    expect(marker.style.left).toBe('60%')
  })
})
