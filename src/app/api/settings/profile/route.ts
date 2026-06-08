import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    return ok({ id: user.id, name: user.name, email: user.email })
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

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: data!,
      select: { id: true, name: true, email: true },
    })

    return ok(updated)
  } catch {
    return serverError()
  }
}
