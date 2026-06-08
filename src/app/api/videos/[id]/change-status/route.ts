import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, notFound, forbidden, unprocessable, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const VIDEO_STATUSES = [
  'brief_received', 'footage_received', 'assigned', 'in_editing',
  'internal_review', 'sent_to_client', 'revisions_requested', 'in_revision',
  'approved', 'delivered', 'cancelled',
] as const

const EMPLOYEE_ALLOWED = new Set(['in_editing', 'in_revision'])

const schema = z.object({
  to_status: z.enum(VIDEO_STATUSES),
  revision_notes: z.string().max(1000).optional().nullable(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const video = await prisma.video.findUnique({ where: { id } })
    if (!video) return notFound('Video not found')

    const { data, error } = parseBody(schema, await req.json())
    if (error) return error

    const toStatus = data!.to_status
    const fromStatus = video.status

    if (user.role === 'employee' && !EMPLOYEE_ALLOWED.has(toStatus)) {
      return forbidden('This status change requires admin permissions')
    }

    if (toStatus === 'delivered' && !video.final_file_url) {
      return unprocessable(
        'A Final File URL is required before marking this video as Delivered.',
      )
    }

    if (toStatus === 'cancelled' && !data!.revision_notes?.trim()) {
      return unprocessable('A cancellation note is required.')
    }

    const updateData: Record<string, unknown> = { status: toStatus }
    if (toStatus === 'assigned' && !video.assigned_at) {
      updateData.assigned_at = new Date()
    }
    if (toStatus === 'revisions_requested') {
      updateData.revision_count = { increment: 1 }
    }

    const historyData: Record<string, unknown> = {
      video_id: id,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: user.id,
    }
    if (data!.revision_notes) {
      historyData.revision_notes = data!.revision_notes
    }

    const [updated] = await Promise.all([
      prisma.video.update({ where: { id }, data: updateData as any }),
      prisma.videoStatusHistory.create({ data: historyData as any }),
      prisma.activityLog.create({
        data: {
          entity_type: 'video',
          entity_id: id,
          user_id: user.id,
          action: `Status changed from ${fromStatus} to ${toStatus}`,
        },
      }),
    ])

    return ok(updated)
  } catch {
    return serverError()
  }
}
