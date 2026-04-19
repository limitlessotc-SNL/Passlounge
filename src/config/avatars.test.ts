/**
 * avatars config unit tests
 */

import { describe, expect, it } from 'vitest'

import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR_ID,
  getAvatarDisplay,
  getAvatarOption,
  isDefaultAvatar,
} from './avatars'

describe('avatars config', () => {
  // ── AVATAR_OPTIONS ──────────────────────────────────────────────────

  it('has at least 10 avatar options', () => {
    expect(AVATAR_OPTIONS.length).toBeGreaterThanOrEqual(10)
  })

  it('first option is the default letter avatar', () => {
    expect(AVATAR_OPTIONS[0].id).toBe(DEFAULT_AVATAR_ID)
    expect(AVATAR_OPTIONS[0].emoji).toBeNull()
  })

  it('every non-default option has an emoji', () => {
    for (const opt of AVATAR_OPTIONS.slice(1)) {
      expect(opt.emoji).toBeTruthy()
    }
  })

  it('every option has a human-readable label', () => {
    for (const opt of AVATAR_OPTIONS) {
      expect(opt.label.length).toBeGreaterThan(0)
    }
  })

  it('all option ids are unique', () => {
    const ids = AVATAR_OPTIONS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('DEFAULT_AVATAR_ID is an empty string', () => {
    expect(DEFAULT_AVATAR_ID).toBe('')
  })

  // ── getAvatarOption ─────────────────────────────────────────────────

  it('returns default option for undefined id', () => {
    expect(getAvatarOption(undefined).id).toBe(DEFAULT_AVATAR_ID)
  })

  it('returns default option for empty string', () => {
    expect(getAvatarOption('').id).toBe(DEFAULT_AVATAR_ID)
  })

  it('returns the matching option for a valid id', () => {
    const opt = getAvatarOption('fire')
    expect(opt.id).toBe('fire')
    expect(opt.emoji).toBe('🔥')
  })

  it('returns default when id is not in options list (fallback)', () => {
    const opt = getAvatarOption('not-a-real-id')
    expect(opt.id).toBe(DEFAULT_AVATAR_ID)
  })

  // ── getAvatarDisplay ────────────────────────────────────────────────

  it('returns emoji when avatar is selected', () => {
    expect(getAvatarDisplay('trophy', 'Keisha')).toBe('🏆')
  })

  it('returns uppercase initial letter for default avatar', () => {
    expect(getAvatarDisplay(undefined, 'keisha')).toBe('K')
    expect(getAvatarDisplay('', 'jamal')).toBe('J')
  })

  it('returns "N" when no nickname and default avatar', () => {
    expect(getAvatarDisplay('', '')).toBe('N')
  })

  it('emoji wins over nickname when avatar is selected', () => {
    // Even with a nickname, selected emoji takes priority
    expect(getAvatarDisplay('heart', 'Keisha')).toBe('🫀')
  })

  it('returns letter for unknown avatar id (fallback to default)', () => {
    expect(getAvatarDisplay('nonexistent', 'Taylor')).toBe('T')
  })

  // ── isDefaultAvatar ────────────────────────────────────────────────

  it('returns true for undefined', () => {
    expect(isDefaultAvatar(undefined)).toBe(true)
  })

  it('returns true for empty string', () => {
    expect(isDefaultAvatar('')).toBe(true)
  })

  it('returns false for a chosen avatar id', () => {
    expect(isDefaultAvatar('fire')).toBe(false)
  })
})
