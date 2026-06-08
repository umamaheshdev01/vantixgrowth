'use client'

import { useParams } from 'next/navigation'
import VideoDetailView from '@/components/videos/VideoDetailView'

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  return <VideoDetailView videoId={id} />
}
