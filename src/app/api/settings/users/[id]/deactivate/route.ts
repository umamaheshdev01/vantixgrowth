import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, unprocessable, serverError } from '@/lib/response'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params

    if (id === user.id) {
      return unprocessable('You cannot deactivate your own account')
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return notFound('User not found')

    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'inactive' },
      select: { id: true, name: true, email: true, role: true, status: true },
    })

    return ok(updated)
  } catch {
    return serverError()
  }
}
