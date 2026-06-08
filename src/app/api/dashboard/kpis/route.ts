import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end }
}

function trend(current: number, previous: number | null): string {
  if (previous === null) return '—'
  if (previous === 0) return current === 0 ? '—' : '—'
  const pct = ((current - previous) / previous) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const now = new Date()
    const curYear = now.getFullYear()
    const curMonth = now.getMonth() + 1
    const prevMonth = curMonth === 1 ? 12 : curMonth - 1
    const prevYear = curMonth === 1 ? curYear - 1 : curYear

    const cur = monthRange(curYear, curMonth)
    const prev = monthRange(prevYear, prevMonth)

    const NON_TERMINAL = ['delivered', 'cancelled'] as const
    const TERMINAL_STATUSES = { notIn: ['delivered', 'cancelled'] } as const

    const [
      mrrCur, mrrPrev,
      activeClientsCur, activeClientsPrev,
      videosCur, videosPrev,
      finCur, finPrev,
      overdueCur, overduePrev,
    ] = await Promise.all([
      prisma.client.aggregate({
        _sum: { retainer_amount: true },
        where: { status: 'active' },
      }),
      prisma.client.aggregate({
        _sum: { retainer_amount: true },
        where: { status: 'active', created_at: { lte: prev.end } },
      }),
      prisma.client.count({ where: { status: 'active' } }),
      prisma.client.count({ where: { status: 'active', created_at: { lte: prev.end } } }),
      prisma.video.count({ where: { status: { notIn: ['delivered', 'cancelled'] } } }),
      prisma.video.count({
        where: {
          status: { notIn: ['delivered', 'cancelled'] },
          created_at: { lte: prev.end },
        },
      }),
      prisma.financeEntry.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { date: { gte: cur.start, lte: cur.end } },
      }),
      prisma.financeEntry.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { date: { gte: prev.start, lte: prev.end } },
      }),
      prisma.video.count({
        where: {
          due_date: { lt: now },
          status: { notIn: ['delivered', 'cancelled'] },
        },
      }),
      prisma.video.count({
        where: {
          due_date: { lt: cur.start },
          status: { notIn: ['delivered', 'cancelled'] },
          created_at: { lte: prev.end },
        },
      }),
    ])

    const curIncome = finCur.find(r => r.type === 'income')?._sum.amount ?? 0
    const curExpense = finCur.find(r => r.type === 'expense')?._sum.amount ?? 0
    const prevIncome = finPrev.find(r => r.type === 'income')?._sum.amount ?? null
    const prevExpense = finPrev.find(r => r.type === 'expense')?._sum.amount ?? null
    const curProfit = curIncome - curExpense
    const prevProfit = prevIncome !== null && prevExpense !== null ? prevIncome - prevExpense : null
    const curMargin = curIncome === 0 ? '—' : `${((curProfit / curIncome) * 100).toFixed(1)}%`
    const prevMargin = prevIncome === null || prevIncome === 0 ? null : (prevIncome - prevExpense!) / prevIncome

    const mrrCurVal = mrrCur._sum.retainer_amount ?? 0
    const mrrPrevVal = mrrPrev._sum.retainer_amount !== null ? mrrPrev._sum.retainer_amount : null

    return ok({
      mrr: { value: mrrCurVal, trend: trend(mrrCurVal, mrrPrevVal) },
      active_clients: { value: activeClientsCur, trend: trend(activeClientsCur, activeClientsPrev) },
      videos_in_progress: { value: videosCur, trend: trend(videosCur, videosPrev) },
      profit_this_month: { value: curProfit, trend: trend(curProfit, prevProfit) },
      profit_margin: {
        value: curMargin,
        trend: prevMargin === null
          ? '—'
          : curIncome === 0
          ? '—'
          : trend(parseFloat(curMargin), prevMargin * 100),
      },
      overdue_videos: { value: overdueCur, trend: trend(overdueCur, overduePrev) },
    })
  } catch {
    return serverError()
  }
}
