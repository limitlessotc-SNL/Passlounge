/**
 * student.service unit tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFrom = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
}))

import {
  getStudent,
  saveOnboardingToAuth,
  updateStudentProfile,
  upsertStudent,
} from './student.service'

function chainMock(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('student.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getStudent', () => {
    it('returns student on success', async () => {
      const fakeStudent = { id: 'abc', nickname: 'Nurse Dev', onboarded: true }
      chainMock({ data: fakeStudent, error: null })

      const result = await getStudent('abc')

      expect(mockFrom).toHaveBeenCalledWith('students')
      expect(result).toEqual(fakeStudent)
    })

    it('returns null when student not found (PGRST116)', async () => {
      chainMock({ data: null, error: { code: 'PGRST116', message: 'Not found' } })

      const result = await getStudent('missing')

      expect(result).toBeNull()
    })

    it('throws on other errors', async () => {
      chainMock({ data: null, error: { code: '42P01', message: 'Table not found' } })

      await expect(getStudent('abc')).rejects.toEqual({
        code: '42P01',
        message: 'Table not found',
      })
    })
  })

  describe('upsertStudent', () => {
    it('returns student on success', async () => {
      const fakeStudent = { id: 'abc', nickname: 'Test' }
      chainMock({ data: fakeStudent, error: null })

      const result = await upsertStudent({ id: 'abc', nickname: 'Test' })

      expect(result).toEqual(fakeStudent)
    })

    it('throws on error', async () => {
      chainMock({ data: null, error: new Error('Upsert failed') })

      await expect(upsertStudent({ id: 'abc' })).rejects.toThrow('Upsert failed')
    })
  })

  describe('updateStudentProfile', () => {
    it('resolves on success', async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(updateStudentProfile('abc', { nickname: 'New' })).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
      }
      mockFrom.mockReturnValue(chain)

      await expect(updateStudentProfile('abc', { nickname: 'X' })).rejects.toThrow('Update failed')
    })
  })

  describe('saveOnboardingToAuth', () => {
    it('resolves on success', async () => {
      mockUpdateUser.mockResolvedValue({ error: null })

      await expect(saveOnboardingToAuth({ onboarded: true })).resolves.toBeUndefined()
    })

    it('throws on error', async () => {
      mockUpdateUser.mockResolvedValue({ error: new Error('Auth update failed') })

      await expect(saveOnboardingToAuth({ onboarded: true })).rejects.toThrow('Auth update failed')
    })
  })
})
