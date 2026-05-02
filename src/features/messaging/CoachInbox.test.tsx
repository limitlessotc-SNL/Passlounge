// src/features/messaging/CoachInbox.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./messaging.service', () => ({
  fetchCoachInbox:        vi.fn(),
  sendMessageToStudent:   vi.fn(),
  markMessagesAsRead:     vi.fn(),
}))

import {
  fetchCoachInbox,
  sendMessageToStudent,
} from './messaging.service'
import type { Conversation } from './messaging.types'

import { CoachInbox } from './CoachInbox'

const mockFetch = vi.mocked(fetchCoachInbox)
const mockSend  = vi.mocked(sendMessageToStudent)

const fakeConv = (id: string, name: string, unread = 0): Conversation => ({
  other_party_id: id,
  other_party_name: name,
  other_party_avatar: null,
  other_party_role: 'student',
  last_message_body: `last from ${name}`,
  last_message_at: new Date().toISOString(),
  unread_count: unread,
  messages: [
    {
      id: `${id}-m1`, sender_id: id, recipient_id: 'coach-auth-1',
      cohort_id: null, subject: '', body: 'hi coach', read_at: null,
      created_at: new Date().toISOString(),
      is_announcement: false, sender_name: name,
    },
  ],
})

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockResolvedValue([])
  mockSend.mockResolvedValue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CoachInbox', () => {
  it('renders empty list when no conversations', async () => {
    render(
      <CoachInbox coachAuthId="coach-auth-1" cohorts={[]} onClose={vi.fn()} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('coach-conversation-list')).toBeTruthy()
    })
    expect(screen.getByText(/No conversations yet/i)).toBeTruthy()
  })

  it('renders conversations sorted by last_message_at (handled by service)', async () => {
    mockFetch.mockResolvedValue([
      fakeConv('stu1', 'Alice', 2),
      fakeConv('stu2', 'Bob'),
    ])
    render(
      <CoachInbox coachAuthId="coach-auth-1" cohorts={[]} onClose={vi.fn()} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('conv-row-stu1')).toBeTruthy()
    })
    expect(screen.getByTestId('conv-row-stu2')).toBeTruthy()
  })

  it('shows the unread badge when count > 0', async () => {
    mockFetch.mockResolvedValue([fakeConv('stu1', 'Alice', 3)])
    render(
      <CoachInbox coachAuthId="coach-auth-1" cohorts={[]} onClose={vi.fn()} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('conv-unread-badge').textContent).toBe('3')
    })
  })

  it('auto-selects the first conversation when not focusing a specific student', async () => {
    mockFetch.mockResolvedValue([fakeConv('stu1', 'Alice')])
    render(
      <CoachInbox coachAuthId="coach-auth-1" cohorts={[]} onClose={vi.fn()} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('coach-thread')).toBeTruthy()
    })
    expect(screen.getByText('hi coach')).toBeTruthy()
  })

  it('Send calls sendMessageToStudent with the right recipient', async () => {
    mockFetch.mockResolvedValue([fakeConv('stu1', 'Alice')])
    const user = userEvent.setup()
    render(
      <CoachInbox coachAuthId="coach-auth-1" cohorts={[]} onClose={vi.fn()} />,
    )
    await waitFor(() => screen.getByTestId('coach-thread'))

    await user.type(screen.getByLabelText(/Coach reply/i), 'Sounds good')
    fireEvent.click(screen.getByTestId('coach-send-btn'))

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        recipient_id: 'stu1',
        body: 'Sounds good',
      }))
    })
  })

  it('Announcement button opens the modal', async () => {
    render(
      <CoachInbox coachAuthId="coach-auth-1" cohorts={[]} onClose={vi.fn()} />,
    )
    await waitFor(() => screen.getByTestId('open-announcement-btn'))
    fireEvent.click(screen.getByTestId('open-announcement-btn'))
    expect(screen.getByTestId('announcement-modal')).toBeTruthy()
  })

  it('Close button calls onClose', async () => {
    const onClose = vi.fn()
    render(
      <CoachInbox coachAuthId="coach-auth-1" cohorts={[]} onClose={onClose} />,
    )
    await waitFor(() => screen.getByText(/Close/i))
    fireEvent.click(screen.getByText(/Close/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('focusStudentId pre-selects the right conversation', async () => {
    mockFetch.mockResolvedValue([
      fakeConv('stu1', 'Alice'),
      fakeConv('stu2', 'Bob'),
    ])
    render(
      <CoachInbox
        coachAuthId="coach-auth-1"
        cohorts={[]}
        focusStudentId="stu2"
        onClose={vi.fn()}
      />,
    )
    await waitFor(() => screen.getByTestId('coach-thread'))
    // Selected student name appears in both the conv row AND thread header
    const matches = screen.getAllByText('Bob')
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })
})
