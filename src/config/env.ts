/**
 * Environment Configuration
 * 
 * All environment variables go through here.
 * Never import import.meta.env directly in components.
 * Always use this file instead.
 */

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  environment: import.meta.env.VITE_ENV as string,
  enableQueryDevtools: import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true',
  isDev: import.meta.env.VITE_ENV === 'sandbox',
  isStaging: import.meta.env.VITE_ENV === 'staging',
  isProd: import.meta.env.VITE_ENV === 'production',
} as const