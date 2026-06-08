'use client'

import PageShell from '@/components/shared/PageShell'
import { useAuth } from '@/context/AuthContext'
import { Video } from 'lucide-react'

export default function VideoListPage() {
  const { user } = useAuth()
  const subtitle = user?.role === 'admin'
    ? 'Track all videos across clients and stages'
    : 'Your assigned videos and their current status'

  return (
    <PageShell
      title="Video Tracker"
      subtitle={subtitle}
      icon={Video}
    />
  )
}
