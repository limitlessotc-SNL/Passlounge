/**
 * Environment Configuration
 *
 * All environment variables go through here.
 * Never import import.meta.env directly in components.
 * Always use this file instead.
 */

const adminPassword = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) ?? ''
const isProd = import.meta.env.VITE_ENV === 'production'
if (isProd && !adminPassword) {
  throw new Error('Missing VITE_ADMIN_PASSWORD in production build')
}

const adminRateLimitRaw = (import.meta.env.VITE_ADMIN_RATE_LIMIT as string | undefined) ?? '5'
const adminRateLimit = Number.parseInt(adminRateLimitRaw, 10)

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  environment: import.meta.env.VITE_ENV as string,
  enableQueryDevtools: import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true',
  isDev: import.meta.env.VITE_ENV === 'sandbox',
  isStaging: import.meta.env.VITE_ENV === 'staging',
  isProd,
  /**
   * NOTE — this value is bundled into the client. Treat it as a UX gate
   * ("hide /admin from casual users"), NOT as a security boundary. Real
   * admin authorization lives in RLS policies that check
   * `students.is_admin = true` server-side.
   */
  adminPassword,
  adminRateLimit: Number.isFinite(adminRateLimit) && adminRateLimit > 0 ? adminRateLimit : 5,
  // ─── Analytics ────────────────────────────────────────────────────
  // Empty key disables PostHog entirely (calls become no-ops). We never
  // throw here — analytics should fail silently on misconfig.
  posthogKey: (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ?? '',
  posthogHost: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://app.posthog.com',
} as const
