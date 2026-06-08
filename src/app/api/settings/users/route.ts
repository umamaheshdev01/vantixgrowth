import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, created, paginated, badRequest, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'
import { parsePagination } from '@/lib/paginate'
import { createSupabaseAdmin } from '@/lib/supabase'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'employee']),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip, take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, role: true, status: true, created_at: true },
      }),
      prisma.user.count(),
    ])

    const supabaseAdmin = createSupabaseAdmin()
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    const authUserMap = new Map(authData?.users?.map(u => [u.email, u.last_sign_in_at]) ?? [])
    const enriched = users.map(u => ({ ...u, last_login: authUserMap.get(u.email) ?? null }))

    return paginated(enriched, { page, limit, total })
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { data, error } = parseBody(createSchema, await req.json())
    if (error) return error

    const existing = await prisma.user.findUnique({ where: { email: data!.email } })
    if (existing) return badRequest('An account with this email already exists')

    const supabaseAdmin = createSupabaseAdmin()

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data!.email,
      password: data!.password,
      email_confirm: true,
      user_metadata: { force_password_change: true },
    })

    if (authErr || !authData.user) {
      return badRequest(`Failed to create auth account: ${authErr?.message ?? 'unknown error'}`)
    }

    try {
      const newUser = await prisma.user.create({
        data: {
          name: data!.name,
          email: data!.email,
          password_hash: '__SUPABASE_MANAGED__',
          role: data!.role,
          status: 'active',
        },
        select: { id: true, name: true, email: true, role: true, status: true },
      })

      return created(newUser)
    } catch (txErr) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw txErr
    }
  } catch {
    return serverError()
  }
}
