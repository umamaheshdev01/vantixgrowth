import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, unprocessable, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const schema = z.object({
  status: z.enum(['brief_received', 'footage_received', 'assigned', 'in_editing',
    'internal_review', 'sent_to_client', 'revisions_requested', 'in_revision',
    'approved', 'delivered', 'cancelled']),
  cancellation_note: z.string().min(1).optional(),
  revision_notes: z.string().optional(),
})

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

    if (data!.status === 'cancelled' && !data!.cancellation_note) {
      return unprocessable('A cancellation note is required when cancelling a video')
    }

    if (data!.status === 'delivered' && !video.final_file_url) {
      return unprocessable('A Final File URL is required before marking this video as Delivered.')
    }

    const updateData: any = { status: data!.status }
    if (data!.status === 'assigned' && !video.assigned_at) updateData.assigned_at = new Date()
    if (data!.status === 'revisions_requested') updateData.revision_count = { increment: 1 }

    const [updated] = await Promise.all([
      prisma.video.update({ where: { id }, data: updateData }),
      prisma.videoStatusHistory.create({
        data: {
          video_id: id,
          from_status: video.status as any,
          to_status: data!.status as any,
          changed_by: user.id,
          revision_notes: data!.cancellation_note ?? data!.revision_notes ?? null,
        },
      }),
      prisma.activityLog.create({
        data: {
          entity_type: 'video', entity_id: id, user_id: user.id,
          action: `Status changed from ${video.status} to ${data!.status}`,
        },
      }),
    ])

    return ok(updated)
  } catch {
    return serverError()
  }
}
