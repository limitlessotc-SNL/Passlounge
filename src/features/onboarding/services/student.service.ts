/**
 * Student Service
 *
 * All Supabase student table calls go through here.
 * Components never call supabase directly.
 *
 * Owner: Junior Engineer 2
 */

import { supabase } from '@/config/supabase'

import type { Student } from '@/types'

export async function getStudent(studentId: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Student
}

export async function upsertStudent(student: Partial<Student> & { id: string }): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .upsert(student, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw error
  return data as Student
}

export async function updateStudentProfile(
  studentId: string,
  updates: Partial<Omit<Student, 'id'>>,
): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', studentId)

  if (error) throw error
}

export async function saveOnboardingToAuth(metadata: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: metadata })

  if (error) throw error
}
