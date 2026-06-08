import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { serverError } from '@/lib/response'

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const clients = await prisma.client.findMany({
      where: { status: { not: 'archived' } },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, niche: true, contact_name: true, contact_email: true,
        contact_phone: true, retainer_amount: true, package_tier: true, status: true,
        contract_start_date: true, contract_end_date: true, min_contract_months: true,
        youtube_url: true, created_at: true,
      },
    })

    const rows = clients.map(c => ({
      ...c,
      contract_start_date: c.contract_start_date.toISOString().split('T')[0],
      contract_end_date: c.contract_end_date?.toISOString().split('T')[0] ?? '',
      created_at: c.created_at.toISOString().split('T')[0],
    }))

    const headers = ['id', 'name', 'niche', 'contact_name', 'contact_email', 'contact_phone',
      'retainer_amount', 'package_tier', 'status', 'contract_start_date', 'contract_end_date',
      'min_contract_months', 'youtube_url', 'created_at']

    const csv = toCSV(rows as any, headers)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clients-export.csv"`,
      },
    })
  } catch {
    return serverError()
  }
}
