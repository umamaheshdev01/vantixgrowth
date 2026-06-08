import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { created, paginated, forbidden, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'
import { parsePagination } from '@/lib/paginate'

const createSchema = z.object({
  title: z.string().min(1).max(150),
  client_id: z.string().uuid(),
  video_type: z.enum(['long_form', 'short_form', 'reel', 'thumbnail', 'other']),
  assigned_editor_id: z.string().uuid().nullable().optional(),
  status: z.enum(['brief_received', 'footage_received', 'assigned', 'in_editing',
    'internal_review', 'sent_to_client', 'revisions_requested', 'in_revision',
    'approved', 'delivered', 'cancelled']).default('brief_received'),
  due_date: z.string().refine(s => !isNaN(new Date(s).getTime()), 'Invalid date'),
  brief_url: z.string().url().max(500).optional(),
  footage_url: z.string().url().max(500).optional(),
  final_file_url: z.string().url().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    if (user.role === 'employee') return forbidden()

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)

    const clientIds = url.searchParams.getAll('client[]')
    const statusFilter = url.searchParams.getAll('status[]')
    const assignedEditor = url.searchParams.get('assigned_editor')
    const videoTypes = url.searchParams.getAll('video_type[]')
    const dueDateFrom = url.searchParams.get('dueDateFrom')
    const dueDateTo = url.searchParams.get('dueDateTo')
    const showDelivered = url.searchParams.get('showDelivered') === 'true'
    const showCancelled = url.searchParams.get('showCancelled') === 'true'
    const search = url.searchParams.get('q')

    const excludeStatuses: string[] = []
    if (!showDelivered) excludeStatuses.push('delivered')
    if (!showCancelled) excludeStatuses.push('cancelled')

    const where: any = {}
    if (excludeStatuses.length && !statusFilter.length) where.status = { notIn: excludeStatuses }
    if (statusFilter.length) where.status = { in: statusFilter }
    if (clientIds.length) where.client_id = { in: clientIds }
    if (assignedEditor) where.assigned_editor_id = assignedEditor
    if (videoTypes.length) where.video_type = { in: videoTypes }
    if (dueDateFrom || dueDateTo) {
      where.due_date = {}
      if (dueDateFrom) where.due_date.gte = new Date(dueDateFrom)
      if (dueDateTo) where.due_date.lte = new Date(dueDateTo)
    }
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { client: { name: { contains: search, mode: 'insensitive' } } },
    ]

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where, skip, take: limit,
        orderBy: { due_date: 'asc' },
        include: {
          client: { select: { id: true, name: true } },
          assigned_editor: { select: { id: true, user: { select: { name: true } } } },
        },
      }),
      prisma.video.count({ where }),
    ])

    return paginated(videos, { page, limit, total })
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { data, error } = parseBody(createSchema, await req.json())
    if (error) return error

    const video = await prisma.video.create({
      data: {
        title: data!.title,
        client_id: data!.client_id,
        video_type: data!.video_type,
        assigned_editor_id: data!.assigned_editor_id ?? null,
        status: data!.status,
        due_date: new Date(data!.due_date),
        brief_url: data!.brief_url,
        footage_url: data!.footage_url,
        final_file_url: data!.final_file_url,
        notes: data!.notes,
      },
    })

    await Promise.all([
      prisma.activityLog.create({
        data: { entity_type: 'client', entity_id: data!.client_id, user_id: user.id, action: `Video added: ${video.title}` },
      }),
      prisma.activityLog.create({
        data: { entity_type: 'video', entity_id: video.id, user_id: user.id, action: 'Video created' },
      }),
    ])

    return created(video)
  } catch {
    return serverError()
  }
}
