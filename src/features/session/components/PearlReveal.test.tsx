/**
 * PearlReveal unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PearlReveal } from './PearlReveal'

const defaultProps = {
  lens: 'Assessment vs Intervention',
  pearl: 'Pain drives cardiac workload. MONA buys time for reperfusion. Remember:',
  mnemonic: [
    ['M', 'Morphine'],
    ['O', 'Oxygen'],
    ['N', 'Nitrates'],
    ['A', 'Aspirin'],
  ] as [string, string][],
  isLastCard: false,
  onNext: vi.fn(),
}

describe('PearlReveal', () => {
  it('renders Clinical Lens header', () => {
    render(<PearlReveal {...defaultProps} />)

    expect(screen.getByText('Clinical Lens Identified')).toBeInTheDocument()
  })

  it('renders lens name', () => {
    render(<PearlReveal {...defaultProps} />)

    expect(screen.getByText('Assessment vs Intervention')).toBeInTheDocument()
  })

  it('renders Coach Pearl header', () => {
    render(<PearlReveal {...defaultProps} />)

    expect(screen.getByText("Coach's Pearl")).toBeInTheDocument()
  })

  it('renders pearl text', () => {
    render(<PearlReveal {...defaultProps} />)

    expect(screen.getByText(/pain drives cardiac workload/i)).toBeInTheDocument()
  })

  it('renders mnemonic letters', () => {
    render(<PearlReveal {...defaultProps} />)

    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('O')).toBeInTheDocument()
    expect(screen.getByText('N')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders mnemonic words', () => {
    render(<PearlReveal {...defaultProps} />)

    expect(screen.getByText('Morphine')).toBeInTheDocument()
    expect(screen.getByText('Oxygen')).toBeInTheDocument()
    expect(screen.getByText('Nitrates')).toBeInTheDocument()
    expect(screen.getByText('Aspirin')).toBeInTheDocument()
  })

  it('renders "Next Card" button when not last card', () => {
    render(<PearlReveal {...defaultProps} isLastCard={false} />)

    expect(screen.getByText('Next Card →')).toBeInTheDocument()
  })

  it('renders "Complete Session" button when last card', () => {
    render(<PearlReveal {...defaultProps} isLastCard={true} />)

    expect(screen.getByText('Complete Session →')).toBeInTheDocument()
  })

  it('calls onNext when button is clicked', async () => {
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<PearlReveal {...defaultProps} onNext={onNext} />)

    await user.click(screen.getByText('Next Card →'))

    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('renders lens-badge with SVG', () => {
    const { container } = render(<PearlReveal {...defaultProps} />)

    const badge = container.querySelector('.lens-badge')
    expect(badge).toBeTruthy()

    const svg = badge?.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders pearl-anim-dot', () => {
    const { container } = render(<PearlReveal {...defaultProps} />)

    const dot = container.querySelector('.pearl-anim-dot')
    expect(dot).toBeTruthy()
  })

  it('renders empty mnemonic gracefully', () => {
    render(<PearlReveal {...defaultProps} mnemonic={[]} />)

    expect(screen.getByText(/pain drives cardiac workload/i)).toBeInTheDocument()
    expect(screen.queryByText('M')).not.toBeInTheDocument()
  })

  it('renders m-letter elements with correct class', () => {
    const { container } = render(<PearlReveal {...defaultProps} />)

    const letters = container.querySelectorAll('.m-letter')
    expect(letters.length).toBe(4)
  })

  it('renders m-word elements with correct class', () => {
    const { container } = render(<PearlReveal {...defaultProps} />)

    const words = container.querySelectorAll('.m-word')
    expect(words.length).toBe(4)
  })

  it('lens-reveal has correct class', () => {
    const { container } = render(<PearlReveal {...defaultProps} />)

    const reveal = container.querySelector('.lens-reveal')
    expect(reveal).toBeTruthy()
  })

  it('pearl-section has correct class', () => {
    const { container } = render(<PearlReveal {...defaultProps} />)

    const section = container.querySelector('.pearl-section')
    expect(section).toBeTruthy()
  })
})
