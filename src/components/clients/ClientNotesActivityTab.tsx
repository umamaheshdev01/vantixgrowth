'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Activity, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { REFRESH } from '@/lib/swr'
import { formatDateTime } from '@/lib/dateHelpers'
import { useToast } from '@/hooks/use-toast'
import type { ActivityLogEntry } from '@/types/client'

interface ClientNotesActivityTabProps {
  clientId: string
  initialNotes: string | null
  onNotesSaved: (notes: string) => void
}

export default function ClientNotesActivityTab({
  clientId,
  initialNotes,
  onNotesSaved,
}: ClientNotesActivityTabProps) {
  const { toast } = useToast()
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const savedNotesRef = useRef(initialNotes ?? '')

  // Activity feed polls on a timer so entries from other team members appear live.
  const { data: logsData, isLoading: loadingLogs, mutate: refetchLogs } =
    useSWR<ActivityLogEntry[]>(`/api/clients/${clientId}/activity?limit=50`, {
      refreshInterval: REFRESH.ACTIVITY,
    })
  const logs = logsData ?? []

  useEffect(() => {
    setNotes(initialNotes ?? '')
    savedNotesRef.current = initialNotes ?? ''
  }, [initialNotes])

  const saveNotes = async () => {
    if (notes === savedNotesRef.current) return
    if (notes.length > 1000) {
      toast({ variant: 'destructive', title: 'Notes too long', description: 'Maximum 1000 characters' })
      return
    }

    setSaving(true)
    const res = await apiFetch<{ notes: string }>(`/api/clients/${clientId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    })
    setSaving(false)

    if (!res.success) {
      toast({ variant: 'destructive', title: 'Failed to save notes', description: res.error ?? 'Try again' })
      return
    }

    savedNotesRef.current = notes
    onNotesSaved(notes)
    refetchLogs()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Internal Notes</CardTitle>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">Auto-saved when you click away from the field</p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add internal notes about this client…"
            rows={8}
            maxLength={1000}
            className="min-h-[180px]"
          />
          <p className="text-xs text-muted-foreground text-right mt-1.5">{notes.length}/1000</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {logs.map(log => (
                <li key={log.id} className="text-sm border-l-2 border-border pl-3 py-0.5">
                  <p className="text-muted-foreground text-xs font-mono mb-0.5">
                    [{formatDateTime(log.created_at)}]
                  </p>
                  <p className="text-foreground">
                    <span className="font-medium">{log.user.name}</span>
                    {' — '}
                    {log.action}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
