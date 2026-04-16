/**
 * CardBankProgress unit tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CardBankProgress } from './CardBankProgress'

describe('CardBankProgress', () => {
  it('renders Card Bank section title', () => {
    render(<CardBankProgress totalCards={100} seenCount={30} reviewCount={5} />)
    expect(screen.getByText('Card Bank')).toBeInTheDocument()
  })

  it('renders Study Cards label', () => {
    render(<CardBankProgress totalCards={100} seenCount={30} reviewCount={5} />)
    expect(screen.getByText('Study Cards')).toBeInTheDocument()
  })

  it('renders percentage', () => {
    render(<CardBankProgress totalCards={100} seenCount={30} reviewCount={5} />)
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('renders seen count', () => {
    render(<CardBankProgress totalCards={100} seenCount={30} reviewCount={5} />)
    expect(screen.getByText('30 seen')).toBeInTheDocument()
  })

  it('renders new count (total - seen)', () => {
    render(<CardBankProgress totalCards={100} seenCount={30} reviewCount={5} />)
    expect(screen.getByText('70 new')).toBeInTheDocument()
  })

  it('renders review count', () => {
    render(<CardBankProgress totalCards={100} seenCount={30} reviewCount={5} />)
    expect(screen.getByText('5 need review')).toBeInTheDocument()
  })

  it('handles zero total cards', () => {
    render(<CardBankProgress totalCards={0} seenCount={0} reviewCount={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 seen')).toBeInTheDocument()
  })

  it('handles all cards seen', () => {
    render(<CardBankProgress totalCards={50} seenCount={50} reviewCount={3} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('0 new')).toBeInTheDocument()
  })

  it('progress bar has correct width', () => {
    const { container } = render(<CardBankProgress totalCards={200} seenCount={100} reviewCount={10} />)
    const fill = container.querySelector('.bank-prog-fill') as HTMLElement
    expect(fill.style.width).toBe('50%')
  })
})
