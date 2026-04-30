// src/components/PWAInstallPrompt.test.tsx

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PWAInstallPrompt } from './PWAInstallPrompt'

const STORAGE_KEY = 'pl_pwa_prompt_dismissed_at'

const ORIGINAL_UA = navigator.userAgent

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    get: () => ua,
  })
}

function clearStandalone() {
  // Drop the Safari-specific bool; jsdom doesn't have it but we may have set it.
  delete (navigator as { standalone?: boolean }).standalone
}

function fireBeforeInstallPrompt() {
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

beforeEach(() => {
  localStorage.clear()
  clearStandalone()
  setUserAgent('Mozilla/5.0 (X11; Linux x86_64)') // non-iOS default
})

afterEach(() => {
  setUserAgent(ORIGINAL_UA)
  clearStandalone()
  localStorage.clear()
})

describe('PWAInstallPrompt', () => {
  it('renders nothing on a non-iOS browser before any beforeinstallprompt event', () => {
    render(<PWAInstallPrompt />)
    expect(screen.queryByTestId('pwa-install-android')).toBeNull()
    expect(screen.queryByTestId('pwa-install-ios')).toBeNull()
  })

  it('shows the iOS hint when userAgent is iPhone and not standalone', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit')
    render(<PWAInstallPrompt />)
    expect(screen.getByTestId('pwa-install-ios')).toBeTruthy()
    expect(screen.getByText(/Add to Home Screen/i)).toBeTruthy()
  })

  it('does NOT show iOS hint when already running standalone', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
    render(<PWAInstallPrompt />)
    expect(screen.queryByTestId('pwa-install-ios')).toBeNull()
  })

  it('iOS Got-it button persists dismissal in localStorage', () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0)')
    render(<PWAInstallPrompt />)
    fireEvent.click(screen.getByText(/Got it/i))
    expect(screen.queryByTestId('pwa-install-ios')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('respects an existing dismissal — renders nothing on iOS', () => {
    setUserAgent('Mozilla/5.0 (iPhone)')
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    render(<PWAInstallPrompt />)
    expect(screen.queryByTestId('pwa-install-ios')).toBeNull()
  })

  it('expired dismissal (>30 days old) shows the prompt again', () => {
    setUserAgent('Mozilla/5.0 (iPhone)')
    const oldTs = Date.now() - 31 * 24 * 60 * 60 * 1000
    localStorage.setItem(STORAGE_KEY, String(oldTs))
    render(<PWAInstallPrompt />)
    expect(screen.getByTestId('pwa-install-ios')).toBeTruthy()
  })

  it('shows the Android banner after a beforeinstallprompt event', () => {
    render(<PWAInstallPrompt />)
    fireBeforeInstallPrompt()
    expect(screen.getByTestId('pwa-install-android')).toBeTruthy()
  })

  it('Add button calls prompt() and clears the banner', async () => {
    render(<PWAInstallPrompt />)
    const event = fireBeforeInstallPrompt()
    fireEvent.click(screen.getByText(/^Add$/i))
    // The prompt() call is async; allow the tick.
    await act(async () => { await Promise.resolve() })
    expect(event.prompt).toHaveBeenCalled()
  })

  it('Not now button persists dismissal and hides the banner', () => {
    render(<PWAInstallPrompt />)
    fireBeforeInstallPrompt()
    fireEvent.click(screen.getByText(/Not now/i))
    expect(screen.queryByTestId('pwa-install-android')).toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})
