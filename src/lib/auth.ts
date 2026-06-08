import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from './supabase'
import { prisma } from './prisma'
import { unauthorized, forbidden } from './response'

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

export async function resolveUser(req: NextRequest): Promise<AppUser | null> {
  const token = extractToken(req)
  if (!token) return null

  try {
    const { data: { user }, error } = await createSupabaseClient().auth.getUser(token)
    if (error || !user?.email) return null

    const row = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, name: true, email: true, role: true, status: true },
    })
    if (!row || row.status !== 'active') return null

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as 'admin' | 'employee',
      status: row.status as 'active' | 'inactive',
    }
  } catch {
    return null
  }
}

export async function requireAuth(req: NextRequest): Promise<AppUser | NextResponse> {
  const user = await resolveUser(req)
  if (!user) return unauthorized()
  return user
}

export async function requireAdmin(req: NextRequest): Promise<AppUser | NextResponse> {
  const result = await requireAuth(req)
  if (result instanceof NextResponse) return result
  if (result.role !== 'admin') return forbidden()
  return result
}
