/**
 * useCPR Hook
 *
 * Bridges cprStore with cpr.service. Provides:
 *  - loadLatest(): fetch most recent report into store
 *  - saveDraft(): insert row + populate latest (skips Supabase in dev mode)
 *
 * Consumers that need derived weak/strong categories should use the
 * helpers in @/config/cpr-categories directly against `latest.categories`.
 *
 * Owner: Junior Engineer 2
 */

import { useCallback } from 'react'

import { useAuthStore } from '@/store/authStore'
import { useCPRStore } from '@/store/cprStore'
import type { CPRReport } from '@/types'
import { isDevSession } from '@/utils/devMode'

import { getLatestCPRReport, insertCPRReport } from '../services/cpr.service'

export function useCPR() {
  const supaStudentId = useAuthStore((s) => s.supaStudentId)
  const draft = useCPRStore((s) => s.draft)
  const latest = useCPRStore((s) => s.latest)
  const isLoading = useCPRStore((s) => s.isLoading)
  const isSaving = useCPRStore((s) => s.isSaving)
  const error = useCPRStore((s) => s.error)
  const setLatest = useCPRStore((s) => s.setLatest)
  const setIsLoading = useCPRStore((s) => s.setIsLoading)
  const setIsSaving = useCPRStore((s) => s.setIsSaving)
  const setError = useCPRStore((s) => s.setError)
  const resetDraft = useCPRStore((s) => s.resetDraft)

  const loadLatest = useCallback(async (): Promise<CPRReport | null> => {
    if (!supaStudentId) return null
    // Dev sessions aren't backed by a real Supabase user — the only CPR
    // they'll have is whatever was set locally via saveDraft().
    if (isDevSession()) return useCPRStore.getState().latest

    setIsLoading(true)
    setError(null)
    try {
      const row = await getLatestCPRReport(supaStudentId)
      setLatest(row)
      return row
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load CPR report'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [supaStudentId, setLatest, setIsLoading, setError])

  const saveDraft = useCallback(async (): Promise<CPRReport | null> => {
    if (!supaStudentId) {
      setError('Not signed in.')
      return null
    }
    setIsSaving(true)
    setError(null)
    try {
      // Dev-mode: skip Supabase entirely, just write a fake row into the
      // store so the analysis + dashboard card light up locally.
      if (isDevSession()) {
        const fake: CPRReport = {
          id: `dev-${Date.now()}`,
          student_id: supaStudentId,
          attempt_date: draft.attempt_date,
          overall_result: draft.overall_result,
          image_path: null,
          categories: draft.categories,
          created_at: new Date().toISOString(),
        }
        setLatest(fake)
        resetDraft()
        return fake
      }

      const row = await insertCPRReport(supaStudentId, { ...draft, image_path: null })
      setLatest(row)
      resetDraft()
      return row
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save CPR report'
      setError(msg)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [supaStudentId, draft, setLatest, setIsSaving, setError, resetDraft])

  return {
    // state
    draft,
    latest,
    isLoading,
    isSaving,
    error,
    // actions
    loadLatest,
    saveDraft,
  }
}
