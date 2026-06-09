import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'

// Returns the employee record for the currently authenticated user.
// Lets an employee view their own profile without knowing their employee id.
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    const employee = await prisma.employee.findUnique({
      where: { user_id: user.id },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    })
    if (!employee) return notFound('No employee record found for this account')

    const totalPaid = await prisma.financeEntry.aggregate({
      _sum: { amount: true },
      where: { employee_id: employee.id, type: 'expense' },
    })

    return ok({ ...employee, total_paid_to_date: totalPaid._sum.amount ?? 0 })
  } catch {
    return serverError()
  }
}
