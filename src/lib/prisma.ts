import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function makeClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 5, // prevent connection exhaustion on Supabase (free tier cap: 25)
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter } as any)
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? makeClient()

// Cache on globalThis in both dev (survives HMR) and prod (survives across
// requests within the same warm serverless function instance)
globalForPrisma.prisma = prisma
