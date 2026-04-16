/**
 * AppLayout
 *
 * Main app layout with BottomNav for authenticated screens.
 * Wraps the Outlet with scrollable content area and bottom padding.
 *
 * Owner: Senior Engineer
 */

import { Outlet } from 'react-router-dom'

import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <>
      <div className="content scrollable" style={{ paddingBottom: 100 }}>
        <Outlet />
      </div>
      <BottomNav />
    </>
  )
}
