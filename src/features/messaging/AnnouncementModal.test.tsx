// src/features/messaging/AnnouncementModal.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/coach/coach.service', () => ({
  getCohortStudents: vi.fn(),
}))

vi.mock('./messaging.service', () => ({
  sendAnnouncement: vi.fn(),
}))

import { getCohortStudents } from '@/features/coach/coach.service'
import type { Cohort } from '@/features/coach/coach.types'

import { sendAnnouncement } from './messaging.service'

import { AnnouncementModal } from './AnnouncementModal'

const mockGetMembers = vi.mocked(getCohortStudents)
const mockSend       = vi.mocked(sendAnnouncement)

const fakeCohort: Cohort = {
  id: 'co1', school_id: 's1', coach_id: 'coach-row-id',
  name: 'NUR 425', cohort_code: 'NUR425', target_test_date: null,
  is_active: true, created_at: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMembers.mockResolvedValue([
    { cohort_id: 'co1', student_id: 'stu1', joined_at: '', status: 'active' },
    { cohort_id: 'co1', student_id: 'stu2', joined_at: '', status: 'active' },
    { cohort_id: 'co1', student_id: 'stu3', joined_at: '', status: 'withdrawn' },
  ])
  mockSend.mockResolvedValue({ studentCount: 2 })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AnnouncementModal', () => {
  it('shows the active recipient count', async () => {
    render(
      <AnnouncementModal
        coachAuthId="coach-auth-1"
        cohorts={[fakeCohort]}
        onClose={vi.fn()}
        onSent={vi.fn()}
      />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('recipient-count').textContent).toMatch(/Will send to 2 students/)
    })
  })

  it('disables Send until title and body are filled', async () => {
    const user = userEvent.setup()
    render(
      <AnnouncementModal
        coachAuthId="coach-auth-1"
        cohorts={[fakeCohort]}
        onClose={vi.fn()}
        onSent={vi.fn()}
      />,
    )
    const btn = screen.getByTestId('send-announcement-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    await user.type(screen.getByLabelText(/Announcement title/i), 'Heads up')
    expect(btn.disabled).toBe(true)
    await user.type(screen.getByLabelText(/Announcement body/i), 'Read this')
    expect(btn.disabled).toBe(false)
  })

  it('Send calls sendAnnouncement and closes', async () => {
    const onSent  = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <AnnouncementModal
        coachAuthId="coach-auth-1"
        cohorts={[fakeCohort]}
        onClose={onClose}
        onSent={onSent}
      />,
    )
    await user.type(screen.getByLabelText(/Announcement title/i), 'Heads up')
    await user.type(screen.getByLabelText(/Announcement body/i), 'Read this')
    fireEvent.click(screen.getByTestId('send-announcement-btn'))
    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        'coach-auth-1', 'co1', 'Heads up', 'Read this', false,
      )
    })
    expect(onSent).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('Cancel closes without sending', async () => {
    const onClose = vi.fn()
    render(
      <AnnouncementModal
        coachAuthId="coach-auth-1"
        cohorts={[fakeCohort]}
        onClose={onClose}
        onSent={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText(/Cancel/i))
    expect(onClose).toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('shows the cohort selector when there are multiple cohorts', async () => {
    const second: Cohort = { ...fakeCohort, id: 'co2', name: 'NUR 426' }
    render(
      <AnnouncementModal
        coachAuthId="coach-auth-1"
        cohorts={[fakeCohort, second]}
        onClose={vi.fn()}
        onSent={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/^Cohort$/i)).toBeTruthy()
  })
})
