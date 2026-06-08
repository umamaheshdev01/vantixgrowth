import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from './supabase'
import { prisma } from './prisma'
import { unauthorized, forbidden, serviceUnavailable } from './response'

export type AppUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'employee'
  status: 'active' | 'inactive'
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

// Thrown when something is misconfigured/unreachable (Supabase auth down, DB
// unreachable, etc). Distinct from "token valid but no matching app user",
// which is a legitimate null — so callers can return 503 vs 401 correctly.
export class AuthInfraError extends Error {}

export async function resolveUser(req: NextRequest): Promise<AppUser | null> {
  const token = extractToken(req)
  if (!token) return null

  // 1. Validate the Supabase token.
  //    - A rejected token (expired / malformed / 401 / 403) is NOT an error:
  //      the user simply isn't authenticated → return null, log them out.
  //    - A thrown exception (network down, bad SUPABASE_URL/key) IS infra.
  let email: string | undefined
  try {
    const { data: { user }, error } = await createSupabaseClient().auth.getUser(token)
    if (error) return null // token invalid/expired — treat as logged out
    email = user?.email
  } catch (err) {
    console.error('[auth] Supabase getUser threw:', err)
    const detail = err instanceof Error ? err.message : String(err)
    throw new AuthInfraError(`Could not reach Supabase auth: ${detail}`)
  }
  if (!email) return null

  // 2. Look up the matching app user. A DB connection failure must surface as
  //    an infra error, NOT a silent null (which mislabels it "not set up").
  let row
  try {
    row = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, status: true },
    })
  } catch (err) {
    console.error('[auth] Prisma user lookup failed:', err)
    throw new AuthInfraError('Failed to reach the database')
  }

  if (!row || row.status !== 'active') return null

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as 'admin' | 'employee',
    status: row.status as 'active' | 'inactive',
  }
}

export async function requireAuth(req: NextRequest): Promise<AppUser | NextResponse> {
  let user: AppUser | null
  try {
    user = await resolveUser(req)
  } catch (err) {
    if (err instanceof AuthInfraError) return serviceUnavailable(err.message)
    throw err
  }
  if (!user) return unauthorized()
  return user
}

export async function requireAdmin(req: NextRequest): Promise<AppUser | NextResponse> {
  const result = await requireAuth(req)
  if (result instanceof NextResponse) return result
  if (result.role !== 'admin') return forbidden()
  return result
}
