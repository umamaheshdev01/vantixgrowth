import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'
import { parsePagination } from '@/lib/paginate'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const url = new URL(req.url)
    const { skip, limit } = parsePagination(url)

    const exists = await prisma.video.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Video not found')

    const [activity, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { entity_type: 'video', entity_id: id },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { entity_type: 'video', entity_id: id } }),
    ])

    if (activity.length === 0) return ok({ entries: [], total })

    const userIds = [...new Set(activity.map(a => a.user_id).filter(Boolean))] as string[]
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : []
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]))

    const entries = activity.map(a => ({
      id: a.id,
      action: a.action,
      user_id: a.user_id,
      user_name: a.user_id ? (userMap[a.user_id] ?? 'Unknown') : 'System',
      created_at: a.created_at,
    }))

    return ok({ entries, total })
  } catch {
    return serverError()
  }
}
