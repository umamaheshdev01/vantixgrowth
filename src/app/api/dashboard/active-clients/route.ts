import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const clients = await prisma.client.findMany({
      where: { status: 'active' },
      take: 4,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        niche: true,
        retainer_amount: true,
        package_tier: true,
        status: true,
        videos: {
          where: { status: { notIn: ['delivered', 'cancelled'] } },
          select: { id: true, due_date: true },
          orderBy: { due_date: 'asc' },
        },
      },
    })

    const data = clients.map(c => ({
      id: c.id,
      name: c.name,
      niche: c.niche,
      retainer_amount: c.retainer_amount,
      package_tier: c.package_tier,
      status: c.status,
      active_video_count: c.videos.length,
      next_due_date: c.videos[0]?.due_date ?? null,
    }))

    return ok(data)
  } catch {
    return serverError()
  }
}
