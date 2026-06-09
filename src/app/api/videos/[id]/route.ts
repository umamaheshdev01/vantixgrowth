import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { ok, notFound, badRequest, forbidden, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const patchSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  video_type: z.enum(['long_form', 'short_form', 'reel', 'thumbnail', 'other']).optional(),
  assigned_editor_id: z.string().uuid().nullable().optional(),
  due_date: z.string().optional(),
  brief_url: z.string().url().max(500).nullable().optional(),
  footage_url: z.string().url().max(500).nullable().optional(),
  final_file_url: z.string().url().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    const { id } = await params

    if (user.role === 'employee') {
      const emp = await prisma.employee.findUnique({ where: { user_id: user.id }, select: { id: true } })
      if (!emp) return forbidden()
      const video = await prisma.video.findFirst({ where: { id, assigned_editor_id: emp.id } })
      if (!video) return forbidden()
    }

    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
        assigned_editor: { select: { id: true, user: { select: { name: true } } } },
        status_history: { orderBy: { created_at: 'asc' }, include: { changer: { select: { name: true } } } },
      },
    })
    if (!video) return notFound('Video not found')

    return ok(video)
  } catch {
    return serverError()
  }
}

// Fields an assigned employee is allowed to edit on their own videos.
// They may NOT reassign the editor or move the due date — those stay admin-only.
const EMPLOYEE_EDITABLE = new Set([
  'title', 'video_type', 'brief_url', 'footage_url', 'final_file_url', 'notes',
])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const existing = await prisma.video.findUnique({ where: { id } })
    if (!existing) return notFound('Video not found')

    const { data, error } = parseBody(patchSchema, await req.json())
    if (error) return error

    // Employees may only edit production details on videos assigned to them.
    if (user.role !== 'admin') {
      const emp = await prisma.employee.findUnique({
        where: { user_id: user.id },
        select: { id: true },
      })
      if (!emp || existing.assigned_editor_id !== emp.id) {
        return forbidden('You can only edit videos assigned to you')
      }
      const blocked = Object.keys(data!).filter(
        k => data![k as keyof typeof data] !== undefined && !EMPLOYEE_EDITABLE.has(k),
      )
      if (blocked.length > 0) {
        return forbidden(`You are not allowed to change: ${blocked.join(', ')}`)
      }
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        ...data!,
        due_date: data!.due_date ? new Date(data!.due_date) : undefined,
      },
    })

    return ok(updated)
  } catch {
    return serverError()
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const body = await req.json().catch(() => ({}))
    if (!body.confirm) return badRequest('Send { "confirm": true } to confirm deletion')

    const { id } = await params
    const existing = await prisma.video.findUnique({ where: { id } })
    if (!existing) return notFound('Video not found')

    await prisma.video.delete({ where: { id } })

    return ok({ deleted: true })
  } catch {
    return serverError()
  }
}
