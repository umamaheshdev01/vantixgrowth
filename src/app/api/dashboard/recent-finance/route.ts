import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const entries = await prisma.financeEntry.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        type: true,
        category: true,
        description: true,
        amount: true,
        payment_method: true,
        client: { select: { id: true, name: true } },
        employee: { select: { id: true, user: { select: { name: true } } } },
      },
    })

    return ok(entries)
  } catch {
    return serverError()
  }
}
