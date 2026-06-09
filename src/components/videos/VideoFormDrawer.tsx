'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetCloseButton,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { toDateInputValue } from '@/lib/dateHelpers'
import { statusLabels } from '@/lib/statusLabels'
import { cn } from '@/lib/utils'

const VIDEO_TYPES = [
  { value: 'long_form',   label: 'Long-form' },
  { value: 'short_form',  label: 'YouTube Short' },
  { value: 'reel',        label: 'Reel' },
  { value: 'thumbnail',   label: 'Thumbnail' },
  { value: 'other',       label: 'Other' },
]

const ALL_STATUSES = [
  'brief_received', 'footage_received', 'assigned', 'in_editing',
  'internal_review', 'sent_to_client', 'revisions_requested', 'in_revision',
  'approved', 'delivered', 'cancelled',
]

export interface VideoListItem {
  id: string
  title: string
  video_type: string
  client_id: string
  assigned_editor_id: string | null
  status: string
  due_date: string
  revision_count: number
  notes: string | null
  assigned_at: string | null
  brief_url: string | null
  footage_url: string | null
  final_file_url: string | null
  created_at: string
  client: { id: string; name: string }
  assigned_editor: { id: string; user: { name: string } } | null
}

interface DropdownClient { id: string; name: string; status: string }
interface DropdownEmployee { id: string; user: { name: string } }

interface FormValues {
  title: string
  client_id: string
  video_type: string
  assigned_editor_id: string
  status: string
  due_date: string
  brief_url: string
  footage_url: string
  final_file_url: string
  notes: string
  cancellation_note: string
}

const emptyForm = (): FormValues => ({
  title: '',
  client_id: '',
  video_type: 'long_form',
  assigned_editor_id: 'none',
  status: 'brief_received',
  due_date: '',
  brief_url: '',
  footage_url: '',
  final_file_url: '',
  notes: '',
  cancellation_note: '',
})

function videoToForm(v: VideoListItem): FormValues {
  return {
    title: v.title,
    client_id: v.client_id,
    video_type: v.video_type,
    assigned_editor_id: v.assigned_editor_id ?? 'none',
    status: v.status,
    due_date: toDateInputValue(v.due_date),
    brief_url: v.brief_url ?? '',
    footage_url: v.footage_url ?? '',
    final_file_url: v.final_file_url ?? '',
    notes: v.notes ?? '',
    cancellation_note: '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  video?: VideoListItem | null
  clients: DropdownClient[]
  employees: DropdownEmployee[]
  currentUserId: string
  onSaved: () => void
  /** Pre-selects this client when creating a new video. */
  defaultClientId?: string
  /**
   * Restricts the form to production details an assigned employee may edit
   * (title, type, URLs, notes). Hides client/editor/status/due-date and never
   * triggers a status change. Edit-only.
   */
  employeeMode?: boolean
}

export default function VideoFormDrawer({
  open,
  onOpenChange,
  video,
  clients,
  employees,
  onSaved,
  defaultClientId,
  employeeMode = false,
}: Props) {
  const { toast } = useToast()
  const isEdit = Boolean(video)
  const [form, setForm] = useState<FormValues>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const initialRef = useRef<string>('')

  useEffect(() => {
    if (open) {
      const initial = video
        ? videoToForm(video)
        : { ...emptyForm(), client_id: defaultClientId ?? '' }
      setForm(initial)
      initialRef.current = JSON.stringify(initial)
      setErrors({})
      setDirty(false)
    }
  }, [open, video, defaultClientId])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const set = (field: keyof FormValues, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      setDirty(JSON.stringify(next) !== initialRef.current)
      return next
    })
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    else if (form.title.length > 150) e.title = 'Max 150 characters'
    if (!form.client_id) e.client_id = 'Client is required'
    if (!form.video_type) e.video_type = 'Video type is required'
    if (!form.status) e.status = 'Status is required'
    if (!form.due_date) e.due_date = 'Due date is required'
    if (form.status === 'delivered' && !form.final_file_url.trim()) {
      e.final_file_url = 'A Final File URL is required before marking this video as Delivered.'
    }
    if (!employeeMode && form.status === 'cancelled' && !form.cancellation_note.trim()) {
      e.cancellation_note = 'A cancellation note is required.'
    }
    if (form.notes.length > 1000) e.notes = 'Max 1000 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && dirty) {
      if (!confirm('You have unsaved changes. Close anyway?')) return
    }
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)

    const editorId = form.assigned_editor_id === 'none' ? null : form.assigned_editor_id
    const prevStatus = video?.status

    if (!isEdit) {
      // Create
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        client_id: form.client_id,
        video_type: form.video_type,
        assigned_editor_id: editorId,
        status: form.status,
        due_date: form.due_date,
        brief_url: form.brief_url.trim() || undefined,
        footage_url: form.footage_url.trim() || undefined,
        final_file_url: form.final_file_url.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      if (form.status === 'assigned') payload.assigned_at = new Date().toISOString()

      const res = await apiFetch<VideoListItem>('/api/videos', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setSaving(false)
      if (!res.success) {
        toast({ variant: 'destructive', title: 'Failed to add video', description: res.error ?? 'Check the form' })
        return
      }
    } else {
      // Edit — non-status fields via PATCH, status change via change-status.
      // Employees may only touch production details (no client/editor/due_date/status).
      const patchPayload: Record<string, unknown> = employeeMode
        ? {
            title: form.title.trim(),
            video_type: form.video_type,
            brief_url: form.brief_url.trim() || null,
            footage_url: form.footage_url.trim() || null,
            final_file_url: form.final_file_url.trim() || null,
            notes: form.notes.trim() || null,
          }
        : {
            title: form.title.trim(),
            client_id: form.client_id,
            video_type: form.video_type,
            assigned_editor_id: editorId,
            due_date: form.due_date,
            brief_url: form.brief_url.trim() || null,
            footage_url: form.footage_url.trim() || null,
            final_file_url: form.final_file_url.trim() || null,
            notes: form.notes.trim() || null,
          }

      const patchRes = await apiFetch(`/api/videos/${video!.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchPayload),
      })
      if (!patchRes.success) {
        setSaving(false)
        toast({ variant: 'destructive', title: 'Failed to update video', description: patchRes.error ?? 'Try again' })
        return
      }

      if (!employeeMode && prevStatus && form.status !== prevStatus) {
        const statusRes = await apiFetch(`/api/videos/${video!.id}/change-status`, {
          method: 'POST',
          body: JSON.stringify({
            to_status: form.status,
            revision_notes: form.status === 'cancelled' ? form.cancellation_note : undefined,
          }),
        })
        if (!statusRes.success) {
          setSaving(false)
          toast({ variant: 'destructive', title: 'Video saved but status update failed', description: statusRes.error ?? 'Try again' })
          return
        }
      }

      setSaving(false)
    }

    setDirty(false)
    toast({ variant: 'success', title: isEdit ? 'Video updated' : 'Video added successfully' })
    onOpenChange(false)
    onSaved()
  }

  const fc = (field: string) => cn(errors[field] && 'border-destructive focus-visible:ring-destructive')
  const activeClients = clients.filter(c => c.status === 'active')

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto p-0 sm:max-w-[520px]">
        <SheetCloseButton />
        <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{isEdit ? `Edit "${video!.title}"` : 'Add Video'}</SheetTitle>
            <SheetDescription>
              {employeeMode
                ? 'Update the production details for your video.'
                : isEdit ? 'Update video production details.' : 'Add a new video to the production tracker.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 px-6 py-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="vid-title">Video Title *</Label>
              <Input
                id="vid-title"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                maxLength={150}
                className={fc('title')}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Client */}
              {!employeeMode && (
              <div className="space-y-1.5">
                <Label htmlFor="vid-client">Client *</Label>
                <select
                  id="vid-client"
                  value={form.client_id}
                  onChange={e => set('client_id', e.target.value)}
                  className={cn('flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm', fc('client_id'))}
                >
                  <option value="">Select client…</option>
                  {activeClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.client_id && <p className="text-xs text-destructive">{errors.client_id}</p>}
              </div>
              )}

              {/* Video Type */}
              <div className="space-y-1.5">
                <Label htmlFor="vid-type">Video Type *</Label>
                <select
                  id="vid-type"
                  value={form.video_type}
                  onChange={e => set('video_type', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                >
                  {VIDEO_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Assigned Editor */}
              {!employeeMode && (
              <div className="space-y-1.5">
                <Label htmlFor="vid-editor">Assigned Editor</Label>
                <select
                  id="vid-editor"
                  value={form.assigned_editor_id}
                  onChange={e => set('assigned_editor_id', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                >
                  <option value="none">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.user.name}</option>
                  ))}
                </select>
              </div>
              )}

              {/* Status */}
              {!employeeMode && (
              <div className="space-y-1.5">
                <Label htmlFor="vid-status">Status *</Label>
                <select
                  id="vid-status"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className={cn('flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm', fc('status'))}
                >
                  {ALL_STATUSES.map(s => (
                    <option key={s} value={s}>{statusLabels[s] ?? s}</option>
                  ))}
                </select>
                {errors.status && <p className="text-xs text-destructive">{errors.status}</p>}
              </div>
              )}

              {/* Due Date */}
              {!employeeMode && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="vid-due">Due Date *</Label>
                <Input
                  id="vid-due"
                  type="date"
                  value={form.due_date}
                  onChange={e => set('due_date', e.target.value)}
                  className={cn('max-w-xs', fc('due_date'))}
                />
                {errors.due_date && <p className="text-xs text-destructive">{errors.due_date}</p>}
              </div>
              )}
            </div>

            {/* Cancellation note (when status = cancelled) */}
            {!employeeMode && form.status === 'cancelled' && (
              <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <Label htmlFor="vid-cancel-note">Cancellation Note *</Label>
                <Textarea
                  id="vid-cancel-note"
                  value={form.cancellation_note}
                  onChange={e => set('cancellation_note', e.target.value)}
                  rows={3}
                  placeholder="Why is this video being cancelled?"
                  className={fc('cancellation_note')}
                />
                {errors.cancellation_note && (
                  <p className="text-xs text-destructive">{errors.cancellation_note}</p>
                )}
              </div>
            )}

            {/* URLs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="vid-brief">Brief / Notes URL</Label>
                <Input
                  id="vid-brief"
                  value={form.brief_url}
                  onChange={e => set('brief_url', e.target.value)}
                  placeholder="Link to brief or paste brief text"
                  maxLength={500}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vid-footage">Raw Footage URL</Label>
                <Input
                  id="vid-footage"
                  value={form.footage_url}
                  onChange={e => set('footage_url', e.target.value)}
                  placeholder="Google Drive or WeTransfer link"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vid-final">Final File URL</Label>
                <Input
                  id="vid-final"
                  value={form.final_file_url}
                  onChange={e => set('final_file_url', e.target.value)}
                  placeholder="Link to final delivered file"
                  className={fc('final_file_url')}
                />
                {errors.final_file_url && (
                  <p className="text-xs text-destructive">{errors.final_file_url}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="vid-notes">Production Notes</Label>
              <Textarea
                id="vid-notes"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Internal production notes"
                className={fc('notes')}
              />
              <p className="text-xs text-muted-foreground text-right">{form.notes.length}/1000</p>
              {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Video'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
