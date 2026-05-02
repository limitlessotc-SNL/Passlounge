/**
 * BottomNav
 *
 * 6-tab navigation bar matching the original HTML design.
 * Tabs: Home, Study, CAT, Inbox, Lounge, Profile.
 * The Inbox tab carries an unread-message badge fed by useUnreadCount,
 * which polls every 30s.
 */

import { useLocation, useNavigate } from 'react-router-dom'

import { useUnreadCount } from '@/features/messaging/useUnreadCount'
import { useAuthStore } from '@/store/authStore'
import type { AppTab } from '@/types'

interface TabConfig {
  id: AppTab;
  icon: string;
  label: string;
  path: string;
}

const TABS: TabConfig[] = [
  { id: 'home',    icon: '🏠', label: 'Home',    path: '/' },
  { id: 'study',   icon: '⚡', label: 'Study',   path: '/study' },
  { id: 'cat',     icon: '🐱', label: 'CAT',     path: '/cat' },
  { id: 'inbox',   icon: '💬', label: 'Inbox',   path: '/inbox' },
  { id: 'lounge',  icon: '🏆', label: 'Lounge',  path: '/lounge' },
  { id: 'profile', icon: '👤', label: 'Profile', path: '/profile' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const studentId = useAuthStore((s) => s.supaStudentId) ?? ''
  const unread = useUnreadCount(studentId)

  const activeTab = TABS.find((t) => t.path === location.pathname)?.id ?? 'home'

  return (
    <div className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab${tab.id === activeTab ? ' active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span
            className="nav-tab-icon"
            style={{ position: 'relative', display: 'inline-block' }}
          >
            {tab.icon}
            {tab.id === 'inbox' && unread > 0 && (
              <span
                data-testid="inbox-unread-badge"
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'rgba(248,113,113,0.95)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Outfit', sans-serif",
                  lineHeight: 1,
                }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
          <span className="nav-tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
