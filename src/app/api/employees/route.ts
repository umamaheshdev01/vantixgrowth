import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { created, paginated, serverError, badRequest } from '@/lib/response'
import { parseBody } from '@/lib/validate'
import { parsePagination } from '@/lib/paginate'
import { createSupabaseAdmin } from '@/lib/supabase'

const createSchema = z.object({
  full_name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  employment_type: z.enum(['full_time', 'part_time', 'freelance']),
  pay_type: z.enum(['monthly', 'per_video']),
  pay_rate: z.number().int().positive(),
  login_email: z.string().email(),
  temp_password: z.string().min(8),
  status: z.enum(['active', 'inactive']).default('active'),
  start_date: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        skip, take: limit,
        orderBy: [{ status: 'asc' }, { user: { name: 'asc' } }],
        include: {
          user: { select: { id: true, name: true, email: true, status: true } },
          _count: {
            select: { assigned_videos: { where: { status: { notIn: ['delivered', 'cancelled'] } } } },
          },
        },
      }),
      prisma.employee.count(),
    ])

    const data = employees.map(e => ({
      id: e.id, role: e.role, employment_type: e.employment_type,
      pay_type: e.pay_type, pay_rate: e.pay_rate, status: e.status,
      start_date: e.start_date, created_at: e.created_at,
      user: e.user,
      active_tasks: e._count.assigned_videos,
    }))

    return paginated(data, { page, limit, total })
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

    const existing = await prisma.user.findUnique({ where: { email: data!.login_email } })
    if (existing) return badRequest('An account with this email already exists')

    const supabaseAdmin = createSupabaseAdmin()

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data!.login_email,
      password: data!.temp_password,
      email_confirm: true,
      user_metadata: { force_password_change: true },
    })
    if (authErr || !authData.user) {
      return badRequest(`Failed to create auth account: ${authErr?.message ?? 'unknown error'}`)
    }

    try {
      const result = await prisma.$transaction(async tx => {
        const appUser = await tx.user.create({
          data: {
            name: data!.full_name,
            email: data!.login_email,
            password_hash: '__SUPABASE_MANAGED__',
            role: 'employee',
            status: 'active',
          },
        })

        const employee = await tx.employee.create({
          data: {
            user_id: appUser.id,
            role: data!.role,
            employment_type: data!.employment_type,
            pay_type: data!.pay_type,
            pay_rate: data!.pay_rate,
            status: data!.status,
            start_date: data!.start_date ? new Date(data!.start_date) : undefined,
            notes: data!.notes,
          },
        })

        return { appUser, employee }
      })

      return created({
        employee: result.employee,
        user: { id: result.appUser.id, name: result.appUser.name, email: result.appUser.email },
      })
    } catch (txErr) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw txErr
    }
  } catch {
    return serverError()
  }
}
