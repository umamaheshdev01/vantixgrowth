import { createClient } from '@supabase/supabase-js'

// ── Server-side clients (API routes / Server Actions) ─────────────────────────
// These are NOT exposed to the browser — no NEXT_PUBLIC prefix.

const serverUrl = () => process.env.SUPABASE_URL!
const serverAnonKey = () => process.env.SUPABASE_ANON_KEY!
const serverServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY!

export function createSupabaseClient() {
  return createClient(serverUrl(), serverAnonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function createSupabaseAdmin() {
  return createClient(serverUrl(), serverServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Browser singleton (AuthContext + client components) ───────────────────────
// Uses NEXT_PUBLIC vars so the anon key is available in the browser bundle.
// Supabase JS v2 handles SSR gracefully — this is safe to import server-side too.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
