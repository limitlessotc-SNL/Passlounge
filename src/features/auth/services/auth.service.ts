/**
 * Auth Service
 *
 * All Supabase auth calls go through here.
 * Components never call supabase.auth directly.
 *
 * Owner: Junior Engineer 1
 */

import { supabase } from '@/config/supabase'
import { trackEvent } from '@/services/analytics'

import type { LoginCredentials, SignupCredentials } from '@/types'

export async function loginWithEmail({ email, password }: LoginCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  trackEvent('user_logged_in')
  return data
}

export async function signupWithEmail({ email, password }: SignupCredentials) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) throw error
  trackEvent('user_signed_up')
  return data
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) throw error
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()

  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()

  if (error) throw error
  return data.session
}
