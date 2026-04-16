/**
 * BottomNav
 *
 * 6-tab navigation bar matching the original HTML design.
 * Tabs: Home, Study, CAT, Compete, Lounge, Profile
 *
 * Owner: Senior Engineer
 */

import { useLocation, useNavigate } from 'react-router-dom'

import type { AppTab } from '@/types'

interface TabConfig {
  id: AppTab;
  icon: string;
  label: string;
  path: string;
}

const TABS: TabConfig[] = [
  { id: 'home', icon: '🏠', label: 'Home', path: '/' },
  { id: 'study', icon: '⚡', label: 'Study', path: '/study' },
  { id: 'cat', icon: '🐱', label: 'CAT', path: '/cat' },
  { id: 'compete', icon: '⚔️', label: 'Compete', path: '/compete' },
  { id: 'lounge', icon: '🏆', label: 'Lounge', path: '/lounge' },
  { id: 'profile', icon: '👤', label: 'Profile', path: '/profile' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = TABS.find((t) => t.path === location.pathname)?.id ?? 'home'

  return (
    <div className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab${tab.id === activeTab ? ' active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="nav-tab-icon">{tab.icon}</span>
          <span className="nav-tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
