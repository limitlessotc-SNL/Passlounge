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

  it('renders attempt date and overall result inputs', () => {
    renderScreen()
    expect(screen.getByLabelText(/attempt date/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pass/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fail/i })).toBeInTheDocument()
  })

  it('clicking a level button updates the store', async () => {
    const user = userEvent.setup()
    renderScreen()

    const firstCat = CPR_CATEGORIES[0]
    await user.click(screen.getByRole('radio', { name: new RegExp(`${firstCat.label} below`, 'i') }))

    expect(useCPRStore.getState().draft.categories[firstCat.id]).toBe('below')
  })

  it('overall result toggles on/off', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /pass/i }))
    expect(useCPRStore.getState().draft.overall_result).toBe('pass')

    await user.click(screen.getByRole('button', { name: /pass/i }))
    expect(useCPRStore.getState().draft.overall_result).toBeNull()
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

  it('Back navigates to /cpr/upload (preserves onboarding query)', async () => {
    const user = userEvent.setup()
    renderScreen('/cpr/entry?from=onboarding')

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/cpr/upload?from=onboarding')
  })
})
