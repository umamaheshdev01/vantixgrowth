import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth'
import { ok, serverError } from '@/lib/response'
import { NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    if (user instanceof NextResponse) return user

    const token = req.headers.get('Authorization')!.slice(7)

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    )
    await supabase.auth.signOut()

    return ok({ message: 'Logged out' })
  } catch {
    return serverError()
  }
}
