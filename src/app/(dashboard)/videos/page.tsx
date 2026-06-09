'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Loader2, Video } from 'lucide-react'
import VideoListAdminView from '@/components/videos/VideoListAdminView'
import PageShell from '@/components/shared/PageShell'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
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
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/lib/api'
import { invalidate, REFRESH } from '@/lib/swr'
import { formatDate, getDaysUntil } from '@/lib/dateHelpers'
import { statusLabels } from '@/lib/statusLabels'
import { useToast } from '@/hooks/use-toast'

// Next stage map — only includes transitions reachable from current status
const NEXT_STAGE: Record<string, { next: string; label: string; employeeAllowed: boolean }> = {
  assigned:            { next: 'in_editing',     label: 'In Editing',     employeeAllowed: true },
  in_editing:          { next: 'internal_review', label: 'Internal Review', employeeAllowed: false },
  revisions_requested: { next: 'in_revision',    label: 'In Revision',    employeeAllowed: true },
  in_revision:         { next: 'sent_to_client', label: 'Sent to Client', employeeAllowed: false },
}

interface MyVideo {
  id: string
  title: string
  status: string
  due_date: string
  video_type: string
  days_remaining: number
  client: { name: string }
}

function DaysCell({ days }: { days: number }) {
  if (days < 0) return <span className="text-xs font-medium" style={{ color: '#EF4444' }}>{Math.abs(days)}d overdue</span>
  if (days === 0) return <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>Due today</span>
  if (days <= 3) return <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>{days}d left</span>
  return <span className="text-xs text-muted-foreground">{days}d left</span>
}

function EmployeeVideoView() {
  const { toast } = useToast()
  const [advancing, setAdvancing] = useState<string | null>(null)

  const { data, isLoading: loading } =
    useSWR<MyVideo[]>('/api/videos/mine?limit=200', { refreshInterval: REFRESH.VIDEOS })
  const videos = data ?? []

  const handleAdvance = async (video: MyVideo) => {
    const transition = NEXT_STAGE[video.status]
    if (!transition?.employeeAllowed) return

    setAdvancing(video.id)
    const res = await apiFetch(`/api/videos/${video.id}/advance`, { method: 'POST' })
    setAdvancing(null)

    if (!res.success) {
      toast({ variant: 'destructive', title: 'Failed to update status', description: res.error ?? 'Try again' })
      return
    }

    toast({
      variant: 'success',
      title: `Status updated to ${transition.label}`,
    })
    invalidate('/api/videos', 'dashboard:')
  }

  return (
    <PageShell
      title="My Tasks"
      subtitle="Your assigned videos"
      icon={Video}
    >
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No tasks yet"
              message="You have no videos assigned to you at the moment."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Video Title', 'Client', 'Due Date', 'Status', 'Days Remaining', 'Action'].map(h => (
                      <TableHead key={h} className={h === 'Action' ? 'text-right' : undefined}>
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((v, idx) => {
                    const dueDateStr = v.due_date.split('T')[0]
                    const transition = NEXT_STAGE[v.status]
                    const isCancelled = v.status === 'cancelled'

                    return (
                      <TableRow key={v.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                        <TableCell className="font-medium text-foreground">{v.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.client.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(dueDateStr)}
                        </TableCell>
                        <TableCell><StatusBadge status={v.status} /></TableCell>
                        <TableCell>
                          <DaysCell days={v.days_remaining ?? getDaysUntil(dueDateStr)} />
                        </TableCell>
                        <TableCell className="text-right">
                          {isCancelled ? (
                            <span className="text-xs text-muted-foreground">Cancelled</span>
                          ) : transition?.employeeAllowed ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs px-3"
                              disabled={advancing === v.id}
                              onClick={() => handleAdvance(v)}
                            >
                              {advancing === v.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : null}
                              Mark as {transition.label}
                            </Button>
                          ) : (
                            <span className="text-xs italic" style={{ color: '#9CA3AF' }}>
                              Awaiting admin review
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}

function AdminVideoView() {
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)

  useEffect(() => {
    setSearchParams(new URLSearchParams(window.location.search))
  }, [])

  if (!searchParams) return null

  return (
    <VideoListAdminView
      initialStatus={searchParams.get('status') ?? undefined}
      initialClient={searchParams.get('client') ?? undefined}
    />
  )
}

export default function VideoListPage() {
  const { user } = useAuth()

  if (user?.role === 'employee') {
    return <EmployeeVideoView />
  }

  return <AdminVideoView />
}
