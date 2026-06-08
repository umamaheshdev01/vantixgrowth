import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, badRequest, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const INCOME_CATEGORIES = ['client_retainer', 'other_income'] as const
const EXPENSE_CATEGORIES = ['salary_fulltime', 'freelancer_payment', 'software_subscription',
  'equipment', 'marketing', 'office_rent', 'utilities', 'other_expense'] as const

const patchSchema = z.object({
  date: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().transform(n => Math.round(n)).optional(),
  payment_method: z.enum(['bank_transfer', 'upi', 'cash', 'other']).optional(),
  client_id: z.string().uuid().nullable().optional(),
  employee_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(300).nullable().optional(),
  receipt_url: z.string().url().nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const entry = await prisma.financeEntry.findUnique({ where: { id } })
    if (!entry) return notFound('Finance entry not found')

    return ok(entry)
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
    const existing = await prisma.financeEntry.findUnique({ where: { id } })
    if (!existing) return notFound('Finance entry not found')

    const { data, error } = parseBody(patchSchema, await req.json())
    if (error) return error

    const effectiveType = data!.type ?? existing.type
    const effectiveCategory = data!.category ?? existing.category
    const incomeSet = new Set(INCOME_CATEGORIES as readonly string[])
    const expenseSet = new Set(EXPENSE_CATEGORIES as readonly string[])

    if (effectiveType === 'income' && !incomeSet.has(effectiveCategory)) {
      return badRequest(`Invalid category for income type`)
    }
    if (effectiveType === 'expense' && !expenseSet.has(effectiveCategory)) {
      return badRequest(`Invalid category for expense type`)
    }

    const updated = await prisma.financeEntry.update({
      where: { id },
      data: { ...data!, date: data!.date ? new Date(data!.date) : undefined },
    })

    return ok(updated)
  } catch {
    return serverError()
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const body = await req.json().catch(() => ({}))
    if (!body.confirm) return badRequest('Send { "confirm": true } to confirm deletion')

    const { id } = await params
    const existing = await prisma.financeEntry.findUnique({ where: { id } })
    if (!existing) return notFound('Finance entry not found')

    await prisma.financeEntry.delete({ where: { id } })

    return ok({ deleted: true })
  } catch {
    return serverError()
  }
}
