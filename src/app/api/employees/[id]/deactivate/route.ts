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

    const activeVideos = await prisma.video.count({
      where: { assigned_editor_id: id, status: { notIn: ['delivered', 'cancelled'] } },
    })

    const [updated] = await Promise.all([
      prisma.employee.update({ where: { id }, data: { status: 'inactive' } }),
      prisma.user.update({ where: { id: employee.user_id }, data: { status: 'inactive' } }),
    ])

    return ok({
      employee: updated,
      warning: activeVideos > 0
        ? `This employee has ${activeVideos} active video(s) assigned. Videos have not been reassigned.`
        : null,
    })
  } catch {
    return serverError()
  }
}
