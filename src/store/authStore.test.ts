/**
 * authStore unit tests
 *
 * Tests Zustand store state transitions.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from './authStore'

describe('authStore', () => {
  afterEach(() => {
    // Reset store to initial state after each test
    useAuthStore.getState().logout()
  })

  it('has correct initial state', () => {
    const state = useAuthStore.getState()

    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.supaStudentId).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(true)
  })

  it('setUser sets authenticated state', () => {
    const user = { id: 'abc-123', email: 'test@test.com' }

    useAuthStore.getState().setUser(user, 'access-token')

    const state = useAuthStore.getState()
    expect(state.user).toEqual(user)
    expect(state.token).toBe('access-token')
    expect(state.supaStudentId).toBe('abc-123')
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('setUser with null clears auth state', () => {
    // First set a user
    useAuthStore.getState().setUser({ id: '1', email: 'a@b.com' }, 'tok')

    // Then clear
    useAuthStore.getState().setUser(null, null)

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.supaStudentId).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('setLoading updates isLoading', () => {
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)

    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().isLoading).toBe(true)
  })

  it('logout clears all auth state', () => {
    // Set up authenticated state
    useAuthStore.getState().setUser({ id: '1', email: 'a@b.com' }, 'tok')

    // Logout
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.supaStudentId).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })
})
