// src/services/analytics.ts
//
// Thin wrapper around posthog-js. All public functions short-circuit when
// VITE_POSTHOG_KEY is empty, so the rest of the app can call them
// unconditionally — analytics is opt-in via env, not via runtime checks
// at every callsite.

import posthog from 'posthog-js';

import { env } from '@/config/env';

let initialized = false;

export function initAnalytics(): void {
  if (!env.posthogKey) return;
  if (initialized) return;
  posthog.init(env.posthogKey, {
    api_host: env.posthogHost,
    capture_pageview: false, // we handle SPA route changes manually
    capture_pageleave: true,
    persistence: 'localStorage',
    autocapture: true,
    session_recording: {
      maskAllInputs: true,         // never record passwords / freeform input
      maskInputOptions: {
        password: true,
        email: false,              // emails ok to record (we already have them server-side)
      },
    },
  });
  initialized = true;
}

export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (!env.posthogKey) return;
  posthog.identify(userId, properties);
}

export function resetUser(): void {
  if (!env.posthogKey) return;
  posthog.reset();
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!env.posthogKey) return;
  posthog.capture(event, properties);
}

export function trackPageView(path: string): void {
  if (!env.posthogKey) return;
  posthog.capture('$pageview', { $current_url: path });
}

// Test-only — reset internal init state so a fresh init can be tested.
export function _resetForTest(): void {
  initialized = false;
}
