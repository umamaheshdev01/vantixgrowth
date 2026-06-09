import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, notFound, forbidden, unprocessable, serverError } from '@/lib/response'

const ADVANCE_MAP: Record<string, string> = {
  brief_received: 'footage_received',
  footage_received: 'assigned',
  assigned: 'in_editing',
  in_editing: 'internal_review',
  internal_review: 'sent_to_client',
  sent_to_client: 'approved',
  approved: 'delivered',
  revisions_requested: 'in_revision',
  in_revision: 'sent_to_client',
}

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

    if (video.status === 'cancelled') {
      return unprocessable('Cancelled videos cannot change status')
    }

    const nextStatus = ADVANCE_MAP[video.status]
    if (!nextStatus) return unprocessable(`No advance transition defined from "${video.status}"`)

    // Employees may advance their own videos through any stage (no admin gate).
    if (user.role === 'employee') {
      const emp = await prisma.employee.findUnique({ where: { user_id: user.id }, select: { id: true } })
      if (video.assigned_editor_id !== emp?.id) return forbidden('You can only advance your own videos')
    }

    if (nextStatus === 'delivered' && !video.final_file_url) {
      return unprocessable('A Final File URL is required before marking this video as Delivered.')
    }

    const updateData: any = { status: nextStatus }
    if (nextStatus === 'assigned') updateData.assigned_at = new Date()
    if (nextStatus === 'revisions_requested') updateData.revision_count = { increment: 1 }

    const [updated] = await Promise.all([
      prisma.video.update({ where: { id }, data: updateData }),
      prisma.videoStatusHistory.create({
        data: {
          video_id: id,
          from_status: video.status as any,
          to_status: nextStatus as any,
          changed_by: user.id,
        },
      }),
      prisma.activityLog.create({
        data: {
          entity_type: 'video', entity_id: id, user_id: user.id,
          action: `Status changed from ${video.status} to ${nextStatus}`,
        },
      }),
    ])

    return ok(updated)
  } catch {
    return serverError()
  }
}
