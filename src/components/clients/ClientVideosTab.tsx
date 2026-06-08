'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Video } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'
import StatusBadge from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiFetch } from '@/lib/api'
import { formatDate, getDaysUntil } from '@/lib/dateHelpers'
import type { ClientVideo } from '@/types/client'

const VIDEO_TYPE_LABELS: Record<string, string> = {
  long_form: 'Long Form',
  short_form: 'Short Form',
  reel: 'Reel',
  thumbnail: 'Thumbnail',
  other: 'Other',
}

function DaysCell({ dueDate }: { dueDate: string }) {
  const days = getDaysUntil(dueDate.split('T')[0])
  if (days < 0) return <span className="text-destructive font-medium">{Math.abs(days)}d overdue</span>
  if (days === 0) return <span className="text-destructive font-medium">Due today</span>
  if (days <= 2) return <span className="text-destructive">{days}d left</span>
  if (days <= 5) return <span className="text-amber-400">{days}d left</span>
  return <span className="text-muted-foreground">{days}d left</span>
}

interface ClientVideosTabProps {
  clientId: string
  clientName: string
}

export default function ClientVideosTab({ clientId, clientName }: ClientVideosTabProps) {
  const [videos, setVideos] = useState<ClientVideo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await apiFetch<ClientVideo[]>(`/api/clients/${clientId}/videos?limit=100`)
      setVideos(res.success && res.data ? res.data : [])
      setLoading(false)
    }
    load()
  }, [clientId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Videos for <span className="font-medium text-foreground">{clientName}</span>
        </p>
        <Button size="sm" asChild>
          <Link href={`/videos?client=${clientId}&action=add`}>
            <Plus className="h-4 w-4" />
            Add Video for this Client
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : videos.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No videos yet"
              message="Add the first video for this client to start tracking production."
              actionLabel="Add Video"
              onAction={() => window.location.href = `/videos?client=${clientId}&action=add`}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Title', 'Type', 'Editor', 'Due Date', 'Status', 'Revisions', 'Time Left'].map(h => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map(video => (
                    <TableRow key={video.id} className="cursor-pointer" onClick={() => window.location.href = `/videos/${video.id}`}>
                      <TableCell>
                        <Link
                          href={`/videos/${video.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 max-w-[220px]"
                          onClick={e => e.stopPropagation()}
                        >
                          {video.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {VIDEO_TYPE_LABELS[video.video_type] ?? video.video_type}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {video.assigned_editor?.user.name ?? (
                          <span className="text-muted-foreground/50 italic text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(video.due_date.split('T')[0])}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={video.status} variant="video" />
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{video.revision_count}</TableCell>
                      <TableCell>
                        {!['delivered', 'cancelled'].includes(video.status) ? (
                          <DaysCell dueDate={video.due_date} />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
