/**
 * CPRUploadScreen unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCPRStore } from '@/store/cprStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../services/cpr.service', () => ({
  getLatestCPRReport: vi.fn(),
  insertCPRReport: vi.fn(),
  uploadCPRPhoto: vi.fn(),
}))

// jsdom doesn't implement URL.createObjectURL — stub it
beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: () => 'blob:mock',
  })
})

import { CPRUploadScreen } from './CPRUploadScreen'

function renderScreen(initialPath = '/cpr/upload') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CPRUploadScreen />
    </MemoryRouter>,
  )
}

describe('CPRUploadScreen', () => {
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

  it('renders title and upload CTA', () => {
    renderScreen()
    expect(screen.getByText(/upload your/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
  })

  it('shows Skip-photo button when no file attached', () => {
    renderScreen()
    expect(screen.getByRole('button', { name: /skip photo, enter manually/i })).toBeInTheDocument()
  })

  it('shows "Skip CPR for now" only in onboarding mode', () => {
    renderScreen('/cpr/upload?from=onboarding')
    expect(screen.getByRole('button', { name: /skip cpr for now/i })).toBeInTheDocument()
  })

  it('does not show Skip-CPR when not onboarding', () => {
    renderScreen()
    expect(screen.queryByRole('button', { name: /skip cpr for now/i })).not.toBeInTheDocument()
  })

  it('Skip-photo navigates to entry (preserves onboarding query)', async () => {
    const user = userEvent.setup()
    renderScreen('/cpr/upload?from=onboarding')

    await user.click(screen.getByRole('button', { name: /skip photo/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/cpr/entry?from=onboarding')
  })

  it('Skip-photo uses plain entry URL when not onboarding', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /skip photo/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/cpr/entry')
  })

  it('Skip-CPR routes straight to onboarding confidence', async () => {
    const user = userEvent.setup()
    renderScreen('/cpr/upload?from=onboarding')

    await user.click(screen.getByRole('button', { name: /skip cpr for now/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/onboarding/confidence')
  })

  it('uploading a file shows preview and swaps CTA text', async () => {
    const user = userEvent.setup()
    renderScreen()

    const file = new File(['x'], 'cpr.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload cpr photo/i) as HTMLInputElement
    await user.upload(input, file)

    expect(screen.getByAltText('CPR preview')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue to results/i })).toBeInTheDocument()
  })

  it('Retake clears preview and restores Take-Photo CTA', async () => {
    const user = userEvent.setup()
    renderScreen()

    const file = new File(['x'], 'cpr.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/upload cpr photo/i) as HTMLInputElement
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: /retake/i }))

    expect(screen.queryByAltText('CPR preview')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
  })
})
