'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from 'lucide-react'
import PageShell from '@/components/shared/PageShell'
import EmptyState from '@/components/shared/EmptyState'
import StatusBadge from '@/components/shared/StatusBadge'
import VideoFormDrawer, { type VideoListItem } from '@/components/videos/VideoFormDrawer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { invalidate, REFRESH } from '@/lib/swr'
import { formatDate } from '@/lib/dateHelpers'
import { statusLabels } from '@/lib/statusLabels'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  'brief_received', 'footage_received', 'assigned', 'in_editing',
  'internal_review', 'sent_to_client', 'revisions_requested', 'in_revision',
  'approved', 'delivered', 'cancelled',
]

const VIDEO_TYPES = [
  { value: 'long_form',  label: 'Long-form' },
  { value: 'short_form', label: 'YouTube Short' },
  { value: 'reel',       label: 'Reel' },
  { value: 'thumbnail',  label: 'Thumbnail' },
  { value: 'other',      label: 'Other' },
]

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

interface DropdownClient { id: string; name: string; status: string }
interface DropdownEmployee { id: string; user: { name: string } }

type SortField =
  | 'title' | 'client' | 'status' | 'due_date' | 'created_at' | 'revision_count'
type SortDir = 'asc' | 'desc'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
  return sortDir === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
    : <ArrowDown className="h-3.5 w-3.5 text-primary" />
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialStatus?: string
  initialClient?: string
}

export default function VideoListAdminView({ initialStatus, initialClient }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  // Data

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? '')
  const [clientFilter, setClientFilter] = useState(initialClient ?? '')
  const [typeFilter, setTypeFilter] = useState('')
  const [editorFilter, setEditorFilter] = useState('')
  const [showDelivered, setShowDelivered] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)

  // Sort
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Drawer & delete
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VideoListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VideoListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  // Video list polls on a timer — statuses change frequently across the team.
  const videosKey = useMemo(() => {
    const params = new URLSearchParams({ limit: '300' })
    params.set('showDelivered', showDelivered ? 'true' : 'false')
    params.set('showCancelled', showCancelled ? 'true' : 'false')
    if (statusFilter) params.set('status[]', statusFilter)
    if (clientFilter) params.set('client[]', clientFilter)
    if (typeFilter) params.set('video_type[]', typeFilter)
    if (editorFilter) params.set('assigned_editor', editorFilter)
    return `/api/videos?${params}`
  }, [showDelivered, showCancelled, statusFilter, clientFilter, typeFilter, editorFilter])

  const { data: videosData, isLoading: loading } =
    useSWR<VideoListItem[]>(videosKey, { refreshInterval: REFRESH.VIDEOS })
  const videos = videosData ?? []

  const { data: clientsData } = useSWR<DropdownClient[]>('/api/clients?limit=200')
  const clients = clientsData ?? []
  const { data: employeesData } = useSWR<DropdownEmployee[]>('/api/employees?limit=200')
  const employees = employeesData ?? []

  // ─── Sort + search (client-side) ──────────────────────────────────────────

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const displayed = useMemo(() => {
    let list = [...videos]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.client?.name?.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'title') cmp = a.title.localeCompare(b.title)
      else if (sortField === 'client') cmp = (a.client?.name ?? '').localeCompare(b.client?.name ?? '')
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortField === 'due_date') cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      else if (sortField === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (sortField === 'revision_count') cmp = a.revision_count - b.revision_count
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [videos, search, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const hasFilters = search || statusFilter || clientFilter || typeFilter || editorFilter

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setClientFilter(''); setTypeFilter(''); setEditorFilter('')
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  const openCreate = () => { setEditingVideo(null); setDrawerOpen(true) }
  const openEdit = (v: VideoListItem, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingVideo(v); setDrawerOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await apiFetch(`/api/videos/${deleteTarget.id}/delete`, { method: 'POST' })
    setDeleting(false)
    if (!res.success) {
      toast({ variant: 'destructive', title: 'Failed to delete', description: res.error ?? 'Try again' })
      return
    }
    toast({ variant: 'success', title: 'Video deleted' })
    setDeleteTarget(null)
    invalidate('/api/videos', '/api/clients', 'dashboard:')
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function isOverdue(v: VideoListItem) {
    return (
      v.status !== 'delivered' &&
      v.status !== 'cancelled' &&
      new Date(v.due_date) < today
    )
  }

  const thClass = 'cursor-pointer select-none hover:text-foreground'

  return (
    <>
      <PageShell
        title="Video Tracker"
        subtitle="Manage all video production across clients."
        icon={Video}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Video
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="space-y-3">
            {/* Row 1: search + dropdowns */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search videos or clients…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="">All Statuses</option>
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
              <select
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="">All Types</option>
                {VIDEO_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={editorFilter}
                onChange={e => setEditorFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="">All Editors</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.user.name}</option>
                ))}
              </select>
            </div>

            {/* Row 2: toggles + clear */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showDelivered}
                  onChange={e => setShowDelivered(e.target.checked)}
                  className="rounded border-border accent-primary"
                />
                Show Delivered
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={e => setShowCancelled(e.target.checked)}
                  className="rounded border-border accent-primary"
                />
                Show Cancelled
              </label>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline ml-auto"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : displayed.length === 0 ? (
                <EmptyState
                  icon={Video}
                  title="No videos found"
                  message={
                    hasFilters
                      ? 'Try adjusting your filters or search query.'
                      : 'Add your first video to start tracking production.'
                  }
                  actionLabel={!hasFilters ? '+ Add Video' : undefined}
                  onAction={!hasFilters ? openCreate : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead
                          className={thClass}
                          onClick={() => handleSort('title')}
                        >
                          <span className="flex items-center gap-1">
                            Video Title
                            <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
                          </span>
                        </TableHead>
                        <TableHead
                          className={thClass}
                          onClick={() => handleSort('client')}
                        >
                          <span className="flex items-center gap-1">
                            Client
                            <SortIcon field="client" sortField={sortField} sortDir={sortDir} />
                          </span>
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Editor</TableHead>
                        <TableHead
                          className={thClass}
                          onClick={() => handleSort('status')}
                        >
                          <span className="flex items-center gap-1">
                            Status
                            <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                          </span>
                        </TableHead>
                        <TableHead
                          className={thClass}
                          onClick={() => handleSort('due_date')}
                        >
                          <span className="flex items-center gap-1">
                            Due Date
                            <SortIcon field="due_date" sortField={sortField} sortDir={sortDir} />
                          </span>
                        </TableHead>
                        <TableHead
                          className={thClass}
                          onClick={() => handleSort('revision_count')}
                        >
                          <span className="flex items-center gap-1">
                            Revisions
                            <SortIcon field="revision_count" sortField={sortField} sortDir={sortDir} />
                          </span>
                        </TableHead>
                        <TableHead
                          className={thClass}
                          onClick={() => handleSort('created_at')}
                        >
                          <span className="flex items-center gap-1">
                            Created
                            <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} />
                          </span>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayed.map((v, idx) => {
                        const dueDateStr = v.due_date.split('T')[0]
                        const overdue = isOverdue(v)
                        const typeStyle = TYPE_STYLE[v.video_type] ?? TYPE_STYLE.other
                        return (
                          <TableRow
                            key={v.id}
                            className={`cursor-pointer ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}
                            onClick={() => router.push(`/videos/${v.id}`)}
                          >
                            {/* Title + type chip */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{v.title}</span>
                                <span
                                  className="hidden sm:inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
                                  style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
                                >
                                  {TYPE_LABEL[v.video_type] ?? v.video_type}
                                </span>
                              </div>
                            </TableCell>

                            {/* Client */}
                            <TableCell>
                              <button
                                type="button"
                                className="text-sm font-medium hover:underline"
                                style={{ color: '#60A5FA' }}
                                onClick={e => {
                                  e.stopPropagation()
                                  router.push(`/clients/${v.client_id}`)
                                }}
                              >
                                {v.client?.name ?? '—'}
                              </button>
                            </TableCell>

                            {/* Type */}
                            <TableCell>
                              <span
                                className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                                style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
                              >
                                {TYPE_LABEL[v.video_type] ?? v.video_type}
                              </span>
                            </TableCell>

                            {/* Editor */}
                            <TableCell>
                              {v.assigned_editor ? (
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                                    style={{ backgroundColor: '#1A56DB' }}
                                  >
                                    {getInitials(v.assigned_editor.user.name)}
                                  </div>
                                  <span className="text-xs text-foreground">
                                    {v.assigned_editor.user.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs italic text-muted-foreground">Unassigned</span>
                              )}
                            </TableCell>

                            {/* Status */}
                            <TableCell><StatusBadge status={v.status} /></TableCell>

                            {/* Due date */}
                            <TableCell
                              className="text-sm whitespace-nowrap"
                              style={{ color: overdue ? '#EF4444' : undefined }}
                            >
                              {formatDate(dueDateStr)}
                            </TableCell>

                            {/* Revisions */}
                            <TableCell className="text-sm text-muted-foreground">
                              {v.revision_count > 0 ? v.revision_count : '—'}
                            </TableCell>

                            {/* Created */}
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(v.created_at.split('T')[0])}
                            </TableCell>

                            {/* Actions */}
                            <TableCell>
                              <div
                                className="flex items-center justify-end gap-1"
                                onClick={e => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => router.push(`/videos/${v.id}`)}
                                  title="View"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={e => openEdit(v, e)}
                                  title="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteTarget(v)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
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

          {!loading && displayed.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {displayed.length} video{displayed.length !== 1 ? 's' : ''}
              {search ? ` matching "${search}"` : ''}
            </p>
          )}
        </div>
      </PageShell>

      <VideoFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        video={editingVideo}
        clients={clients}
        employees={employees}
        currentUserId={user?.id ?? ''}
        onSaved={() => invalidate('/api/videos', '/api/clients', 'dashboard:')}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={open => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete video?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
