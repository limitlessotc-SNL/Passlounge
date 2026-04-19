/**
 * cprStore unit tests
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { CPRReport } from '@/types'

import { useCPRStore } from './cprStore'

const emptyReport: CPRReport = {
  id: 'r-1',
  student_id: 'stu-1',
  attempt_date: null,
  overall_result: null,
  image_path: null,
  categories: {},
  created_at: '2026-04-01T00:00:00Z',
}

describe('cprStore', () => {
  afterEach(() => {
    useCPRStore.setState({
      draft: { attempt_date: null, overall_result: null, image_path: null, categories: {} },
      latest: null,
      isLoading: false,
      isSaving: false,
      error: null,
    })
  })

  it('has correct initial state', () => {
    const s = useCPRStore.getState()
    expect(s.draft).toEqual({ attempt_date: null, overall_result: null, image_path: null, categories: {} })
    expect(s.latest).toBeNull()
    expect(s.isLoading).toBe(false)
    expect(s.isSaving).toBe(false)
    expect(s.error).toBeNull()
  })

  it('setAttemptDate writes to draft', () => {
    useCPRStore.getState().setAttemptDate('2026-03-01')
    expect(useCPRStore.getState().draft.attempt_date).toBe('2026-03-01')
  })

  it('setOverallResult writes to draft', () => {
    useCPRStore.getState().setOverallResult('fail')
    expect(useCPRStore.getState().draft.overall_result).toBe('fail')
  })

  it('setImagePath writes to draft', () => {
    useCPRStore.getState().setImagePath('stu-1/123.jpg')
    expect(useCPRStore.getState().draft.image_path).toBe('stu-1/123.jpg')
  })

  it('setCategoryResult merges into categories map', () => {
    useCPRStore.getState().setCategoryResult('management_of_care', 'below')
    useCPRStore.getState().setCategoryResult('safety_and_infection_control', 'above')
    expect(useCPRStore.getState().draft.categories).toEqual({
      management_of_care: 'below',
      safety_and_infection_control: 'above',
    })
  })

  it('setCategoryResult overwrites existing value for the same key', () => {
    useCPRStore.getState().setCategoryResult('management_of_care', 'below')
    useCPRStore.getState().setCategoryResult('management_of_care', 'above')
    expect(useCPRStore.getState().draft.categories.management_of_care).toBe('above')
  })

  it('setCategoriesMap replaces the whole map', () => {
    useCPRStore.getState().setCategoryResult('management_of_care', 'below')
    useCPRStore.getState().setCategoriesMap({ psychosocial_integrity: 'near' })
    expect(useCPRStore.getState().draft.categories).toEqual({ psychosocial_integrity: 'near' })
  })

  it('setLatest stores the report', () => {
    useCPRStore.getState().setLatest(emptyReport)
    expect(useCPRStore.getState().latest).toEqual(emptyReport)
  })

  it('setIsLoading / setIsSaving / setError toggle flags', () => {
    useCPRStore.getState().setIsLoading(true)
    useCPRStore.getState().setIsSaving(true)
    useCPRStore.getState().setError('nope')

    const s = useCPRStore.getState()
    expect(s.isLoading).toBe(true)
    expect(s.isSaving).toBe(true)
    expect(s.error).toBe('nope')
  })

  it('resetDraft clears draft and error but preserves latest', () => {
    useCPRStore.getState().setCategoryResult('management_of_care', 'below')
    useCPRStore.getState().setError('oops')
    useCPRStore.getState().setLatest(emptyReport)

    useCPRStore.getState().resetDraft()

    const s = useCPRStore.getState()
    expect(s.draft.categories).toEqual({})
    expect(s.error).toBeNull()
    expect(s.latest).toEqual(emptyReport)
  })
})
