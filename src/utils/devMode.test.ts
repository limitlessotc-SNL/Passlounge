/**
 * devMode utility unit tests
 */

import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/store/authStore'

import {
  DEV_MOCK_TOKEN,
  DEV_USER_EMAIL,
  DEV_USER_ID,
  isDevSession,
} from './devMode'

describe('devMode', () => {
  afterEach(() => {
    useAuthStore.getState().logout()
  })

  // ── Constants ────────────────────────────────────────────────────────

  it('DEV_USER_ID is the sentinel string', () => {
    expect(DEV_USER_ID).toBe('dev-user-id')
  })

  it('DEV_MOCK_TOKEN is the sentinel string', () => {
    expect(DEV_MOCK_TOKEN).toBe('dev-mock-token')
  })

  it('DEV_USER_EMAIL is the sentinel string', () => {
    expect(DEV_USER_EMAIL).toBe('dev@passlounge.local')
  })

  // ── isDevSession ────────────────────────────────────────────────────

  it('returns false when no user is authenticated', () => {
    useAuthStore.setState({
      user: null,
      token: null,
      supaStudentId: null,
      isAuthenticated: false,
      isLoading: false,
    })

    expect(isDevSession()).toBe(false)
  })

  it('returns true when token matches DEV_MOCK_TOKEN', () => {
    useAuthStore.setState({
      user: { id: 'anything', email: 'x@y.com' },
      token: DEV_MOCK_TOKEN,
      supaStudentId: 'some-uuid',
      isAuthenticated: true,
      isLoading: false,
    })

    expect(isDevSession()).toBe(true)
  })

  it('returns true when supaStudentId matches DEV_USER_ID', () => {
    useAuthStore.setState({
      user: { id: DEV_USER_ID, email: 'x@y.com' },
      token: 'real-jwt-token',
      supaStudentId: DEV_USER_ID,
      isAuthenticated: true,
      isLoading: false,
    })

    expect(isDevSession()).toBe(true)
  })

  it('returns false for real auth session with JWT token', () => {
    useAuthStore.setState({
      user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'real@user.com' },
      token: 'eyJhbGciOiJIUzI1NiIs...realjwt',
      supaStudentId: '550e8400-e29b-41d4-a716-446655440000',
      isAuthenticated: true,
      isLoading: false,
    })

    expect(isDevSession()).toBe(false)
  })

  it('returns true even when only one of token/id is the sentinel', () => {
    // Only token is mock
    useAuthStore.setState({
      user: { id: 'x', email: 'x@y.com' },
      token: DEV_MOCK_TOKEN,
      supaStudentId: 'real-uuid',
      isAuthenticated: true,
      isLoading: false,
    })
    expect(isDevSession()).toBe(true)

    // Only id is mock
    useAuthStore.setState({
      user: { id: DEV_USER_ID, email: 'x@y.com' },
      token: 'other-token',
      supaStudentId: DEV_USER_ID,
      isAuthenticated: true,
      isLoading: false,
    })
    expect(isDevSession()).toBe(true)
  })
})
