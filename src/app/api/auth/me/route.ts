import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'

export async function GET(req: NextRequest) {
  try {
    const appUser = await requireAuth(req)
    if (appUser instanceof NextResponse) return appUser

    const token = req.headers.get('Authorization')!.slice(7)
    const { data: { user } } = await createSupabaseClient().auth.getUser(token)
    const forcePasswordChange = user?.user_metadata?.force_password_change ?? false

    return ok({ ...appUser, force_password_change: forcePasswordChange })
  } catch {
    return serverError()
  }
}
