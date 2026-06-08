import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { badRequest, serverError } from '@/lib/response'

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','))
  }
  return lines.join('\n')
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return ''
  return d.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const where: any = {}
    if (from) where.date = { ...(where.date ?? {}), gte: new Date(`${from}-01`) }
    if (to) {
      const [y, m] = to.split('-').map(Number)
      where.date = { ...(where.date ?? {}), lte: new Date(y, m, 0) }
    }

    const entries = await prisma.financeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      select: {
        id: true, date: true, type: true, category: true, description: true,
        amount: true, payment_method: true, notes: true,
        client: { select: { name: true } },
        employee: { select: { user: { select: { name: true } } } },
      },
    })

    const rows = entries.map(e => ({
      id: e.id,
      date: fmtDate(e.date),
      type: e.type,
      category: e.category,
      description: e.description,
      amount: e.amount,
      payment_method: e.payment_method,
      client_name: e.client?.name ?? '',
      employee_name: e.employee?.user.name ?? '',
      notes: e.notes ?? '',
    }))

    const headers = ['id', 'date', 'type', 'category', 'description', 'amount', 'payment_method', 'client_name', 'employee_name', 'notes']
    const csv = toCSV(rows as any, headers)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="finance-export.csv"`,
      },
    })
  } catch {
    return serverError()
  }
}
