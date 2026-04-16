/**
 * ExitModal unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ExitModal } from './ExitModal'

const defaultProps = {
  visible: true,
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
}

describe('ExitModal', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<ExitModal {...defaultProps} visible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders title when visible', () => {
    render(<ExitModal {...defaultProps} />)
    expect(screen.getByText('Exit Session?')).toBeInTheDocument()
  })

  it('renders subtitle', () => {
    render(<ExitModal {...defaultProps} />)
    expect(screen.getByText(/your answers so far/i)).toBeInTheDocument()
  })

  it('renders cancel button with default label', () => {
    render(<ExitModal {...defaultProps} />)
    expect(screen.getByText('Keep Going')).toBeInTheDocument()
  })

  it('renders confirm button with default label', () => {
    render(<ExitModal {...defaultProps} />)
    expect(screen.getByText('Exit')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ExitModal {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByText('Keep Going'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<ExitModal {...defaultProps} onConfirm={onConfirm} />)

    await user.click(screen.getByText('Exit'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when overlay clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ExitModal {...defaultProps} onCancel={onCancel} />)

    const overlay = document.querySelector('.exit-modal-overlay') as HTMLElement
    await user.click(overlay)
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not call onCancel when modal content clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<ExitModal {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByText('Exit Session?'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('renders custom title', () => {
    render(<ExitModal {...defaultProps} title="Leave Game?" />)
    expect(screen.getByText('Leave Game?')).toBeInTheDocument()
  })

  it('renders custom subtitle', () => {
    render(<ExitModal {...defaultProps} subtitle="Progress will be saved." />)
    expect(screen.getByText('Progress will be saved.')).toBeInTheDocument()
  })

  it('renders custom cancel label', () => {
    render(<ExitModal {...defaultProps} cancelLabel="Cancel" />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('renders custom confirm label', () => {
    render(<ExitModal {...defaultProps} confirmLabel="Save & Exit" />)
    expect(screen.getByText('Save & Exit')).toBeInTheDocument()
  })

  it('overlay has visible class', () => {
    render(<ExitModal {...defaultProps} />)
    const overlay = document.querySelector('.exit-modal-overlay')
    expect(overlay?.className).toContain('visible')
  })

  it('modal has correct class', () => {
    render(<ExitModal {...defaultProps} />)
    const modal = document.querySelector('.exit-modal')
    expect(modal).toBeTruthy()
  })
})
