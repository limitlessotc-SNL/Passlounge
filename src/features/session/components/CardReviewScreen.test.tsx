/**
 * CardReviewScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/store/sessionStore'
import type { ShuffleResult, StudyCard } from '@/types'

import { CardReviewScreen } from './CardReviewScreen'

const makeCard = (id: string): StudyCard => ({
  id,
  cat: 'Cardiac',
  bloom: 'Apply',
  xp: 20,
  title: `Card ${id}`,
  type: 'MC',
  scenario: 'Patient presents with chest pain.',
  question: 'What is the priority intervention?',
  opts: ['A. Morphine', 'B. Consent', 'C. IV access', 'D. Notify provider'],
  correct: 0,
  layers: ['Core problem', 'Complication', 'Connection', 'Confirmation'],
  lens: 'Assessment vs Intervention',
  pearl: 'Remember MONA — buys time for reperfusion.',
  mnemonic: [['M', 'Morphine'], ['O', 'Oxygen']],
  why_wrong: {
    'Consent': 'Consent is a later step — stabilize first.',
    'IV access': 'IV access is secondary.',
    'Notify provider': 'Delegation comes after intervention.',
  },
})

const makeShuffle = (correct: number): ShuffleResult => ({
  opts: ['A. Morphine', 'B. Consent', 'C. IV access', 'D. Notify provider'],
  correct,
  origMap: [0, 1, 2, 3],
})

function renderScreen(cardIdx = '0') {
  return render(
    <MemoryRouter initialEntries={[`/session/review-card/${cardIdx}`]}>
      <Routes>
        <Route path="/session/review-card/:cardIdx" element={<CardReviewScreen />} />
        <Route path="/session/review" element={<div>Review List</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CardReviewScreen', () => {
  beforeEach(() => {
    // Populate sessionStore with a completed session
    useSessionStore.setState({
      cards: [makeCard('1'), makeCard('2')],
      shuffles: [makeShuffle(0), makeShuffle(0)],
      answers: [0, 1], // Card 1: chose correct; Card 2: chose wrong (B. Consent)
      results: [true, false],
      mode: 'test',
      isActive: false,
      correctCount: 1,
      wrongCount: 1,
    })
  })

  afterEach(() => {
    useSessionStore.getState().reset()
  })

  // ── Renders scenario + question ────────────────────────────────────

  it('renders scenario text', () => {
    renderScreen('0')

    expect(screen.getByText(/patient presents with chest pain/i)).toBeInTheDocument()
  })

  it('renders question text', () => {
    renderScreen('0')

    expect(screen.getByText(/what is the priority intervention/i)).toBeInTheDocument()
  })

  it('renders XP tag', () => {
    renderScreen('0')

    expect(screen.getByText('+20 XP')).toBeInTheDocument()
  })

  // ── Renders all 4 options ──────────────────────────────────────────

  it('renders all 4 answer options', () => {
    renderScreen('0')

    expect(screen.getByText('A. Morphine')).toBeInTheDocument()
    expect(screen.getByText('B. Consent')).toBeInTheDocument()
    expect(screen.getByText('C. IV access')).toBeInTheDocument()
    expect(screen.getByText('D. Notify provider')).toBeInTheDocument()
  })

  it('all options are disabled (read-only)', () => {
    renderScreen('0')

    const optButtons = screen.getAllByRole('button').filter((b) =>
      b.className.includes('ans-opt'),
    )
    optButtons.forEach((b) => expect(b).toBeDisabled())
  })

  // ── Correct/wrong highlighting ─────────────────────────────────────

  it('correct answer has correct class', () => {
    renderScreen('0')

    const correctBtn = screen.getByText('A. Morphine')
    expect(correctBtn.className).toContain('correct')
  })

  it('student wrong pick has wrong class', () => {
    // Card 2 — student picked B. Consent (index 1) but correct is A (index 0)
    renderScreen('1')

    const wrongBtn = screen.getByText('B. Consent')
    expect(wrongBtn.className).toContain('wrong')
  })

  it('does not mark wrong on correctly answered card', () => {
    renderScreen('0')

    // Card 1 — student picked A and was correct; no options should have wrong class
    const buttons = screen.getAllByRole('button').filter((b) =>
      b.className.includes('ans-opt'),
    )
    for (const b of buttons) {
      expect(b.className).not.toContain('wrong')
    }
  })

  // ── Why-wrong box ──────────────────────────────────────────────────

  it('shows why-wrong explanation for wrong answers', () => {
    renderScreen('1')

    expect(screen.getByText(/consent is a later step/i)).toBeInTheDocument()
  })

  it('does not show why-wrong for correct answers', () => {
    renderScreen('0')

    expect(screen.queryByText(/consent is a later step/i)).not.toBeInTheDocument()
  })

  // ── CCCC layers ────────────────────────────────────────────────────

  it('renders SNL Method layers section', () => {
    renderScreen('0')

    expect(screen.getByText('SNL Method Breakdown')).toBeInTheDocument()
  })

  it('auto-reveals Core Problem layer', () => {
    renderScreen('0')

    expect(screen.getByText('Core problem')).toBeInTheDocument()
  })

  it('unlocks Complication layer content on tap', async () => {
    const user = userEvent.setup()
    renderScreen('0')

    // Before tap: only Core Problem content is visible
    expect(screen.queryByText('Complication', { selector: '.layer-content' })).not.toBeInTheDocument()

    await user.click(screen.getByTestId('layer-1'))

    // After tap: the Complication layer content appears (layers[1])
    expect(screen.getByText('Complication', { exact: false, selector: '.layer-content' })).toBeInTheDocument()
  })

  // ── Back button ────────────────────────────────────────────────────

  it('renders Back to Results button', () => {
    renderScreen('0')

    expect(screen.getByText('Back to Results')).toBeInTheDocument()
  })

  it('Back to Results navigates to /session/review', async () => {
    const user = userEvent.setup()
    renderScreen('0')

    await user.click(screen.getByText('Back to Results'))

    expect(screen.getByText('Review List')).toBeInTheDocument()
  })

  // ── Edge cases ─────────────────────────────────────────────────────

  it('shows "Card not found" when cardIdx is out of range', () => {
    renderScreen('99')

    expect(screen.getByText(/card not found/i)).toBeInTheDocument()
  })

  it('shows "Card not found" when shuffle is missing', () => {
    useSessionStore.setState({
      cards: [makeCard('1')],
      shuffles: [],
      answers: [0],
      results: [true],
    })
    renderScreen('0')

    expect(screen.getByText(/card not found/i)).toBeInTheDocument()
  })

  it('back button is shown on "not found" error state', async () => {
    const user = userEvent.setup()
    renderScreen('99')

    await user.click(screen.getByText(/back to results/i))

    expect(screen.getByText('Review List')).toBeInTheDocument()
  })
})
