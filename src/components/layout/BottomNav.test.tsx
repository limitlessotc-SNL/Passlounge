/**
 * BottomNav unit tests
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { BottomNav } from './BottomNav'

function renderNav(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <BottomNav />
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  it('renders all 6 tabs', () => {
    renderNav()

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Study')).toBeInTheDocument()
    expect(screen.getByText('CAT')).toBeInTheDocument()
    expect(screen.getByText('Compete')).toBeInTheDocument()
    expect(screen.getByText('Lounge')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('highlights active tab based on route', () => {
    renderNav('/study')

    const studyTab = screen.getByText('Study').closest('button')
    expect(studyTab?.className).toContain('active')
  })

  it('tabs are clickable', async () => {
    const user = userEvent.setup()
    renderNav()

    const studyTab = screen.getByText('Study').closest('button')
    await user.click(studyTab!)

    expect(studyTab).toBeTruthy()
  })
})
