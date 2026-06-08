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

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { client_id: id },
        skip, take: limit,
        orderBy: { due_date: 'asc' },
        select: {
          id: true, title: true, video_type: true, status: true, due_date: true,
          revision_count: true, assigned_at: true, created_at: true,
          assigned_editor: { select: { id: true, user: { select: { name: true } } } },
        },
      }),
      prisma.video.count({ where: { client_id: id } }),
    ])

    return paginated(videos, { page, limit, total })
  } catch {
    return serverError()
  }
}
