import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { notFound, paginated, serverError } from '@/lib/response'
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

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { entity_type: 'client', entity_id: id },
        skip, take: limit,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.activityLog.count({ where: { entity_type: 'client', entity_id: id } }),
    ])

    return paginated(logs, { page, limit, total })
  } catch {
    return serverError()
  }
}
