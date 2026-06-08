import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  niche: z.string().min(1).max(50).optional(),
  contact_name: z.string().min(1).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().max(20).nullable().optional(),
  retainer_amount: z.number().int().positive().optional(),
  package_tier: z.enum(['starter', 'growth', 'premium']).optional(),
  status: z.enum(['active', 'on_hold', 'upcoming', 'ended', 'archived']).optional(),
  contract_start_date: z.string().optional(),
  contract_end_date: z.string().nullable().optional(),
  min_contract_months: z.number().int().positive().nullable().optional(),
  youtube_url: z.string().url().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        videos: {
          where: { status: { notIn: ['delivered', 'cancelled'] } },
          select: { id: true, due_date: true },
          orderBy: { due_date: 'asc' },
        },
      },
    })
    if (!client) return notFound('Client not found')

    return ok({
      ...client,
      videos_active: client.videos.length,
      next_due_date: client.videos[0]?.due_date ?? null,
    })
  } catch {
    return serverError()
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const existing = await prisma.client.findUnique({ where: { id } })
    if (!existing) return notFound('Client not found')

    const { data, error } = parseBody(patchSchema, await req.json())
    if (error) return error

    const { contract_start_date, contract_end_date, ...rest } = data!

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...rest,
        contract_start_date: contract_start_date ? new Date(contract_start_date) : undefined,
        contract_end_date: contract_end_date
          ? new Date(contract_end_date)
          : contract_end_date === null ? null : undefined,
      },
    })

    if (data!.status && data!.status !== existing.status) {
      await prisma.activityLog.create({
        data: { entity_type: 'client', entity_id: id, user_id: user.id, action: `Status changed from ${existing.status} to ${data!.status}` },
      })
    }
    if (data!.retainer_amount !== undefined && data!.retainer_amount !== existing.retainer_amount) {
      await prisma.activityLog.create({
        data: { entity_type: 'client', entity_id: id, user_id: user.id, action: `Retainer amount changed from ${existing.retainer_amount} to ${data!.retainer_amount}` },
      })
    }

    return ok(updated)
  } catch {
    return serverError()
  }
}
