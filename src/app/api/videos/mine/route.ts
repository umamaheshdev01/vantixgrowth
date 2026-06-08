import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { paginated, forbidden, serverError } from '@/lib/response'
import { parsePagination } from '@/lib/paginate'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    if (user.role !== 'employee') return forbidden('Admins should use /api/videos')

    const employee = await prisma.employee.findUnique({
      where: { user_id: user.id },
      select: { id: true },
    })
    if (!employee) return forbidden('No employee record found for this account')

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)

    const now = new Date()

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { assigned_editor_id: employee.id },
        skip, take: limit,
        orderBy: { due_date: 'asc' },
        select: {
          id: true, title: true, status: true, due_date: true, video_type: true,
          client: { select: { name: true } },
        },
      }),
      prisma.video.count({ where: { assigned_editor_id: employee.id } }),
    ])

    const data = videos.map(v => ({
      ...v,
      days_remaining: Math.ceil((v.due_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))

    return paginated(data, { page, limit, total })
  } catch {
    return serverError()
  }
}
