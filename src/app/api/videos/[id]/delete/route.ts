import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const video = await prisma.video.findUnique({ where: { id }, select: { id: true } })
    if (!video) return notFound('Video not found')

    await prisma.activityLog.deleteMany({
      where: { entity_type: 'video', entity_id: id },
    })

    await prisma.video.delete({ where: { id } })

    return ok({ deleted: true })
  } catch {
    return serverError()
  }
}
