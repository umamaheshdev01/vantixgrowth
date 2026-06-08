import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, unprocessable, serverError } from '@/lib/response'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const client = await prisma.client.findUnique({ where: { id } })
    if (!client) return notFound('Client not found')

    const activeVideos = await prisma.video.count({
      where: { client_id: id, status: { notIn: ['delivered', 'cancelled'] } },
    })

    if (activeVideos > 0) {
      return unprocessable(
        `This client has ${activeVideos} active video(s) in production. Please mark all videos as Delivered or Cancelled before archiving this client.`,
      )
    }

    const updated = await prisma.client.update({
      where: { id },
      data: { status: 'archived' },
    })

    await prisma.activityLog.create({
      data: { entity_type: 'client', entity_id: id, user_id: user.id, action: 'Client archived' },
    })

    return ok(updated)
  } catch {
    return serverError()
  }
}
