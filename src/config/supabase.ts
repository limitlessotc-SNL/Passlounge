/**
 * Supabase Client
 * 
 * Single instance of the Supabase client.
 * Import this everywhere you need to talk to the database.
 * Never create a new client in a component.
 */

import { createClient } from '@supabase/supabase-js'
import { env } from './env'

if (!env.supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL')
if (!env.supabaseAnonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY')

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)