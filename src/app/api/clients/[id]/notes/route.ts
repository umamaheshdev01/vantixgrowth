import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const schema = z.object({ notes: z.string().max(1000) })

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const existing = await prisma.client.findUnique({ where: { id }, select: { id: true, notes: true } })
    if (!existing) return notFound('Client not found')

    const { data, error } = parseBody(schema, await req.json())
    if (error) return error

    const updated = await prisma.client.update({
      where: { id },
      data: { notes: data!.notes },
      select: { id: true, notes: true },
    })

    if (data!.notes !== (existing.notes ?? '')) {
      await prisma.activityLog.create({
        data: { entity_type: 'client', entity_id: id, user_id: user.id, action: 'Notes edited' },
      })
    }

    return ok(updated)
  } catch {
    return serverError()
  }
}
