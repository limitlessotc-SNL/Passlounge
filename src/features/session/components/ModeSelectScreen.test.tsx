/**
 * ModeSelectScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/store/sessionStore'

import { ModeSelectScreen } from './ModeSelectScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <ModeSelectScreen />
    </MemoryRouter>,
  )
}

describe('ModeSelectScreen', () => {
  afterEach(() => {
    useSessionStore.getState().reset()
  })

  it('renders title', () => {
    renderScreen()

    expect(screen.getByText(/how do you want/i)).toBeInTheDocument()
  })

  it('renders mode badge', () => {
    renderScreen()

    expect(screen.getByText(/daily study session/i)).toBeInTheDocument()
  })

  it('renders test mode card', () => {
    renderScreen()

    expect(screen.getByText('Test Mode')).toBeInTheDocument()
    expect(screen.getByText(/fast paced/i)).toBeInTheDocument()
  })

  it('renders study mode card', () => {
    renderScreen()

    expect(screen.getByText('Study Mode')).toBeInTheDocument()
    expect(screen.getByText(/full cccc/i)).toBeInTheDocument()
  })

  it('defaults to test mode selected', () => {
    renderScreen()

    expect(useSessionStore.getState().mode).toBe('test')
  })

  it('switches to study mode on click', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText('Study Mode'))

    expect(useSessionStore.getState().mode).toBe('study')
  })

  it('switches back to test mode on click', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText('Study Mode'))
    await user.click(screen.getByText('Test Mode'))

    expect(useSessionStore.getState().mode).toBe('test')
  })

  it('start button text reflects current mode (test)', () => {
    renderScreen()

    expect(screen.getByText(/start test mode/i)).toBeInTheDocument()
  })

  it('start button text reflects study mode after switch', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByText('Study Mode'))

    expect(screen.getByText(/start study mode/i)).toBeInTheDocument()
  })

  it('renders subtitle about NCLEX', () => {
    renderScreen()

    expect(screen.getByText(/can't switch mid-session/i)).toBeInTheDocument()
  })

  it('test mode has correct tags', () => {
    renderScreen()

    expect(screen.getByText('No CCCC')).toBeInTheDocument()
    expect(screen.getByText('SNL Review After')).toBeInTheDocument()
  })

  it('study mode has correct tags', () => {
    renderScreen()

    expect(screen.getByText('Clinical Lens')).toBeInTheDocument()
    expect(screen.getByText("Coach's Pearl")).toBeInTheDocument()
  })
})
