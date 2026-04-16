/**
 * PlanReadyScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useStudentStore } from '@/store/studentStore'

import { PlanReadyScreen } from './PlanReadyScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <PlanReadyScreen />
    </MemoryRouter>,
  )
}

describe('PlanReadyScreen', () => {
  beforeEach(() => {
    useStudentStore.getState().setNickname('TestNurse')
  })

  afterEach(() => {
    useStudentStore.getState().reset()
  })

  it('renders title with nickname', () => {
    renderScreen()

    expect(screen.getByText('TestNurse')).toBeInTheDocument()
    expect(screen.getByText(/your plan is ready/i)).toBeInTheDocument()
  })

  it('renders coach note', () => {
    renderScreen()

    expect(screen.getByText(/a note from your coach/i)).toBeInTheDocument()
  })

  it('renders CTA button', () => {
    renderScreen()

    expect(screen.getByText(/enter the lounge/i)).toBeInTheDocument()
  })

  it('renders target icon', () => {
    renderScreen()

    expect(screen.getByText('🎯')).toBeInTheDocument()
  })
})
