import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { notFound, paginated, ok, serverError } from '@/lib/response'
import { parsePagination } from '@/lib/paginate'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const exists = await prisma.client.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Client not found')

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [entries, total, lifetimeAgg, thisMonthAgg] = await Promise.all([
      prisma.financeEntry.findMany({
        where: { client_id: id, type: 'income' },
        skip, take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.financeEntry.count({ where: { client_id: id, type: 'income' } }),
      prisma.financeEntry.aggregate({
        _sum: { amount: true },
        where: { client_id: id, type: 'income' },
      }),
      prisma.financeEntry.aggregate({
        _sum: { amount: true },
        where: { client_id: id, type: 'income', date: { gte: monthStart } },
      }),
    ])

    return ok({
      entries,
      meta: { page, limit, total },
      total_received_lifetime: lifetimeAgg._sum.amount ?? 0,
      total_received_this_month: thisMonthAgg._sum.amount ?? 0,
    })
  } catch {
    return serverError()
  }
}
