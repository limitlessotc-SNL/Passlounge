/**
 * DiagResultsScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useDashboardStore } from '@/store/dashboardStore'
import { useSessionStore } from '@/store/sessionStore'
import { useStudentStore } from '@/store/studentStore'
import type { StudyCard } from '@/types'

import { DiagResultsScreen } from './DiagResultsScreen'

const makeCard = (cat: string): StudyCard => ({
  cat,
  bloom: 'Apply',
  xp: 20,
  title: `${cat} Card`,
  type: 'MC',
  scenario: 'Scenario',
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
      <DiagResultsScreen />
    </MemoryRouter>,
  )
}

describe('DiagResultsScreen', () => {
  beforeEach(() => {
    useStudentStore.getState().setNickname('TestNurse')

    // Set up session state as if diagnostic just completed
    const cards = [
      makeCard('Cardiac'), makeCard('Cardiac'), makeCard('Cardiac'),
      makeCard('Pharmacology'), makeCard('Pharmacology'), makeCard('Pharmacology'),
      makeCard('Respiratory'), makeCard('Respiratory'), makeCard('Respiratory'),
      makeCard('OB/Maternity'), makeCard('OB/Maternity'), makeCard('OB/Maternity'),
      makeCard('Mental Health'), makeCard('Mental Health'), makeCard('Mental Health'),
    ]
    useSessionStore.getState().startSession(cards, true)
    // Record answers: 10 correct, 5 wrong
    for (let i = 0; i < 10; i++) useSessionStore.getState().recordAnswer(i, 0, true, 20)
    for (let i = 10; i < 15; i++) useSessionStore.getState().recordAnswer(i, 1, false, 0)
    useSessionStore.getState().endSession()
  })

  afterEach(() => {
    useSessionStore.getState().reset()
    useStudentStore.getState().reset()
    useDashboardStore.setState({
      diagnosticResult: { completed: false, correct: 0, total: 0, catLevel: '—', results: [] },
      sessionHistory: [],
      plStats: { cards: 0, xp: 50, sessions: 0 },
      streakDays: 1,
      seenCardTitles: {},
    })
  })

  it('renders diagnostic complete header', () => {
    renderScreen()

    expect(screen.getByText('Diagnostic Complete')).toBeInTheDocument()
  })

  it('renders nickname in title', () => {
    renderScreen()

    expect(screen.getByText('TestNurse')).toBeInTheDocument()
  })

  it('renders score card', () => {
    renderScreen()

    expect(screen.getByText('10/15')).toBeInTheDocument()
    expect(screen.getByText('Score')).toBeInTheDocument()
  })

  it('renders accuracy percentage', () => {
    renderScreen()

    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('Accuracy')).toBeInTheDocument()
  })

  it('renders CAT level', () => {
    renderScreen()

    expect(screen.getByText('2.5')).toBeInTheDocument()
    expect(screen.getByText('CAT Level')).toBeInTheDocument()
  })

  it('renders grade description', () => {
    renderScreen()

    expect(screen.getByText(/developing/i)).toBeInTheDocument()
  })

  it('renders category breakdown section', () => {
    renderScreen()

    expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
  })

  it('renders all 5 category names', () => {
    renderScreen()

    expect(screen.getByText('Cardiac')).toBeInTheDocument()
    expect(screen.getByText('Pharmacology')).toBeInTheDocument()
    expect(screen.getByText('Respiratory')).toBeInTheDocument()
    expect(screen.getByText('OB/Maternity')).toBeInTheDocument()
    expect(screen.getByText('Mental Health')).toBeInTheDocument()
  })

  it('renders study plan section', () => {
    renderScreen()

    expect(screen.getByText('Your Study Plan')).toBeInTheDocument()
    expect(screen.getByText(/recommended study order/i)).toBeInTheDocument()
  })

  it('renders dashboard button', () => {
    renderScreen()

    expect(screen.getByText(/go to my dashboard/i)).toBeInTheDocument()
  })

  it('renders study plan subtitle', () => {
    renderScreen()

    expect(screen.getByText(/your personalized study plan/i)).toBeInTheDocument()
  })

  it('renders grade icon', () => {
    renderScreen()

    expect(screen.getByText('📈')).toBeInTheDocument()
  })

  it('renders numbered study order', () => {
    renderScreen()

    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
  })
})
