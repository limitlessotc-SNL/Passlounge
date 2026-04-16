/**
 * AppLayout unit tests
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  it('renders child route content and bottom nav', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
