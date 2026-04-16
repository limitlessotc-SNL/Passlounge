/**
 * ReviewScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/store/sessionStore'
import type { StudyCard } from '@/types'

import { ReviewScreen } from './ReviewScreen'

const makeCard = (id: string, cat = 'Cardiac'): StudyCard => ({
  id,
  cat,
  bloom: 'Apply',
  xp: 20,
  title: `Card ${id}`,
  type: 'Multiple Choice',
  scenario: 'Scenario...',
  question: 'Question?',
  opts: ['A. One', 'B. Two', 'C. Three', 'D. Four'],
  correct: 0,
  layers: ['L1', 'L2', 'L3', 'L4'],
  lens: 'Lens',
  pearl: 'Pearl',
  mnemonic: [],
  why_wrong: {},
})

function renderScreen() {
  return render(
    <MemoryRouter>
      <ReviewScreen />
    </MemoryRouter>,
  )
}

describe('ReviewScreen', () => {
  beforeEach(() => {
    const cards = [makeCard('1'), makeCard('2', 'Pharmacology'), makeCard('3')]
    useSessionStore.getState().startSession(cards, false)
    useSessionStore.getState().recordAnswer(0, 0, true, 20)
    useSessionStore.getState().recordAnswer(1, 2, false, 0)
    useSessionStore.getState().recordAnswer(2, 0, true, 20)
    useSessionStore.getState().endSession()
  })

  afterEach(() => {
    useSessionStore.getState().reset()
  })

  it('renders session complete header', () => {
    renderScreen()

    expect(screen.getByText('Session Complete')).toBeInTheDocument()
  })

  it('renders correct count', () => {
    renderScreen()

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Correct')).toBeInTheDocument()
  })

  it('renders wrong count', () => {
    renderScreen()

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('renders XP count', () => {
    renderScreen()

    // 50 base + 20 + 0 + 20 = 90
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('XP')).toBeInTheDocument()
  })

  it('renders all 3 card items', () => {
    renderScreen()

    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('Card 3')).toBeInTheDocument()
  })

  it('marks wrong cards with priority review', () => {
    renderScreen()

    expect(screen.getByText(/priority review/i)).toBeInTheDocument()
  })

  it('shows category for each card', () => {
    renderScreen()

    expect(screen.getAllByText(/cardiac/i).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/pharmacology/i)).toBeInTheDocument()
  })

  it('renders review buttons for each card', () => {
    renderScreen()

    const reviewBtns = screen.getAllByText('Review →')
    expect(reviewBtns.length).toBe(3)
  })

  it('renders Study and Home navigation buttons', () => {
    renderScreen()

    expect(screen.getByText('Study')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('wrong card items have wrong-item class', () => {
    renderScreen()

    const card2 = screen.getByText('Card 2').closest('.review-list-item')
    expect(card2?.className).toContain('wrong-item')
  })

  it('correct card items do not have wrong-item class', () => {
    renderScreen()

    const card1 = screen.getByText('Card 1').closest('.review-list-item')
    expect(card1?.className).not.toContain('wrong-item')
  })

  it('renders SNL Method subtitle', () => {
    renderScreen()

    expect(screen.getByText(/snl method/i)).toBeInTheDocument()
  })

  it('renders description text', () => {
    renderScreen()

    expect(screen.getByText(/tap any card to review/i)).toBeInTheDocument()
  })
})
