/**
 * AnswerOption unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AnswerOption } from './AnswerOption'

const defaultProps = {
  index: 0,
  text: 'A. Administer Morphine',
  isSelected: false,
  isStruck: false,
  isCorrect: false,
  isWrong: false,
  isDisabled: false,
  onSelect: vi.fn(),
  onStrike: vi.fn(),
}

describe('AnswerOption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders option text', () => {
    render(<AnswerOption {...defaultProps} />)

    expect(screen.getByText('A. Administer Morphine')).toBeInTheDocument()
  })

  it('renders strike button', () => {
    render(<AnswerOption {...defaultProps} />)

    expect(screen.getByLabelText(/strike out/i)).toBeInTheDocument()
  })

  it('calls onSelect when option is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<AnswerOption {...defaultProps} onSelect={onSelect} />)

    await user.click(screen.getByText('A. Administer Morphine'))

    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('calls onStrike when strike button is clicked', async () => {
    const onStrike = vi.fn()
    const user = userEvent.setup()
    render(<AnswerOption {...defaultProps} onStrike={onStrike} />)

    await user.click(screen.getByLabelText(/strike out/i))

    expect(onStrike).toHaveBeenCalledWith(0)
  })

  it('does not call onSelect when struck', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<AnswerOption {...defaultProps} isStruck={true} onSelect={onSelect} />)

    await user.click(screen.getByText('A. Administer Morphine'))

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('applies selected-opt class when selected', () => {
    render(<AnswerOption {...defaultProps} isSelected={true} />)

    const btn = screen.getByText('A. Administer Morphine')
    expect(btn.className).toContain('selected-opt')
  })

  it('applies struck class when struck', () => {
    render(<AnswerOption {...defaultProps} isStruck={true} />)

    const btn = screen.getByText('A. Administer Morphine')
    expect(btn.className).toContain('struck')
  })

  it('applies correct class when correct', () => {
    render(<AnswerOption {...defaultProps} isCorrect={true} />)

    const btn = screen.getByText('A. Administer Morphine')
    expect(btn.className).toContain('correct')
  })

  it('applies wrong class when wrong', () => {
    render(<AnswerOption {...defaultProps} isWrong={true} />)

    const btn = screen.getByText('A. Administer Morphine')
    expect(btn.className).toContain('wrong')
  })

  it('applies disabled class when disabled', () => {
    render(<AnswerOption {...defaultProps} isDisabled={true} />)

    const btn = screen.getByText('A. Administer Morphine')
    expect(btn.className).toContain('disabled')
    expect(btn).toBeDisabled()
  })

  it('strike button is disabled when option is disabled', () => {
    render(<AnswerOption {...defaultProps} isDisabled={true} />)

    expect(screen.getByLabelText(/strike out/i)).toBeDisabled()
  })

  it('applies struck class to strike button when struck', () => {
    render(<AnswerOption {...defaultProps} isStruck={true} />)

    const strikeBtn = screen.getByLabelText(/strike out/i)
    expect(strikeBtn.className).toContain('struck')
  })

  it('does not have selected-opt class by default', () => {
    render(<AnswerOption {...defaultProps} />)

    const btn = screen.getByText('A. Administer Morphine')
    expect(btn.className).not.toContain('selected-opt')
  })

  it('renders with index 3', () => {
    render(<AnswerOption {...defaultProps} index={3} text="D. Notify" />)

    expect(screen.getByText('D. Notify')).toBeInTheDocument()
  })
})
