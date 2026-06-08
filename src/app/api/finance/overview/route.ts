import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, badRequest, serverError } from '@/lib/response'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const url = new URL(req.url)
    const monthParam = url.searchParams.get('month') // YYYY-MM
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return badRequest('month query param required in YYYY-MM format')
    }

    const [year, month] = monthParam.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)

    const entries = await prisma.financeEntry.findMany({
      where: { date: { gte: start, lte: end } },
      select: { type: true, category: true, amount: true },
    })

    let total_income = 0, total_expenses = 0, client_revenue = 0, payroll_cost = 0

    for (const e of entries) {
      if (e.type === 'income') {
        total_income += e.amount
        if (e.category === 'client_retainer') client_revenue += e.amount
      } else {
        total_expenses += e.amount
        if (e.category === 'salary_fulltime' || e.category === 'freelancer_payment') {
          payroll_cost += e.amount
        }
      }
    }

    const net_profit = total_income - total_expenses
    const profit_margin = total_income === 0 ? '—' : `${((net_profit / total_income) * 100).toFixed(1)}%`

    return ok({ total_income, total_expenses, net_profit, profit_margin, client_revenue, payroll_cost })
  } catch {
    return serverError()
  }
}
