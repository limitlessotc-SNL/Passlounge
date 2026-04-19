/**
 * useCPR Hook
 *
 * Bridges cprStore with cpr.service. Provides:
 *  - loadLatest(): fetch most recent report into store
 *  - saveDraft(): upload photo (if present) + insert row
 *  - submitPhoto(): upload a File and write its path to draft
 *  - clearPhoto(): wipes the draft.image_path and the local File
 *
 * Consumers that need derived weak/strong categories should use the
 * helpers in @/config/cpr-categories directly against `latest.categories`.
 *
 * Owner: Junior Engineer 2
 */

import { useCallback, useState } from 'react'

import { useAuthStore } from '@/store/authStore'
import { useCPRStore } from '@/store/cprStore'
import type { CPRReport } from '@/types'

import {
  getLatestCPRReport,
  insertCPRReport,
  uploadCPRPhoto,
} from '../services/cpr.service'

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
  const setImagePath = useCPRStore((s) => s.setImagePath)
  const resetDraft = useCPRStore((s) => s.resetDraft)

  // The un-uploaded File kept locally so we can re-preview before submit.
  // Once saveDraft() uploads it, we store the path on the draft instead.
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const loadLatest = useCallback(async (): Promise<CPRReport | null> => {
    if (!supaStudentId) return null
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

  const attachPhoto = useCallback((file: File) => {
    setPendingFile(file)
  }, [])

  const clearPhoto = useCallback(() => {
    setPendingFile(null)
    setImagePath(null)
  }, [setImagePath])

  const saveDraft = useCallback(async (): Promise<CPRReport | null> => {
    if (!supaStudentId) {
      setError('Not signed in.')
      return null
    }
    setIsSaving(true)
    setError(null)
    try {
      let imagePath = draft.image_path
      if (pendingFile) {
        imagePath = await uploadCPRPhoto(supaStudentId, pendingFile)
      }
      const row = await insertCPRReport(supaStudentId, { ...draft, image_path: imagePath })
      setLatest(row)
      setPendingFile(null)
      resetDraft()
      return row
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save CPR report'
      setError(msg)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [supaStudentId, draft, pendingFile, setLatest, setIsSaving, setError, resetDraft])

  return {
    // state
    draft,
    latest,
    pendingFile,
    isLoading,
    isSaving,
    error,
    // actions
    loadLatest,
    attachPhoto,
    clearPhoto,
    saveDraft,
  }
}
