import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { notFound, ok, serverError } from '@/lib/response'
import { parsePagination } from '@/lib/paginate'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const exists = await prisma.employee.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Employee not found')

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [entries, total, lifetimeAgg, thisMonthAgg] = await Promise.all([
      prisma.financeEntry.findMany({
        where: { employee_id: id, type: 'expense' },
        skip, take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.financeEntry.count({ where: { employee_id: id, type: 'expense' } }),
      prisma.financeEntry.aggregate({
        _sum: { amount: true },
        where: { employee_id: id, type: 'expense' },
      }),
      prisma.financeEntry.aggregate({
        _sum: { amount: true },
        where: { employee_id: id, type: 'expense', date: { gte: monthStart } },
      }),
    ])

    return ok({
      entries,
      meta: { page, limit, total },
      total_this_month: thisMonthAgg._sum.amount ?? 0,
      total_lifetime: lifetimeAgg._sum.amount ?? 0,
    })
  } catch {
    return serverError()
  }
}
