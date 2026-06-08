import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { created, paginated, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'
import { parsePagination, parseSort } from '@/lib/paginate'

const INCOME_CATEGORIES = ['client_retainer', 'other_income'] as const
const EXPENSE_CATEGORIES = ['salary_fulltime', 'freelancer_payment', 'software_subscription',
  'equipment', 'marketing', 'office_rent', 'utilities', 'other_expense'] as const

const createSchema = z.object({
  date: z.string().default(() => new Date().toISOString().split('T')[0]),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  description: z.string().min(1).max(200),
  amount: z.number().positive().transform(n => Math.round(n)),
  payment_method: z.enum(['bank_transfer', 'upi', 'cash', 'other']),
  client_id: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  notes: z.string().max(300).optional(),
  receipt_url: z.string().url().optional(),
}).superRefine((d, ctx) => {
  const incomeSet = new Set(INCOME_CATEGORIES as readonly string[])
  const expenseSet = new Set(EXPENSE_CATEGORIES as readonly string[])
  if (d.type === 'income' && !incomeSet.has(d.category)) {
    ctx.addIssue({ code: 'custom', path: ['category'], message: `Category must be one of: ${INCOME_CATEGORIES.join(', ')}` })
  }
  if (d.type === 'expense' && !expenseSet.has(d.category)) {
    ctx.addIssue({ code: 'custom', path: ['category'], message: `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}` })
  }
  if (d.category === 'client_retainer' && !d.client_id) {
    ctx.addIssue({ code: 'custom', path: ['client_id'], message: 'client_id is required for client_retainer category' })
  }
  if ((d.category === 'salary_fulltime' || d.category === 'freelancer_payment') && !d.employee_id) {
    ctx.addIssue({ code: 'custom', path: ['employee_id'], message: 'employee_id is required for payroll categories' })
  }
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const url = new URL(req.url)
    const { page, limit, skip } = parsePagination(url)
    const monthFrom = url.searchParams.get('monthFrom')
    const monthTo = url.searchParams.get('monthTo')
    const typeFilter = url.searchParams.get('type')
    const categories = url.searchParams.getAll('category[]')
    const clientId = url.searchParams.get('client_id')
    const employeeId = url.searchParams.get('employee_id')
    const search = url.searchParams.get('q')

    const where: any = {}
    if (monthFrom) where.date = { ...(where.date ?? {}), gte: new Date(`${monthFrom}-01`) }
    if (monthTo) {
      const [y, m] = monthTo.split('-').map(Number)
      where.date = { ...(where.date ?? {}), lte: new Date(y, m, 0) }
    }
    if (typeFilter && typeFilter !== 'both') where.type = typeFilter
    if (categories.length) where.category = { in: categories }
    if (clientId) where.client_id = clientId
    if (employeeId) where.employee_id = employeeId
    if (search) where.description = { contains: search, mode: 'insensitive' }

    const [entries, total] = await Promise.all([
      prisma.financeEntry.findMany({
        where, skip, take: limit,
        orderBy: { date: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          employee: { select: { id: true, user: { select: { name: true } } } },
        },
      }),
      prisma.financeEntry.count({ where }),
    ])

    return paginated(entries, { page, limit, total })
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

    const entry = await prisma.financeEntry.create({
      data: {
        date: new Date(data!.date),
        type: data!.type,
        category: data!.category,
        description: data!.description,
        amount: data!.amount,
        payment_method: data!.payment_method,
        client_id: data!.client_id,
        employee_id: data!.employee_id,
        notes: data!.notes,
        receipt_url: data!.receipt_url,
      },
    })

    return created(entry)
  } catch {
    return serverError()
  }
}
