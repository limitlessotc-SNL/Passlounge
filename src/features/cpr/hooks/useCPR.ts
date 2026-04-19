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

import { upsertStudent } from '@/features/onboarding/services/student.service'
import { useAuthStore } from '@/store/authStore'
import { useCPRStore } from '@/store/cprStore'
import { useStudentStore } from '@/store/studentStore'
import type { CPRReport } from '@/types'
import { isDevSession } from '@/utils/devMode'

import { getLatestCPRReport, insertCPRReport } from '../services/cpr.service'

/**
 * Supabase (and Postgres) errors often aren't plain Error instances.
 * Peel off the most useful human-readable field we can find so the UI
 * doesn't fall back to "Failed to save CPR report" for actionable
 * failures (FK / RLS / NOT NULL / CHECK violations).
 */
function extractError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>
    if (typeof obj.message === 'string' && obj.message) return obj.message
    if (typeof obj.details === 'string' && obj.details) return obj.details
    if (typeof obj.hint === 'string' && obj.hint) return obj.hint
  }
  return fallback
}

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
      setError(extractError(err, 'Failed to load CPR report'))
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

      // The CPR insert has a foreign key to students(id). During
      // onboarding that row isn't created until completeOnboarding,
      // so we upsert a minimal student profile here with whatever
      // we've collected so far. Second-run uploads (post-onboarding)
      // just no-op since the row already exists.
      const student = useStudentStore.getState()
      await upsertStudent({
        id: supaStudentId,
        nickname: student.nickname || 'Nurse',
        tester_type: student.testerType ?? 'repeat',
        confidence: student.confidence ?? 'unsure',
        test_date: student.testDate,
        daily_cards: student.dailyCards,
        onboarded: student.onboarded,
      })

      const row = await insertCPRReport(supaStudentId, { ...draft, image_path: null })
      setLatest(row)
      resetDraft()
      return row
    } catch (err) {
      setError(extractError(err, 'Failed to save CPR report'))
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
