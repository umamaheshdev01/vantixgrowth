import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseClient, createSupabaseAdmin } from '@/lib/supabase'
import { ok, badRequest, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const schema = z.object({
  access_token: z.string().min(1),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const { data, error: ve } = parseBody(schema, await req.json())
    if (ve) return ve

    const { data: { user }, error } = await createSupabaseClient().auth.getUser(data!.access_token)
    if (error || !user) return badRequest('Invalid or expired reset token')

    const { error: updateErr } = await createSupabaseAdmin().auth.admin.updateUserById(user.id, {
      password: data!.new_password,
    })
    if (updateErr) return badRequest('Failed to update password')

    return ok({ message: 'Password updated successfully' })
  } catch {
    return serverError()
  }
}
