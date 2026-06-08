import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { notFound, ok, serverError } from '@/lib/response'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const exists = await prisma.employee.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return notFound('Employee not found')

    const deliveredHistory = await prisma.videoStatusHistory.findMany({
      where: {
        to_status: 'delivered',
        video: { assigned_editor_id: id },
      },
      include: { video: { select: { due_date: true, assigned_at: true } } },
      orderBy: { created_at: 'asc' },
    })

    const total_delivered = deliveredHistory.length
    let on_time = 0, late = 0, total_turnaround_days = 0, turnaround_count = 0

    for (const h of deliveredHistory) {
      const deliveredAt = h.created_at
      const dueDate = h.video.due_date
      const assignedAt = h.video.assigned_at

      if (deliveredAt <= dueDate) on_time++
      else late++

      if (assignedAt) {
        const days = (deliveredAt.getTime() - assignedAt.getTime()) / (1000 * 60 * 60 * 24)
        total_turnaround_days += days
        turnaround_count++
      }
    }

    const late_pct = total_delivered === 0 ? '—' : `${((late / total_delivered) * 100).toFixed(1)}%`
    const avg_turnaround_days = turnaround_count === 0
      ? '—'
      : parseFloat((total_turnaround_days / turnaround_count).toFixed(1))

    return ok({ total_delivered, on_time, late, late_pct, avg_turnaround_days })
  } catch {
    return serverError()
  }
}
