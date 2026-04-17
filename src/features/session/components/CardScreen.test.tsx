/**
 * CardScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/store/sessionStore'
import type { StudyCard } from '@/types'

import { CardScreen } from './CardScreen'

const makeCard = (id: string, xp = 20): StudyCard => ({
  id,
  cat: 'Cardiac',
  bloom: 'Apply',
  xp,
  title: `Card ${id}`,
  type: 'Multiple Choice · Cardiac',
  scenario: 'A patient presents with chest pain.',
  question: 'What is the PRIORITY nursing intervention?',
  opts: ['A. Morphine', 'B. Consent', 'C. IV access', 'D. Notify'],
  correct: 0,
  layers: ['Core', 'Complication', 'Connection', 'Confirmation'],
  lens: 'Assessment vs Intervention',
  pearl: 'Remember MONA.',
  mnemonic: [['M', 'Morphine']],
  why_wrong: { Consent: 'Not first', 'IV access': 'Second priority' },
})

function renderScreen() {
  return render(
    <MemoryRouter>
      <CardScreen />
    </MemoryRouter>,
  )
}

describe('CardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const cards = [makeCard('1'), makeCard('2', 25), makeCard('3', 30)]
    useSessionStore.getState().startSession(cards, false)
    useSessionStore.getState().setMode('test')
  })

  afterEach(() => {
    useSessionStore.getState().reset()
  })

  it('renders scenario text', () => {
    renderScreen()

    expect(screen.getByText(/a patient presents with chest pain/i)).toBeInTheDocument()
  })

  it('renders question text', () => {
    renderScreen()

    expect(screen.getByText(/what is the priority/i)).toBeInTheDocument()
  })

  it('renders 4 answer options', () => {
    renderScreen()

    const opts = screen.getAllByRole('button').filter((b) =>
      b.className.includes('ans-opt'),
    )
    expect(opts.length).toBe(4)
  })

  it('renders 4 strike buttons', () => {
    renderScreen()

    const strikes = screen.getAllByLabelText(/strike out/i)
    expect(strikes.length).toBe(4)
  })

  it('renders XP tag', () => {
    renderScreen()

    expect(screen.getByText('+20 XP')).toBeInTheDocument()
  })

  it('renders progress counter (Card 1 of 3)', () => {
    renderScreen()

    expect(screen.getByText('Card 1 of 3')).toBeInTheDocument()
  })

  it('renders stats HUD with initial values', () => {
    renderScreen()

    expect(screen.getByText('Correct')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument() // XP
    expect(screen.getByText('Streak')).toBeInTheDocument()
  })

  it('shows submit button after selecting an option', async () => {
    const user = userEvent.setup()
    renderScreen()

    const opts = screen.getAllByRole('button').filter((b) =>
      b.className.includes('ans-opt'),
    )
    await user.click(opts[0])

    expect(screen.getByText(/submit answer/i)).toBeInTheDocument()
  })

  it('submit button is not visible before selection', () => {
    renderScreen()

    expect(screen.queryByText(/submit answer/i)).not.toBeInTheDocument()
  })

  it('selecting a struck option does nothing', async () => {
    const user = userEvent.setup()
    renderScreen()

    const strikes = screen.getAllByLabelText(/strike out/i)
    await user.click(strikes[0])

    const opts = screen.getAllByRole('button').filter((b) =>
      b.className.includes('ans-opt'),
    )
    await user.click(opts[0])

    expect(screen.queryByText(/submit answer/i)).not.toBeInTheDocument()
  })

  it('renders previous button disabled on first card', () => {
    renderScreen()

    const prevBtn = screen.getByLabelText('Previous card')
    expect(prevBtn.className).toContain('disabled')
  })

  it('renders scenario tag label', () => {
    renderScreen()

    expect(screen.getByText('📋 Scenario')).toBeInTheDocument()
  })

  it('renders streak counter', () => {
    renderScreen()

    expect(screen.getByText('Streak')).toBeInTheDocument()
  })

  it('renders exit button', () => {
    renderScreen()

    expect(screen.getByLabelText('Exit session')).toBeInTheDocument()
  })

  it('clicking exit button opens exit modal', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByLabelText('Exit session'))

    expect(screen.getByText('Exit Session?')).toBeInTheDocument()
    expect(screen.getByText('Keep Going')).toBeInTheDocument()
  })

  it('clicking "Keep Going" in modal closes it', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByLabelText('Exit session'))
    await user.click(screen.getByText('Keep Going'))

    expect(screen.queryByText('Exit Session?')).not.toBeInTheDocument()
  })

  it('returns null when no cards', () => {
    useSessionStore.getState().reset()
    const { container } = renderScreen()

    expect(container.innerHTML).toBe('')
  })

  it('study mode shows result bar and CCCC layers after submit', async () => {
    useSessionStore.getState().setMode('study')
    const user = userEvent.setup()
    renderScreen()

    const opts = screen.getAllByRole('button').filter((b) =>
      b.className.includes('ans-opt'),
    )
    await user.click(opts[0])
    await user.click(screen.getByText(/submit answer/i))

    // In study mode, CCCC layers should appear
    expect(screen.getByText('SNL Method Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Core Problem')).toBeInTheDocument()
  })
})
