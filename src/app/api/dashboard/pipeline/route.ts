import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'

const ALL_STATUSES = [
  'brief_received', 'footage_received', 'assigned', 'in_editing',
  'internal_review', 'sent_to_client', 'revisions_requested', 'in_revision',
  'approved', 'delivered', 'cancelled',
] as const

const MUTED = new Set(['delivered', 'cancelled'])

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const counts = await prisma.video.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const map = Object.fromEntries(counts.map(r => [r.status, r._count.id]))

    const data = ALL_STATUSES.map(s => ({
      status: s,
      count: map[s] ?? 0,
      muted: MUTED.has(s),
    }))

    return ok(data)
  } catch {
    return serverError()
  }
}
