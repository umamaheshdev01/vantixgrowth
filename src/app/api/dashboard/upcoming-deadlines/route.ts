import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const now = new Date()
    const sevenDaysOut = new Date(now)
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)

    const videos = await prisma.video.findMany({
      where: {
        due_date: { gte: now, lte: sevenDaysOut },
        status: { notIn: ['delivered', 'cancelled'] },
      },
      orderBy: { due_date: 'asc' },
      select: {
        id: true,
        title: true,
        due_date: true,
        status: true,
        video_type: true,
        client: { select: { id: true, name: true } },
        assigned_editor: {
          select: { user: { select: { name: true } } },
        },
      },
    })

    const data = videos.map(v => ({
      ...v,
      days_remaining: Math.ceil(
        (v.due_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    }))

    return ok(data)
  } catch {
    return serverError()
  }
}
