import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { createClient } from '@supabase/supabase-js'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  const name = process.env.SEED_ADMIN_NAME
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!name || !email || !password) {
    console.error('Missing: SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin with email "${email}" already exists — skipping.`)
    return
  }

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const existingAuth = authUsers?.users?.find(u => u.email === email)

  let authUserId: string

  if (existingAuth) {
    console.log(`Supabase auth identity for "${email}" already exists — reusing.`)
    authUserId = existingAuth.id
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error || !data.user) {
      console.error('Failed to create Supabase auth user:', error?.message)
      process.exit(1)
    }
    authUserId = data.user.id
    console.log(`Supabase auth user created (id: ${authUserId})`)
  }

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      password_hash: '__SUPABASE_MANAGED__',
      role: 'admin',
      status: 'active',
    },
  })

  console.log(`Admin user created: ${admin.email} (app id: ${admin.id})`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
