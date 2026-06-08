import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'
import { ok, badRequest, serverError } from '@/lib/response'
import { parseBody } from '@/lib/validate'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const { data, error: ve } = parseBody(schema, await req.json())
    if (ve) return badRequest('Invalid email or password format')

    const supabase = createSupabaseClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data!.email,
      password: data!.password,
    })

    if (error || !authData.session) return badRequest('Invalid email or password')

    const appUser = await prisma.user.findUnique({
      where: { email: data!.email },
      select: { id: true, name: true, email: true, role: true, status: true },
    })

    if (!appUser) return badRequest('Account not found')
    if (appUser.status !== 'active') return badRequest('Account is inactive')

    const forcePasswordChange = authData.user.user_metadata?.force_password_change ?? false

    return ok({
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
      user: { ...appUser, force_password_change: forcePasswordChange },
    })
  } catch {
    return serverError()
  }
}
