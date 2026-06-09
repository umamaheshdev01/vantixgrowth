'use client'

import { mutate as globalMutate, type SWRConfiguration } from 'swr'
import { apiFetch } from '@/lib/api'

// ── Fetcher ───────────────────────────────────────────────────────────────────
// The SWR key is the API path string (the same path passed to apiFetch). We
// reuse apiFetch so auth-token injection + the { success, data, error } envelope
// handling lives in exactly one place. Throwing on a failed envelope lets SWR
// populate its `error` slot, so existing error/empty states keep working.
export async function swrFetcher<T>(key: string): Promise<T> {
  const res = await apiFetch<T>(key)
  if (!res.success) {
    throw new Error(res.error ?? 'Request failed')
  }
  return res.data as T
}

// ── Global config (consumed by <SWRConfig> in AuthContext) ───────────────────
export const swrConfig: SWRConfiguration = {
  fetcher: swrFetcher,
  // Collapse duplicate requests for the same key fired within this window
  // (e.g. two components mounting at once, or a navigation back within 5s).
  dedupingInterval: 5000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  // Keep showing the last data while a new key (e.g. changed filters) loads,
  // instead of flashing a skeleton.
  keepPreviousData: true,
}

// ── Background refresh intervals (ms) ────────────────────────────────────────
// Only the high-value, frequently-changing views opt into a timer; everything
// else relies on cache + revalidate-on-focus + invalidate-on-mutation.
export const REFRESH = {
  DASHBOARD: 60_000,
  VIDEOS: 45_000,
  ACTIVITY: 60_000,
} as const

// ── Invalidation ─────────────────────────────────────────────────────────────
// Refetch every cached key that starts with any of the given prefixes. One call
// refreshes all variants of a resource (e.g. '/api/clients' covers
// '/api/clients?status[]=active', '/api/clients/123', etc.) across every mounted
// component — this is what makes a mutation in one screen update the others.
export function invalidate(...prefixes: string[]): Promise<unknown> {
  return globalMutate(
    (key) => typeof key === 'string' && prefixes.some((p) => key.startsWith(p)),
    undefined,
    { revalidate: true },
  )
}
