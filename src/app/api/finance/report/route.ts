import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, badRequest, serverError } from '@/lib/response'

function buildReport(entries: { type: string; category: string; amount: number }[]) {
  const income: Record<string, number> = {}
  const expense: Record<string, number> = {}
  let totalIncome = 0, totalExpense = 0

  for (const e of entries) {
    if (e.type === 'income') {
      income[e.category] = (income[e.category] ?? 0) + e.amount
      totalIncome += e.amount
    } else {
      expense[e.category] = (expense[e.category] ?? 0) + e.amount
      totalExpense += e.amount
    }
  }

  return { income, totalIncome, expense, totalExpense, netProfit: totalIncome - totalExpense }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const url = new URL(req.url)
    const monthParam = url.searchParams.get('month')
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return badRequest('month query param required in YYYY-MM format')
    }

    const [year, month] = monthParam.split('-').map(Number)
    const curStart = new Date(year, month - 1, 1)
    const curEnd = new Date(year, month, 0, 23, 59, 59, 999)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const prevStart = new Date(prevYear, prevMonth - 1, 1)
    const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999)

    const [curEntries, prevEntries] = await Promise.all([
      prisma.financeEntry.findMany({ where: { date: { gte: curStart, lte: curEnd } }, select: { type: true, category: true, amount: true } }),
      prisma.financeEntry.findMany({ where: { date: { gte: prevStart, lte: prevEnd } }, select: { type: true, category: true, amount: true } }),
    ])

    const cur = buildReport(curEntries)
    const prev = buildReport(prevEntries)

    const hasPrevData = prevEntries.length > 0

    const incomeChange = hasPrevData ? cur.totalIncome - prev.totalIncome : null
    const incomePct = hasPrevData && prev.totalIncome > 0
      ? `${(((cur.totalIncome - prev.totalIncome) / prev.totalIncome) * 100).toFixed(1)}%`
      : '—'

    const profitChange = hasPrevData ? cur.netProfit - prev.netProfit : null
    const profitPct = hasPrevData && prev.netProfit !== 0
      ? `${(((cur.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100).toFixed(1)}%`
      : '—'

    return ok({
      income_by_category: cur.income,
      total_income: cur.totalIncome,
      expense_by_category: cur.expense,
      total_expenses: cur.totalExpense,
      net_profit: cur.netProfit,
      vs_prev_month: {
        income_change: incomeChange,
        income_pct_change: incomePct,
        profit_change: profitChange,
        profit_pct_change: profitPct,
      },
    })
  } catch {
    return serverError()
  }
}
