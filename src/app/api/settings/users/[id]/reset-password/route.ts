import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { ok, notFound, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'
import { createSupabaseAdmin } from '@/lib/supabase'

const schema = z.object({ temp_password: z.string().min(8) })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const { id } = await params
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) return notFound('User not found')

    const { data, error } = parseBody(schema, await req.json())
    if (error) return error

    const supabaseAdmin = createSupabaseAdmin()
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = authUsers?.users?.find(u => u.email === target.email)

    if (authUser) {
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: data!.temp_password,
        user_metadata: { force_password_change: true },
      })
    }

    return ok({ message: 'Temporary password set. User must change it on next login.' })
  } catch {
    return serverError()
  }
}
