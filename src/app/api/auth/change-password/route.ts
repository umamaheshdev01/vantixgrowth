import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseClient, createSupabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { ok, badRequest, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const schema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const appUser = await requireAuth(req)
    if (appUser instanceof NextResponse) return appUser

    const { data, error: ve } = parseBody(schema, await req.json())
    if (ve) return ve

    const supabase = createSupabaseClient()

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: appUser.email,
      password: data!.current_password,
    })
    if (signInErr) return badRequest('Current password is incorrect')

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')!.slice(7),
    )

    const supabaseAdmin = createSupabaseAdmin()
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user!.id, {
      password: data!.new_password,
      user_metadata: { force_password_change: false },
    })
    if (updateErr) return serverError('Failed to update password')

    return ok({ message: 'Password changed successfully' })
  } catch {
    return serverError()
  }
}
