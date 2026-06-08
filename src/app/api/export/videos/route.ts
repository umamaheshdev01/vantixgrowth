import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { serverError } from '@/lib/response'

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const url = new URL(req.url)
    const statusFilter = url.searchParams.get('status')

    const videos = await prisma.video.findMany({
      where: statusFilter ? { status: statusFilter as any } : undefined,
      orderBy: { due_date: 'asc' },
      select: {
        id: true, title: true, video_type: true, status: true, due_date: true,
        revision_count: true, assigned_at: true, created_at: true,
        client: { select: { name: true } },
        assigned_editor: { select: { user: { select: { name: true } } } },
      },
    })

    const rows = videos.map(v => ({
      id: v.id,
      title: v.title,
      client_name: v.client.name,
      video_type: v.video_type,
      status: v.status,
      due_date: v.due_date.toISOString().split('T')[0],
      revision_count: v.revision_count,
      assigned_editor: v.assigned_editor?.user.name ?? '',
      assigned_at: v.assigned_at?.toISOString().split('T')[0] ?? '',
      created_at: v.created_at.toISOString().split('T')[0],
    }))

    const headers = ['id', 'title', 'client_name', 'video_type', 'status', 'due_date',
      'revision_count', 'assigned_editor', 'assigned_at', 'created_at']

    const csv = toCSV(rows as any, headers)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="videos-export.csv"`,
      },
    })
  } catch {
    return serverError()
  }
}
