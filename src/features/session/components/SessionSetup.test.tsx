/**
 * SessionSetup unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/store/sessionStore'

import { SessionSetup } from './SessionSetup'

function renderSetup() {
  return render(
    <MemoryRouter>
      <SessionSetup />
    </MemoryRouter>,
  )
}

describe('SessionSetup', () => {
  afterEach(() => {
    useSessionStore.getState().reset()
  })

  it('renders Step 1 Mode section', () => {
    renderSetup()
    expect(screen.getByText(/step 1 — mode/i)).toBeInTheDocument()
  })

  it('renders Test Mode and Study Mode cards', () => {
    renderSetup()
    expect(screen.getByText('Test Mode')).toBeInTheDocument()
    expect(screen.getByText('Study Mode')).toBeInTheDocument()
  })

  it('renders Step 2 Questions section', () => {
    renderSetup()
    expect(screen.getByText(/step 2 — questions/i)).toBeInTheDocument()
  })

  it('renders question count buttons (10, 20, 30, Custom)', () => {
    renderSetup()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('renders Step 3 Card Pool section', () => {
    renderSetup()
    expect(screen.getByText(/step 3 — card pool/i)).toBeInTheDocument()
  })

  it('renders all 3 pool options', () => {
    renderSetup()
    expect(screen.getByText('All Cards')).toBeInTheDocument()
    expect(screen.getByText('New Cards Only')).toBeInTheDocument()
    expect(screen.getByText('Missed Cards Only')).toBeInTheDocument()
  })

  it('renders start button', () => {
    renderSetup()
    expect(screen.getByText(/start test mode/i)).toBeInTheDocument()
  })

  it('switches mode to study on click', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Study Mode'))

    expect(useSessionStore.getState().mode).toBe('study')
    expect(screen.getByText(/start study mode/i)).toBeInTheDocument()
  })

  it('switches mode back to test', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Study Mode'))
    await user.click(screen.getByText('Test Mode'))

    expect(useSessionStore.getState().mode).toBe('test')
  })

  it('sets question count to 20 on click', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('20'))

    expect(useSessionStore.getState().qCount).toBe(20)
  })

  it('shows custom input when Custom is clicked', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Custom'))

    expect(screen.getByPlaceholderText(/enter number/i)).toBeInTheDocument()
  })

  it('sets pool to new on click', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('New Cards Only'))

    expect(useSessionStore.getState().pool).toBe('new')
  })

  it('sets pool to missed on click', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Missed Cards Only'))

    expect(useSessionStore.getState().pool).toBe('missed')
  })

  it('renders limit note for test mode', () => {
    renderSetup()
    expect(screen.getByText(/max 75 for test mode/i)).toBeInTheDocument()
  })

  it('renders limit note for study mode after switch', async () => {
    const user = userEvent.setup()
    renderSetup()

    await user.click(screen.getByText('Study Mode'))

    expect(screen.getByText(/max 30 for study mode/i)).toBeInTheDocument()
  })

  it('test mode card has mode tags', () => {
    renderSetup()
    expect(screen.getByText('Fast Paced')).toBeInTheDocument()
    expect(screen.getByText('No CCCC')).toBeInTheDocument()
  })

  it('study mode card has mode tags', () => {
    renderSetup()
    expect(screen.getByText('Full CCCC')).toBeInTheDocument()
    expect(screen.getByText("Coach's Pearl")).toBeInTheDocument()
  })
})
