import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { notFound, ok, serverError } from '@/lib/response'
import { parsePagination } from '@/lib/paginate'

// Payments made to the currently authenticated employee (finance expenses
// linked to their employee record). Lets an employee see finances involving them.
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    const employee = await prisma.employee.findUnique({
      where: { user_id: user.id },
      select: { id: true },
    })
    if (!employee) return notFound('No employee record found for this account')

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [entries, total, lifetimeAgg, thisMonthAgg] = await Promise.all([
      prisma.financeEntry.findMany({
        where: { employee_id: employee.id, type: 'expense' },
        skip, take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.financeEntry.count({ where: { employee_id: employee.id, type: 'expense' } }),
      prisma.financeEntry.aggregate({
        _sum: { amount: true },
        where: { employee_id: employee.id, type: 'expense' },
      }),
      prisma.financeEntry.aggregate({
        _sum: { amount: true },
        where: { employee_id: employee.id, type: 'expense', date: { gte: monthStart } },
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
