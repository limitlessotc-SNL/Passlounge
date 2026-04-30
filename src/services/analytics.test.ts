// src/services/analytics.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist the posthog mock so vi.mock factory can reference it.
const { mockPosthog } = vi.hoisted(() => ({
  mockPosthog: {
    init:     vi.fn(),
    identify: vi.fn(),
    reset:    vi.fn(),
    capture:  vi.fn(),
  },
}));

vi.mock('posthog-js', () => ({
  default: mockPosthog,
}));

// env is a module-level const; mock it so we can flip posthogKey on/off.
const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    posthogKey: '',
    posthogHost: 'https://app.posthog.com',
  },
}));

vi.mock('@/config/env', () => ({
  env: mockEnv,
}));

import {
  _resetForTest,
  identifyUser,
  initAnalytics,
  resetUser,
  trackEvent,
  trackPageView,
} from './analytics';

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.posthogKey = '';
  mockEnv.posthogHost = 'https://app.posthog.com';
  _resetForTest();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('analytics — silent without key', () => {
  it('initAnalytics is a no-op when posthogKey is empty', () => {
    initAnalytics();
    expect(mockPosthog.init).not.toHaveBeenCalled();
  });

  it('trackEvent is a no-op when not initialised', () => {
    trackEvent('foo');
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });

  it('identifyUser is a no-op when not initialised', () => {
    identifyUser('stu-1');
    expect(mockPosthog.identify).not.toHaveBeenCalled();
  });

  it('resetUser is a no-op when not initialised', () => {
    resetUser();
    expect(mockPosthog.reset).not.toHaveBeenCalled();
  });

  it('trackPageView is a no-op when not initialised', () => {
    trackPageView('/');
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });
});

describe('analytics — active with key', () => {
  beforeEach(() => {
    mockEnv.posthogKey = 'phc_test_key';
  });

  it('initAnalytics calls posthog.init with the right options', () => {
    initAnalytics();
    expect(mockPosthog.init).toHaveBeenCalledTimes(1);
    const [key, opts] = mockPosthog.init.mock.calls[0];
    expect(key).toBe('phc_test_key');
    expect(opts).toMatchObject({
      api_host: 'https://app.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: true,
    });
    expect(opts.session_recording.maskAllInputs).toBe(true);
    expect(opts.session_recording.maskInputOptions.password).toBe(true);
  });

  it('initAnalytics is idempotent — second call does not re-init', () => {
    initAnalytics();
    initAnalytics();
    expect(mockPosthog.init).toHaveBeenCalledTimes(1);
  });

  it('trackEvent forwards to posthog.capture', () => {
    trackEvent('user_logged_in', { source: 'email' });
    expect(mockPosthog.capture).toHaveBeenCalledWith('user_logged_in', { source: 'email' });
  });

  it('identifyUser forwards to posthog.identify', () => {
    identifyUser('stu-1', { email: 'a@b.com' });
    expect(mockPosthog.identify).toHaveBeenCalledWith('stu-1', { email: 'a@b.com' });
  });

  it('resetUser forwards to posthog.reset', () => {
    resetUser();
    expect(mockPosthog.reset).toHaveBeenCalled();
  });

  it('trackPageView captures a $pageview with $current_url', () => {
    trackPageView('/admin/progress');
    expect(mockPosthog.capture).toHaveBeenCalledWith('$pageview', {
      $current_url: '/admin/progress',
    });
  });
});
