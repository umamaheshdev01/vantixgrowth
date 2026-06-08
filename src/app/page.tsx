'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function RootPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) router.push('/login')
    else if (user.role === 'admin') router.push('/dashboard')
    else router.push('/videos')
  }, [user, loading, router])

  return null
}
