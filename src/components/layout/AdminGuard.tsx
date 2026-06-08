'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

// Equivalent to AdminRoute in React Router — only admin role passes through.
// The parent dashboard layout already guards against unauthenticated access,
// so this only needs to check the role.
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    // Dashboard layout already guards unauthenticated access via session.
    // AdminGuard only enforces the role — redirect non-admins to /videos.
    if (user && user.role !== 'admin') {
      router.replace('/videos')
    }
  }, [user, loading, router])

  if (loading) return null
  // If user profile not loaded yet, don't block (session guard already passed)
  if (user && user.role !== 'admin') return null

  return <>{children}</>
}
