'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/layout/Sidebar'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [session, loading, router])

  if (loading || !session) {
    return (
      <div className="flex h-screen bg-background">
        <Skeleton className="hidden md:block w-14 lg:w-60 h-full rounded-none shrink-0" />
        <main className="flex-1 p-6 lg:p-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto pt-14 md:pt-0">
        <div className="pointer-events-none absolute inset-0 glow-top" />
        <div className="relative p-5 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
