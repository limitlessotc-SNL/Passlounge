/**
 * DiagInfoScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { DiagInfoScreen } from './DiagInfoScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <DiagInfoScreen />
    </MemoryRouter>,
  )
}

describe('DiagInfoScreen', () => {
  it('renders diagnostic assessment header', () => {
    renderScreen()

    expect(screen.getByText('Diagnostic Assessment')).toBeInTheDocument()
  })

  it('renders title text', () => {
    renderScreen()

    expect(screen.getByText(/this is your/i)).toBeInTheDocument()
    expect(screen.getByText(/baseline test/i)).toBeInTheDocument()
  })

  it('renders description text', () => {
    renderScreen()

    expect(screen.getByText(/answer every question/i)).toBeInTheDocument()
  })

  it('renders 15 questions info', () => {
    renderScreen()

    expect(screen.getByText('15 Questions')).toBeInTheDocument()
    expect(screen.getByText(/across 5 clinical categories/i)).toBeInTheDocument()
  })

  it('renders test mode only info', () => {
    renderScreen()

    expect(screen.getByText('Test Mode Only')).toBeInTheDocument()
    expect(screen.getByText(/no cccc/i)).toBeInTheDocument()
  })

  it('renders one time only info', () => {
    renderScreen()

    expect(screen.getByText('One Time Only')).toBeInTheDocument()
    expect(screen.getByText(/this assessment never repeats/i)).toBeInTheDocument()
  })

  it('renders start button', () => {
    renderScreen()

    expect(screen.getByText(/i'm ready/i)).toBeInTheDocument()
  })

  it('renders honesty note', () => {
    renderScreen()

    expect(screen.getByText(/answer honestly/i)).toBeInTheDocument()
  })

  it('renders target emoji', () => {
    renderScreen()

    expect(screen.getByText('🎯')).toBeInTheDocument()
  })

  it('renders all 3 info icons', () => {
    renderScreen()

    expect(screen.getByText('📋')).toBeInTheDocument()
    expect(screen.getByText('⚡')).toBeInTheDocument()
    expect(screen.getByText('🔒')).toBeInTheDocument()
  })
})
