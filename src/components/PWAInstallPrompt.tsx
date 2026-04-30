// src/components/PWAInstallPrompt.tsx
//
// Subtle bottom-of-screen banner that prompts the user to install PassLounge
// as a PWA. Two flavours:
//
//   • Android / Chrome: listen for the standardised `beforeinstallprompt`
//     event, capture it, and replay it from an [Add] button.
//   • iOS Safari: no programmatic install API exists — show a static hint
//     pointing at the Share → Add to Home Screen flow.
//
// Dismissal is sticky for 30 days via localStorage so we don't nag.

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'pl_pwa_prompt_dismissed_at'
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const GOLD = '#F5C518'

// `BeforeInstallPromptEvent` is not in lib.dom yet, so we declare what we use.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Safari standalone flag (added on `navigator`, not in TS lib).
interface SafariNavigator extends Navigator {
  standalone?: boolean
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // Chromium / Firefox use the standard display-mode media query.
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // Safari iOS exposes a non-standard navigator.standalone bool.
  return Boolean((window.navigator as SafariNavigator).standalone)
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
}

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const at = window.localStorage.getItem(STORAGE_KEY)
    if (!at) return false
    const ms = Number(at)
    if (!Number.isFinite(ms)) return false
    return Date.now() - ms < DISMISS_TTL_MS
  } catch {
    return false
  }
}

function markDismissed(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // localStorage unavailable (private browsing, quota) — fine, just don't persist.
  }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosVisible, setIosVisible]         = useState(false)
  const [hidden, setHidden]                 = useState(false)

  useEffect(() => {
    if (readDismissed()) return
    if (isStandalone()) return // Already installed, nothing to do.

    if (isIOSDevice()) {
      setIosVisible(true)
      return
    }

    function handler(e: Event) {
      // Prevent the default mini-infobar Chrome shows so we can render our own.
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    // Once installed, hide the prompt immediately.
    function onInstalled() { setHidden(true); markDismissed() }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden) return null

  if (deferredPrompt) {
    return (
      <Banner
        testId="pwa-install-android"
        message="Add PassLounge to your home screen"
        primary={{
          label: 'Add',
          onClick: async () => {
            try {
              await deferredPrompt.prompt()
              await deferredPrompt.userChoice
            } catch {
              // Browser may reject prompt() if already invoked — fall through.
            }
            setDeferredPrompt(null)
          },
        }}
        secondary={{
          label: 'Not now',
          onClick: () => {
            markDismissed()
            setDeferredPrompt(null)
          },
        }}
      />
    )
  }

  if (iosVisible) {
    return (
      <Banner
        testId="pwa-install-ios"
        message={(
          <>
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install
          </>
        )}
        primary={{
          label: 'Got it',
          onClick: () => {
            markDismissed()
            setIosVisible(false)
          },
        }}
      />
    )
  }

  return null
}

// ─── Banner sub-component ────────────────────────────────────────────

interface BannerAction {
  label: string
  onClick: () => void
}

function Banner({
  testId, message, primary, secondary,
}: {
  testId: string
  message: React.ReactNode
  primary: BannerAction
  secondary?: BannerAction
}) {
  return (
    <div
      data-testid={testId}
      role="dialog"
      aria-label="Install PassLounge"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 100,
        background: 'rgba(15,23,42,0.96)',
        border: '1px solid rgba(245,197,24,0.4)',
        borderRadius: 14,
        padding: '12px 14px',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
        {message}
      </div>
      {secondary && (
        <button
          type="button"
          onClick={secondary.onClick}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {secondary.label}
        </button>
      )}
      <button
        type="button"
        onClick={primary.onClick}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          background: GOLD,
          border: 'none',
          color: '#053571',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {primary.label}
      </button>
    </div>
  )
}
