import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, created, paginated, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'
import { parsePagination } from '@/lib/paginate'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  niche: z.string().min(1).max(50),
  contact_name: z.string().min(1),
  contact_email: z.string().email(),
  contact_phone: z.string().max(20).optional(),
  retainer_amount: z.number().int().positive(),
  package_tier: z.enum(['starter', 'growth', 'premium']),
  status: z.enum(['active', 'on_hold', 'upcoming', 'ended', 'archived']),
  contract_start_date: z.string().refine(s => {
    const d = new Date(s)
    if (isNaN(d.getTime())) return false
    const ninety = new Date()
    ninety.setDate(ninety.getDate() + 90)
    return d <= ninety
  }, 'Start date cannot be more than 90 days in the future'),
  contract_end_date: z.string().optional(),
  min_contract_months: z.number().int().positive().optional(),
  youtube_url: z.string().url().refine(u =>
    u.startsWith('https://youtube.com/') || u.startsWith('https://www.youtube.com/'),
    'Must be a YouTube URL'
  ).optional(),
  notes: z.string().max(1000).optional(),
  logo_url: z.string().url().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)
    const statusFilter = url.searchParams.getAll('status[]')
    const nicheFilter = url.searchParams.getAll('niche[]')
    const includeArchived = url.searchParams.get('includeArchived') === 'true'

    const where: any = {}
    if (!includeArchived) {
      where.status = statusFilter.length ? { in: statusFilter.filter(s => s !== 'archived') } : { not: 'archived' }
    } else if (statusFilter.length) {
      where.status = { in: statusFilter }
    }
    if (nicheFilter.length) where.niche = { in: nicheFilter }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
        include: {
          videos: {
            where: { status: { notIn: ['delivered', 'cancelled'] } },
            select: { id: true, due_date: true },
            orderBy: { due_date: 'asc' },
          },
        },
      }),
      prisma.client.count({ where }),
    ])

    const data = clients.map(c => ({
      id: c.id, name: c.name, niche: c.niche, contact_name: c.contact_name,
      contact_email: c.contact_email, retainer_amount: c.retainer_amount,
      package_tier: c.package_tier, status: c.status,
      contract_start_date: c.contract_start_date, contract_end_date: c.contract_end_date,
      created_at: c.created_at,
      videos_active: c.videos.length,
      next_due_date: c.videos[0]?.due_date ?? null,
    }))

    return paginated(data, { page, limit, total })
  } catch {
    return serverError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { data, error } = parseBody(createSchema, await req.json())
    if (error) return error

    const client = await prisma.client.create({
      data: {
        name: data!.name,
        niche: data!.niche,
        contact_name: data!.contact_name,
        contact_email: data!.contact_email,
        contact_phone: data!.contact_phone,
        retainer_amount: data!.retainer_amount,
        package_tier: data!.package_tier,
        status: data!.status,
        contract_start_date: new Date(data!.contract_start_date),
        contract_end_date: data!.contract_end_date ? new Date(data!.contract_end_date) : undefined,
        min_contract_months: data!.min_contract_months,
        youtube_url: data!.youtube_url,
        notes: data!.notes,
        logo_url: data!.logo_url,
      },
    })

    await prisma.activityLog.create({
      data: {
        entity_type: 'client',
        entity_id: client.id,
        user_id: user.id,
        action: 'Client created',
      },
    })

    return created(client)
  } catch {
    return serverError()
  }
}
