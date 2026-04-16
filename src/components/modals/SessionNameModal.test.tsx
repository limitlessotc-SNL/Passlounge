/**
 * SessionNameModal unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SessionNameModal } from './SessionNameModal'

const defaultProps = {
  visible: true,
  onStart: vi.fn(),
  onCancel: vi.fn(),
}

describe('SessionNameModal', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<SessionNameModal {...defaultProps} visible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders title when visible', () => {
    render(<SessionNameModal {...defaultProps} />)
    expect(screen.getByText('Name This Session')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<SessionNameModal {...defaultProps} />)
    expect(screen.getByText(/optional — helps you find it/i)).toBeInTheDocument()
  })

  it('renders input with placeholder', () => {
    render(<SessionNameModal {...defaultProps} />)
    expect(screen.getByPlaceholderText(/week 2 review/i)).toBeInTheDocument()
  })

  it('renders Skip button', () => {
    render(<SessionNameModal {...defaultProps} />)
    expect(screen.getByText('Skip')).toBeInTheDocument()
  })

  it('renders Start button', () => {
    render(<SessionNameModal {...defaultProps} />)
    expect(screen.getByText('Start →')).toBeInTheDocument()
  })

  it('renders close button', () => {
    render(<SessionNameModal {...defaultProps} />)
    expect(screen.getByTitle('Go back')).toBeInTheDocument()
  })

  it('calls onStart with empty string when Skip clicked', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SessionNameModal {...defaultProps} onStart={onStart} />)

    await user.click(screen.getByText('Skip'))

    expect(onStart).toHaveBeenCalledWith('')
  })

  it('calls onStart with entered name when Start clicked', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SessionNameModal {...defaultProps} onStart={onStart} />)

    await user.type(screen.getByPlaceholderText(/week 2 review/i), 'Cardiac Review')
    await user.click(screen.getByText('Start →'))

    expect(onStart).toHaveBeenCalledWith('Cardiac Review')
  })

  it('trims whitespace from name', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()
    render(<SessionNameModal {...defaultProps} onStart={onStart} />)

    await user.type(screen.getByPlaceholderText(/week 2 review/i), '  Pharma  ')
    await user.click(screen.getByText('Start →'))

    expect(onStart).toHaveBeenCalledWith('Pharma')
  })

  it('calls onCancel when close button clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<SessionNameModal {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByTitle('Go back'))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when overlay clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<SessionNameModal {...defaultProps} onCancel={onCancel} />)

    const overlay = document.querySelector('.session-name-overlay') as HTMLElement
    await user.click(overlay)

    expect(onCancel).toHaveBeenCalled()
  })

  it('does not call onCancel when modal box clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<SessionNameModal {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByText('Name This Session'))

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('input has maxLength of 40', () => {
    render(<SessionNameModal {...defaultProps} />)
    const input = screen.getByPlaceholderText(/week 2 review/i) as HTMLInputElement
    expect(input.maxLength).toBe(40)
  })

  it('overlay has visible class', () => {
    render(<SessionNameModal {...defaultProps} />)
    const overlay = document.querySelector('.session-name-overlay')
    expect(overlay?.className).toContain('visible')
  })

  it('input has autofocus', () => {
    render(<SessionNameModal {...defaultProps} />)
    const input = screen.getByPlaceholderText(/week 2 review/i)
    expect(document.activeElement).toBe(input)
  })
})
