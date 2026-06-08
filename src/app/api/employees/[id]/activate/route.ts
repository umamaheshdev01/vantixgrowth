import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const employee = await prisma.employee.findUnique({ where: { id } })
    if (!employee) return notFound('Employee not found')

    const [updated] = await Promise.all([
      prisma.employee.update({ where: { id }, data: { status: 'active' } }),
      prisma.user.update({ where: { id: employee.user_id }, data: { status: 'active' } }),
    ])

    return ok({ employee: updated })
  } catch {
    return serverError()
  }
}
