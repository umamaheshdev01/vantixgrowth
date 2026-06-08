import { supabase } from '@/lib/supabase'
import { getAccessTokenSync } from '@/lib/auth-token'

export type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: string | null
  meta?: { page: number; limit: number; total: number }
  details?: Record<string, string>
}

async function getAccessToken(): Promise<string | null> {
  const cached = getAccessTokenSync()
  if (cached) return cached

  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, { ...options, headers })
  return res.json() as Promise<ApiResponse<T>>
}
