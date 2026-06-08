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
    const exists = await prisma.employee.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Employee not found')

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)
    const includeAll = url.searchParams.get('includeAll') === 'true'

    const where: any = { assigned_editor_id: id }
    if (!includeAll) where.status = { notIn: ['delivered', 'cancelled'] }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where, skip, take: limit,
        orderBy: { due_date: 'asc' },
        select: {
          id: true, title: true, video_type: true, status: true,
          due_date: true, revision_count: true, created_at: true,
          client: { select: { id: true, name: true } },
        },
      }),
      prisma.video.count({ where }),
    ])

    return paginated(videos, { page, limit, total })
  } catch {
    return serverError()
  }
}
