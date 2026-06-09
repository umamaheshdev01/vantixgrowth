'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Video } from 'lucide-react'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import VideoFormDrawer, { type VideoListItem } from '@/components/videos/VideoFormDrawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api'
import { invalidate, REFRESH } from '@/lib/swr'
import { formatDate, formatDateTime } from '@/lib/dateHelpers'
import { statusLabels } from '@/lib/statusLabels'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string
  from_status: string | null
  to_status: string
  changed_by: string | null
  changed_by_name: string
  revision_notes: string | null
  created_at: string
}

interface ActivityEntry {
  id: string
  action: string
  user_name: string
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  long_form: 'Long-form', short_form: 'YouTube Short', reel: 'Reel',
  thumbnail: 'Thumbnail', other: 'Other',
}

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  long_form:  { bg: 'rgba(29,78,216,0.15)',  color: '#60A5FA' },
  short_form: { bg: 'rgba(21,128,61,0.15)',  color: '#4ADE80' },
  reel:       { bg: 'rgba(109,40,217,0.15)', color: '#A78BFA' },
  thumbnail:  { bg: 'rgba(194,65,12,0.15)',  color: '#FB923C' },
  other:      { bg: 'rgba(255,255,255,0.08)', color: '#9CA3AF' },
}

// Sequential advance map (normal flow)
const ADVANCE_MAP: Record<string, string> = {
  brief_received:      'footage_received',
  footage_received:    'assigned',
  assigned:            'in_editing',
  in_editing:          'internal_review',
  internal_review:     'sent_to_client',
  revisions_requested: 'in_revision',
  in_revision:         'sent_to_client',
  approved:            'delivered',
}

const ALL_STATUSES = [
  'brief_received', 'footage_received', 'assigned', 'in_editing',
  'internal_review', 'sent_to_client', 'revisions_requested', 'in_revision',
  'approved', 'delivered', 'cancelled',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium text-primary hover:underline truncate max-w-[220px] inline-block"
    >
      {label}
    </a>
  )
}

function getStatusDotColor(status: string): string {
  const map: Record<string, string> = {
    brief_received:      '#60A5FA',
    footage_received:    '#4ADE80',
    assigned:            '#A78BFA',
    in_editing:          '#FB923C',
    internal_review:     '#FCD34D',
    sent_to_client:      '#38BDF8',
    revisions_requested: '#F87171',
    in_revision:         '#FB7185',
    approved:            '#4ADE80',
    delivered:           '#94A3B8',
    cancelled:           '#6B7280',
  }
  return map[status] ?? '#6B7280'
}

// ─── Status Update Section ────────────────────────────────────────────────────

function StatusUpdateSection({
  video,
  isAdmin,
  onRefresh,
}: {
  video: VideoListItem
  isAdmin: boolean
  onRefresh: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [jumpStatus, setJumpStatus] = useState('')
  const [jumpNote, setJumpNote] = useState('')
  const [jumpError, setJumpError] = useState('')
  const [applying, setApplying] = useState(false)

  if (video.status === 'delivered') {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">This video has been delivered. No further changes needed.</p>
        </CardContent>
      </Card>
    )
  }

  const runStatusChange = async (toStatus: string, note?: string) => {
    if (toStatus === 'delivered' && !video.final_file_url) {
      toast({ variant: 'destructive', title: 'Final File URL required', description: 'A Final File URL is required before marking this video as Delivered.' })
      return
    }
    if (toStatus === 'cancelled' && !note?.trim()) {
      toast({ variant: 'destructive', title: 'Cancellation note required' })
      return
    }
    setLoading(true)
    const res = await apiFetch(`/api/videos/${video.id}/change-status`, {
      method: 'POST',
      body: JSON.stringify({ to_status: toStatus, revision_notes: note || undefined }),
    })
    setLoading(false)
    if (!res.success) {
      toast({ variant: 'destructive', title: 'Status update failed', description: res.error ?? 'Try again' })
      return
    }
    toast({ variant: 'success', title: `${statusLabels[toStatus] ?? toStatus} — status updated` })
    onRefresh()
  }

  const handleAdvance = async () => {
    const next = ADVANCE_MAP[video.status]
    if (!next) return
    setLoading(true)
    // For most cases use the advance endpoint; for revisions branch, use change-status directly
    const res = await apiFetch(`/api/videos/${video.id}/advance`, { method: 'POST' })
    setLoading(false)
    if (!res.success) {
      toast({ variant: 'destructive', title: 'Advance failed', description: res.error ?? 'Try again' })
      return
    }
    const data = res.data as Record<string, unknown>
    if (data?.awaiting_admin) {
      toast({ title: 'Awaiting admin review' })
      return
    }
    toast({ variant: 'success', title: `${statusLabels[next] ?? next} — status updated` })
    onRefresh()
  }

  const handleApplyJump = async () => {
    setJumpError('')
    if (!jumpStatus) { setJumpError('Select a status first'); return }
    if (jumpStatus === 'delivered' && !video.final_file_url) {
      setJumpError('A Final File URL is required before marking this video as Delivered.')
      return
    }
    if (jumpStatus === 'cancelled' && !jumpNote.trim()) {
      setJumpError('A cancellation note is required.')
      return
    }
    setApplying(true)
    const res = await apiFetch(`/api/videos/${video.id}/change-status`, {
      method: 'POST',
      body: JSON.stringify({ to_status: jumpStatus, revision_notes: jumpNote || undefined }),
    })
    setApplying(false)
    if (!res.success) {
      setJumpError(res.error ?? 'Status update failed')
      return
    }
    toast({ variant: 'success', title: `${statusLabels[jumpStatus] ?? jumpStatus} — status updated` })
    setJumpStatus('')
    setJumpNote('')
    onRefresh()
  }

  const nextStage = ADVANCE_MAP[video.status]
  const isSentToClient = video.status === 'sent_to_client'

  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="text-sm font-semibold text-foreground">Status Update</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Advance buttons */}
        <div className="flex flex-wrap gap-2">
          {isSentToClient && isAdmin ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                disabled={loading}
                onClick={() => runStatusChange('revisions_requested')}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Request Revisions
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
                onClick={() => runStatusChange('approved')}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Mark as Approved
              </Button>
            </>
          ) : nextStage ? (
            !isAdmin && (video.status === 'in_editing' || video.status === 'in_revision')
              ? (
                <span className="text-sm italic text-muted-foreground">Awaiting admin review</span>
              ) : (
                <Button size="sm" disabled={loading} onClick={handleAdvance}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Advance to: {statusLabels[nextStage] ?? nextStage}
                </Button>
              )
          ) : null}
        </div>

        {/* Jump to status (admin only) */}
        {isAdmin && (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Jump to status</p>
            <div className="flex flex-wrap gap-2 items-start">
              <select
                value={jumpStatus}
                onChange={e => { setJumpStatus(e.target.value); setJumpError(''); setJumpNote('') }}
                className="h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="">Select status…</option>
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{statusLabels[s] ?? s}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" disabled={applying} onClick={handleApplyJump}>
                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Apply
              </Button>
            </div>
            {jumpStatus === 'cancelled' && (
              <Textarea
                value={jumpNote}
                onChange={e => setJumpNote(e.target.value)}
                rows={2}
                placeholder="Cancellation note (required)"
                className="text-sm"
              />
            )}
            {jumpError && <p className="text-xs text-destructive">{jumpError}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

function StatusTimeline({ history }: { history: HistoryEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="text-sm font-semibold text-foreground">Production Timeline</h3>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
        ) : (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-0 bottom-4 w-px bg-border" />

            <div className="space-y-5">
              {history.map((entry, idx) => {
                const isCurrent = idx === history.length - 1
                const dotColor = getStatusDotColor(entry.to_status)

                return (
                  <div key={entry.id} className="relative">
                    {/* Dot */}
                    <div
                      className="absolute -left-[22px] top-0.5 flex items-center justify-center"
                      style={{ width: 16, height: 16 }}
                    >
                      {isCurrent ? (
                        <div
                          className="h-4 w-4 rounded-full ring-2 ring-offset-2 ring-offset-background"
                          style={{ backgroundColor: dotColor }}
                        />
                      ) : (
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        />
                      )}
                    </div>

                    <div>
                      <p
                        className="text-sm leading-none"
                        style={{
                          fontWeight: isCurrent ? 700 : 600,
                          color: isCurrent ? dotColor : dotColor,
                        }}
                      >
                        {statusLabels[entry.to_status] ?? entry.to_status}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.changed_by_name} · {formatDateTime(entry.created_at)}
                      </p>
                      {entry.revision_notes && (
                        <div
                          className="mt-1.5 rounded px-3 py-2 text-xs"
                          style={{ backgroundColor: 'rgba(245,158,11,0.10)', color: '#FCD34D' }}
                        >
                          {entry.revision_notes}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Video Details Card ───────────────────────────────────────────────────────

function VideoDetailsCard({
  video,
  isAdmin,
  onEdit,
}: {
  video: VideoListItem
  isAdmin: boolean
  onEdit: () => void
}) {
  const router = useRouter()
  const typeStyle = TYPE_STYLE[video.video_type] ?? TYPE_STYLE.other

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Video Details</h3>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
          {/* Left */}
          <div className="space-y-4">
            <FieldRow label="Client">
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => router.push(`/clients/${video.client_id}`)}
              >
                {video.client?.name ?? '—'}
              </button>
            </FieldRow>
            <FieldRow label="Video Type">
              <span
                className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
              >
                {TYPE_LABEL[video.video_type] ?? video.video_type}
              </span>
            </FieldRow>
            <FieldRow label="Assigned Editor">
              <span className="text-sm">
                {video.assigned_editor?.user.name ?? (
                  <em className="text-muted-foreground">Unassigned</em>
                )}
              </span>
            </FieldRow>
            <FieldRow label="Due Date">
              <span className="text-sm">{formatDate(video.due_date.split('T')[0])}</span>
            </FieldRow>
            <FieldRow label="Created">
              <span className="text-sm">{formatDate(video.created_at.split('T')[0])}</span>
            </FieldRow>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <FieldRow label="Brief / Notes URL">
              {video.brief_url
                ? <ExternalLink href={video.brief_url} label="View brief" />
                : <Dash />}
            </FieldRow>
            <FieldRow label="Raw Footage URL">
              {video.footage_url
                ? <ExternalLink href={video.footage_url} label="View footage" />
                : <Dash />}
            </FieldRow>
            <FieldRow label="Final File URL">
              {video.final_file_url
                ? <ExternalLink href={video.final_file_url} label="View final file" />
                : <Dash />}
            </FieldRow>
            <FieldRow label="Revision Count">
              <span className="text-sm">{video.revision_count}</span>
            </FieldRow>
            <FieldRow label="Assigned At">
              <span className="text-sm">
                {video.assigned_at
                  ? formatDate(video.assigned_at.split('T')[0])
                  : '—'}
              </span>
            </FieldRow>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {children}
    </div>
  )
}

function Dash() {
  return <span className="text-sm text-muted-foreground">—</span>
}

// ─── Revision Log ─────────────────────────────────────────────────────────────

function RevisionLog({ history }: { history: HistoryEntry[] }) {
  const revisions = history.filter(h => h.to_status === 'revisions_requested')
  if (revisions.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="text-sm font-semibold text-foreground">Revision History</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {revisions.map((rev, i) => (
          <div
            key={rev.id}
            className="rounded-lg p-3 space-y-1"
            style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(253,230,138,0.2)' }}
          >
            <p className="text-sm font-semibold text-foreground">Revision {i + 1}</p>
            <p className="text-xs text-muted-foreground">
              Requested by {rev.changed_by_name} · {formatDate(rev.created_at.split('T')[0])}
            </p>
            <p className="text-xs" style={{ color: '#FCD34D' }}>
              {rev.revision_notes ?? 'No revision notes provided.'}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Internal Notes ───────────────────────────────────────────────────────────

function InternalNotes({
  videoId,
  initialNotes,
  isAdmin,
}: {
  videoId: string
  initialNotes: string | null
  isAdmin: boolean
}) {
  const { toast } = useToast()
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleBlur = async () => {
    if (!isAdmin) return
    const res = await apiFetch(`/api/videos/${videoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: notes.trim() || null }),
    })
    if (res.success) {
      setSavedAt(Date.now())
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setSavedAt(null), 2000)
    } else {
      toast({ variant: 'destructive', title: 'Failed to save notes' })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Production Notes</h3>
          {savedAt && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#22C55E' }}>
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isAdmin ? (
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleBlur}
            rows={4}
            placeholder="Add internal production notes…"
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {notes || 'No production notes.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function ActivityLogSection({ videoId }: { videoId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 20

  const fetchActivity = useCallback(async (p: number) => {
    setLoading(true)
    const res = await apiFetch<{ entries: ActivityEntry[]; total: number }>(
      `/api/videos/${videoId}/activity?limit=${PAGE_SIZE}&page=${p}`,
    )
    if (res.success && res.data) {
      setEntries(prev => p === 1 ? res.data!.entries : [...prev, ...res.data!.entries])
      setTotal(res.data.total)
    }
    setLoading(false)
  }, [videoId])

  useEffect(() => { fetchActivity(1) }, [fetchActivity])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchActivity(nextPage)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="text-sm font-semibold text-foreground">Activity Log</h3>
      </CardHeader>
      <CardContent>
        {loading && entries.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {entries.map((e, idx) => (
              <div
                key={e.id}
                className="flex gap-2 px-2 py-2 rounded text-xs font-mono text-muted-foreground"
                style={{ backgroundColor: idx % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}
              >
                <span className="shrink-0 whitespace-nowrap">
                  {formatDateTime(e.created_at)}
                </span>
                <span className="shrink-0 font-medium text-foreground/70">{e.user_name}</span>
                <span>— {e.action}</span>
              </div>
            ))}
            {entries.length < total && (
              <div className="pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VideoDetailView({ videoId }: { videoId: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [editOpen, setEditOpen] = useState(false)

  const isAdmin = user?.role === 'admin'

  const { data: video = null, isLoading: loading } =
    useSWR<VideoListItem>(`/api/videos/${videoId}`)
  // Status history is an append-only audit feed → poll on a timer.
  const { data: historyData } =
    useSWR<HistoryEntry[]>(`/api/videos/${videoId}/history`, {
      refreshInterval: REFRESH.ACTIVITY,
    })
  const history = historyData ?? []

  // Dropdowns only needed for the admin edit drawer — conditional key.
  const { data: clientsData } =
    useSWR<{ id: string; name: string; status: string }[]>(isAdmin ? '/api/clients?limit=200' : null)
  const clients = clientsData ?? []
  const { data: employeesData } =
    useSWR<{ id: string; user: { name: string } }[]>(isAdmin ? '/api/employees?limit=200' : null)
  const employees = employeesData ?? []

  // Any status change here also shifts client/dashboard aggregates.
  const refreshAll = () => invalidate('/api/videos', '/api/clients', 'dashboard:')

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Video className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-semibold text-foreground mb-2">Video not found</p>
        <button
          type="button"
          onClick={() => router.push('/videos')}
          className="text-sm text-primary hover:underline"
        >
          ← Video Tracker
        </button>
      </div>
    )
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dueDate = new Date(video.due_date)
  const isOverdue =
    dueDate < today &&
    video.status !== 'delivered' &&
    video.status !== 'cancelled'
  const isCancelled = video.status === 'cancelled'

  const handleRefresh = () => {
    refreshAll()
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <DetailPageHeader
        backHref="/videos"
        backLabel="Video Tracker"
        title={video.title}
        icon={Video}
      />

      {/* Title row with status badge and edit button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={video.status} />
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => router.push(`/clients/${video.client_id}`)}
          >
            {video.client?.name ?? '—'}
          </button>
          <span className="text-muted-foreground">·</span>
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: TYPE_STYLE[video.video_type]?.bg ?? 'rgba(255,255,255,0.08)',
              color: TYPE_STYLE[video.video_type]?.color ?? '#9CA3AF',
            }}
          >
            {TYPE_LABEL[video.video_type] ?? video.video_type}
          </span>
          <span className="text-muted-foreground">·</span>
          <span
            className="text-sm"
            style={{ color: isOverdue ? '#EF4444' : 'var(--muted-foreground)' }}
          >
            Due {formatDate(video.due_date.split('T')[0])}
          </span>
          {video.assigned_editor && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {video.assigned_editor.user.name}
              </span>
            </>
          )}
        </div>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        )}
      </div>

      {/* Cancelled banner */}
      {isCancelled && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          This video was cancelled. No further status changes are allowed.
        </div>
      )}

      {/* Quick Status Update */}
      {!isCancelled && (
        <StatusUpdateSection
          video={video}
          isAdmin={isAdmin}
          onRefresh={handleRefresh}
        />
      )}

      {/* Status Timeline */}
      <StatusTimeline history={history} />

      {/* Video Details */}
      <VideoDetailsCard
        video={video}
        isAdmin={isAdmin}
        onEdit={() => setEditOpen(true)}
      />

      {/* Revision Log */}
      {video.revision_count > 0 && <RevisionLog history={history} />}

      {/* Internal Notes */}
      <InternalNotes
        videoId={video.id}
        initialNotes={video.notes}
        isAdmin={isAdmin}
      />

      {/* Activity Log */}
      <ActivityLogSection videoId={video.id} />

      {/* Edit drawer (admin only) */}
      {isAdmin && (
        <VideoFormDrawer
          open={editOpen}
          onOpenChange={setEditOpen}
          video={video}
          clients={clients}
          employees={employees}
          currentUserId={user?.id ?? ''}
          onSaved={() => {
            refreshAll()
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
