import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, unprocessable, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const schema = z.object({ notes: z.string().min(1) })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const video = await prisma.video.findUnique({ where: { id } })
    if (!video) return notFound('Video not found')

    if (video.status === 'cancelled') {
      return unprocessable('Cancelled videos cannot change status')
    }

    const { data, error } = parseBody(schema, await req.json())
    if (error) return error

    const updateData: any = { status: 'revisions_requested', revision_count: { increment: 1 } }

    const [updated] = await Promise.all([
      prisma.video.update({ where: { id }, data: updateData }),
      prisma.videoStatusHistory.create({
        data: {
          video_id: id,
          from_status: video.status as any,
          to_status: 'revisions_requested',
          changed_by: user.id,
          revision_notes: data!.notes,
        },
      }),
      prisma.activityLog.create({
        data: {
          entity_type: 'video', entity_id: id, user_id: user.id,
          action: `Revisions requested`,
        },
      }),
    ])

    return ok(updated)
  } catch {
    return serverError()
  }
}
