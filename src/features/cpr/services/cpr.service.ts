/**
 * CPR Service
 *
 * Supabase CRUD for cpr_reports table + image upload to the private
 * `cpr-photos` storage bucket. RLS enforces per-student isolation;
 * all we do here is call Supabase and translate errors.
 *
 * Owner: Junior Engineer 2
 */

import { supabase } from '@/config/supabase'
import type { CPRCategoriesMap, CPRDraft, CPRReport } from '@/types'

const TABLE = 'cpr_reports'
const BUCKET = 'cpr-photos'

/**
 * Returns the most recently created CPR report for a student,
 * or null if they haven't uploaded one yet.
 */
export async function getLatestCPRReport(
  studentId: string,
): Promise<CPRReport | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return data as CPRReport
}

/**
 * Returns every CPR report for a student, newest first.
 * Used for the future "compare attempts" view.
 */
export async function listCPRReports(studentId: string): Promise<CPRReport[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as CPRReport[]
}

/**
 * Inserts a new CPR report row. The draft's `image_path` should already
 * point at an uploaded file in the `cpr-photos` bucket (or be null).
 */
export async function insertCPRReport(
  studentId: string,
  draft: CPRDraft,
): Promise<CPRReport> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      student_id: studentId,
      attempt_date: draft.attempt_date,
      overall_result: draft.overall_result,
      image_path: draft.image_path,
      categories: draft.categories as CPRCategoriesMap,
    })
    .select()
    .single()

  if (error) throw error
  return data as CPRReport
}

/**
 * Deletes a CPR report row and (best-effort) its storage photo.
 * Photo delete failures are swallowed — the row is the source of truth.
 */
export async function deleteCPRReport(report: CPRReport): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', report.id)
  if (error) throw error

  if (report.image_path) {
    await supabase.storage.from(BUCKET).remove([report.image_path]).catch(() => {
      // Ignore — row deletion already succeeded.
    })
  }
}

/**
 * Uploads a CPR photo to the private bucket under `<studentId>/<timestamp>.<ext>`
 * and returns the storage path. Callers should pass this path to insertCPRReport.
 */
export async function uploadCPRPhoto(
  studentId: string,
  file: File,
): Promise<string> {
  const ext = fileExtension(file)
  const path = `${studentId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (error) throw error
  return path
}

/**
 * Returns a short-lived signed URL for a stored CPR photo so the dashboard
 * card can render it without making the bucket public.
 */
export async function getCPRPhotoUrl(
  imagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(imagePath, expiresInSeconds)

  if (error) throw error
  return data.signedUrl
}

function fileExtension(file: File): string {
  if (file.name.includes('.')) {
    const ext = file.name.split('.').pop()
    if (ext && ext.length <= 5) return ext.toLowerCase()
  }
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  return 'bin'
}
