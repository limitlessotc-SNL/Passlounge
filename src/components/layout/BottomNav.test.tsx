/**
 * BottomNav unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUseUnread } = vi.hoisted(() => ({
  mockUseUnread: vi.fn<(id: string) => number>(() => 0),
}))

vi.mock('@/features/messaging/useUnreadCount', () => ({
  useUnreadCount: (id: string) => mockUseUnread(id),
}))

import { useAuthStore } from '@/store/authStore'

import { BottomNav } from './BottomNav'

function renderNav(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <BottomNav />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseUnread.mockReturnValue(0)
  useAuthStore.setState({
    user: { id: 'stu-1', email: 't@t.com' },
    supaStudentId: 'stu-1',
    token: 'tok',
    isAuthenticated: true,
    isLoading: false,
  })
})

afterEach(() => {
  useAuthStore.getState().logout()
})

describe('BottomNav', () => {
  it('renders all 6 tabs (Inbox replaces Compete)', () => {
    renderNav()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Study')).toBeInTheDocument()
    expect(screen.getByText('CAT')).toBeInTheDocument()
    expect(screen.getByText('Inbox')).toBeInTheDocument()
    expect(screen.getByText('Lounge')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.queryByText('Compete')).not.toBeInTheDocument()
  })

  it('highlights active tab based on route', () => {
    renderNav('/study')
    const studyTab = screen.getByText('Study').closest('button')
    expect(studyTab?.className).toContain('active')
  })

  it('Inbox tab is highlighted on /inbox route', () => {
    renderNav('/inbox')
    const inboxTab = screen.getByText('Inbox').closest('button')
    expect(inboxTab?.className).toContain('active')
  })

  it('tabs are clickable', async () => {
    const user = userEvent.setup()
    renderNav()
    const studyTab = screen.getByText('Study').closest('button')
    await user.click(studyTab!)
    expect(studyTab).toBeTruthy()
  })

  it('does not show the unread badge when count is 0', () => {
    mockUseUnread.mockReturnValue(0)
    renderNav()
    expect(screen.queryByTestId('inbox-unread-badge')).toBeNull()
  })

  it('shows the unread badge with the count when count > 0', () => {
    mockUseUnread.mockReturnValue(3)
    renderNav()
    const badge = screen.getByTestId('inbox-unread-badge')
    expect(badge.textContent).toBe('3')
  })

  it('shows "9+" when unread > 9', () => {
    mockUseUnread.mockReturnValue(15)
    renderNav()
    expect(screen.getByTestId('inbox-unread-badge').textContent).toBe('9+')
  })
})
