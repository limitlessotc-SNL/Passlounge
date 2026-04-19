/**
 * CPREntryScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CPR_CATEGORIES } from '@/config/cpr-categories'
import { useCPRStore } from '@/store/cprStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { CPREntryScreen } from './CPREntryScreen'

function renderScreen(initialPath = '/cpr/entry') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CPREntryScreen />
    </MemoryRouter>,
  )
}

function fillAllCategories(level: 'above' | 'near' | 'below' = 'near') {
  for (const c of CPR_CATEGORIES) {
    useCPRStore.getState().setCategoryResult(c.id, level)
  }
}

describe('CPREntryScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  afterEach(() => {
    useCPRStore.setState({
      draft: { attempt_date: null, overall_result: null, image_path: null, categories: {} },
      latest: null,
      isLoading: false,
      isSaving: false,
      error: null,
    })
  })

  it('renders title and all 8 category rows', () => {
    renderScreen()
    expect(screen.getByText(/how did you score/i)).toBeInTheDocument()
    for (const c of CPR_CATEGORIES) {
      expect(screen.getByText(c.label)).toBeInTheDocument()
    }
  })

  it('renders attempt date input', () => {
    renderScreen()
    expect(screen.getByLabelText(/attempt date/i)).toBeInTheDocument()
  })

  it('does not show the legacy overall-result pass/fail toggle', () => {
    renderScreen()
    expect(screen.queryByRole('button', { name: /^pass$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^fail$/i })).not.toBeInTheDocument()
  })

  it('clicking a level button updates the store', async () => {
    const user = userEvent.setup()
    renderScreen()

    const firstCat = CPR_CATEGORIES[0]
    await user.click(screen.getByRole('radio', { name: new RegExp(`${firstCat.label} below`, 'i') }))

    expect(useCPRStore.getState().draft.categories[firstCat.id]).toBe('below')
  })


  it('Review button is disabled until all 8 categories are answered', () => {
    renderScreen()
    const btn = screen.getByRole('button', { name: /review/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('Review button enables when every category has a result', () => {
    fillAllCategories('above')
    renderScreen()
    const btn = screen.getByRole('button', { name: /review/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('Review navigates to /cpr/review (preserves onboarding query)', async () => {
    fillAllCategories('above')
    const user = userEvent.setup()
    renderScreen('/cpr/entry?from=onboarding')

    await user.click(screen.getByRole('button', { name: /review/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/cpr/review?from=onboarding')
  })

  it('Back navigates to /onboarding in onboarding mode', async () => {
    const user = userEvent.setup()
    renderScreen('/cpr/entry?from=onboarding')

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding')
  })

  it('Back navigates to / when not onboarding', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows "Skip CPR for now" only in onboarding mode', () => {
    renderScreen('/cpr/entry?from=onboarding')
    expect(screen.getByRole('button', { name: /skip cpr for now/i })).toBeInTheDocument()
  })

  it('does not show skip button outside onboarding', () => {
    renderScreen()
    expect(screen.queryByRole('button', { name: /skip cpr for now/i })).not.toBeInTheDocument()
  })

  it('Skip button routes to /onboarding/confidence', async () => {
    const user = userEvent.setup()
    renderScreen('/cpr/entry?from=onboarding')

    await user.click(screen.getByRole('button', { name: /skip cpr for now/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding/confidence')
  })
})
