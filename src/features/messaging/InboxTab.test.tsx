// src/features/messaging/InboxTab.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: { auth_id: 'coach-auth-1' }, error: null })),
    })),
  },
}))

vi.mock('@/features/coach/coach.service', () => ({
  getStudentCohort: vi.fn(),
}))

vi.mock('./messaging.service', () => ({
  fetchConversationWithCoach: vi.fn(),
  fetchAnnouncements:        vi.fn(),
  fetchStudentInbox:         vi.fn(),
  sendMessageToCoach:        vi.fn(),
  markMessagesAsRead:        vi.fn(),
}))

import { useAuthStore } from '@/store/authStore'
import { getStudentCohort } from '@/features/coach/coach.service'

import {
  fetchAnnouncements,
  fetchConversationWithCoach,
  fetchStudentInbox,
  sendMessageToCoach,
} from './messaging.service'

import { InboxTab } from './InboxTab'

const mockGetCohort     = vi.mocked(getStudentCohort)
const mockFetchThread   = vi.mocked(fetchConversationWithCoach)
const mockFetchAnn      = vi.mocked(fetchAnnouncements)
const mockFetchInbox    = vi.mocked(fetchStudentInbox)
const mockSend          = vi.mocked(sendMessageToCoach)

function renderTab() {
  return render(
    <MemoryRouter>
      <InboxTab />
    </MemoryRouter>,
  )
}

const fakeMembership = {
  cohort: {
    id: 'co1', school_id: 's1', coach_id: 'coach-row-id',
    name: 'NUR 425', cohort_code: 'NUR425', target_test_date: null,
    is_active: true, created_at: '',
  },
  coachName: 'Coach Bee',
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    user: { id: 'stu-1', email: 'a@b.com' },
    supaStudentId: 'stu-1',
    token: 'tok',
    isAuthenticated: true,
    isLoading: false,
  })
  mockFetchThread.mockResolvedValue([])
  mockFetchAnn.mockResolvedValue([])
  mockFetchInbox.mockResolvedValue([])
  mockSend.mockResolvedValue()
})

afterEach(() => {
  vi.restoreAllMocks()
  useAuthStore.getState().logout()
})

describe('InboxTab', () => {
  it('renders the empty state when student is not in a cohort', async () => {
    mockGetCohort.mockResolvedValue(null)
    renderTab()
    await waitFor(() => {
      expect(screen.getByTestId('inbox-empty-no-cohort')).toBeTruthy()
    })
    expect(screen.getByText(/Join a cohort to message your coach/i)).toBeTruthy()
    expect(screen.getByTestId('inbox-go-profile')).toBeTruthy()
  })

  it('renders messages when student is in a cohort', async () => {
    mockGetCohort.mockResolvedValue(fakeMembership)
    mockFetchThread.mockResolvedValue([
      {
        id: 'm1', sender_id: 'coach-auth-1', recipient_id: 'stu-1',
        cohort_id: 'co1', subject: '', body: 'Hello from coach',
        read_at: null, created_at: new Date().toISOString(),
        is_announcement: false, sender_name: 'Coach Bee',
      },
    ])
    renderTab()
    await waitFor(() => {
      expect(screen.getByTestId('inbox-thread')).toBeTruthy()
    })
    expect(screen.getByText('Hello from coach')).toBeTruthy()
  })

  it('renders the announcements section when announcements exist', async () => {
    mockGetCohort.mockResolvedValue(fakeMembership)
    mockFetchAnn.mockResolvedValue([
      {
        id: 'a1', sender_id: 'coach-auth-1', recipient_id: 'stu-1',
        cohort_id: 'co1', subject: 'Reminder', body: 'Test on Friday',
        read_at: null, created_at: new Date().toISOString(),
        is_announcement: true, sender_name: 'Coach Bee',
      },
    ])
    renderTab()
    await waitFor(() => {
      expect(screen.getByTestId('inbox-announcements')).toBeTruthy()
    })
  })

  it('renders the composer when in a cohort', async () => {
    mockGetCohort.mockResolvedValue(fakeMembership)
    renderTab()
    await waitFor(() => {
      expect(screen.getByTestId('inbox-composer')).toBeTruthy()
    })
    expect(screen.getByLabelText(/New message/i)).toBeTruthy()
  })

  it('Send calls sendMessageToCoach with the right payload', async () => {
    mockGetCohort.mockResolvedValue(fakeMembership)
    const user = userEvent.setup()
    renderTab()

    await waitFor(() => screen.getByTestId('inbox-composer'))
    await user.type(screen.getByLabelText(/New message/i), 'Hi coach')
    fireEvent.click(screen.getByTestId('inbox-send-btn'))

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        recipient_id: 'coach-auth-1',
        body: 'Hi coach',
        cohort_id: 'co1',
      }))
    })
  })
})
