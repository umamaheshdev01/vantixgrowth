import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'
import { ok, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const schema = z.object({
  email: z.string().email(),
})

const GENERIC_MSG = 'If an account with that email exists, a reset link has been sent.'

export async function POST(req: NextRequest) {
  try {
    const { data, error: ve } = parseBody(schema, await req.json())
    if (ve) return ok({ message: GENERIC_MSG })

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/reset-password`

    await createSupabaseClient().auth.resetPasswordForEmail(data!.email, { redirectTo })

    return ok({ message: GENERIC_MSG })
  } catch {
    return serverError()
  }
}
