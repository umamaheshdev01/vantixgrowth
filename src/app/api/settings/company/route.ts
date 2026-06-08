import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const patchSchema = z.object({
  company_name: z.string().max(100).nullable().optional(),
  fy_start_month: z.number().int().min(1).max(12).optional(),
  currency_format: z.string().max(20).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const settings = await prisma.companySettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    })

    return ok(settings)
  } catch {
    return serverError()
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { data, error } = parseBody(patchSchema, await req.json())
    if (error) return error

    const updated = await prisma.companySettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data! },
      update: data!,
    })

    return ok(updated)
  } catch {
    return serverError()
  }
}
