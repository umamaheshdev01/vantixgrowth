import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function makeClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter } as any)
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
