import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const patchSchema = z.object({
  role: z.string().min(1).max(100).optional(),
  employment_type: z.enum(['full_time', 'part_time', 'freelance']).optional(),
  pay_type: z.enum(['monthly', 'per_video']).optional(),
  pay_rate: z.number().int().positive().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  start_date: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    })
    if (!employee) return notFound('Employee not found')

    const totalPaid = await prisma.financeEntry.aggregate({
      _sum: { amount: true },
      where: { employee_id: id, type: 'expense' },
    })

    return ok({ ...employee, total_paid_to_date: totalPaid._sum.amount ?? 0 })
  } catch {
    return serverError()
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) return notFound('Employee not found')

    const { data, error } = parseBody(patchSchema, await req.json())
    if (error) return error

    const payTypeChanged = data!.pay_type !== undefined && data!.pay_type !== existing.pay_type

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...data!,
        start_date: data!.start_date
          ? new Date(data!.start_date)
          : data!.start_date === null ? null : undefined,
      },
    })

    return ok({ ...updated, pay_type_change_applies_to_future_only: payTypeChanged })
  } catch {
    return serverError()
  }
}
