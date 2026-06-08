import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    const { id } = await params

    const exists = await prisma.video.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Video not found')

    const history = await prisma.videoStatusHistory.findMany({
      where: { video_id: id },
      orderBy: { created_at: 'asc' },
    })

    if (history.length === 0) return ok([])

    const userIds = [...new Set(history.map(h => h.changed_by).filter(Boolean))] as string[]
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : []
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]))

    const data = history.map(h => ({
      id: h.id,
      video_id: h.video_id,
      from_status: h.from_status,
      to_status: h.to_status,
      changed_by: h.changed_by,
      changed_by_name: h.changed_by ? (userMap[h.changed_by] ?? 'Unknown') : 'System',
      revision_notes: (h as Record<string, unknown>).revision_notes ?? null,
      created_at: h.created_at,
    }))

    return ok(data)
  } catch {
    return serverError()
  }
}
