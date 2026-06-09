'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Archive, Briefcase, Eye, Pencil, Plus, Search } from 'lucide-react'
import PageShell from '@/components/shared/PageShell'
import EmptyState from '@/components/shared/EmptyState'
import StatusBadge from '@/components/shared/StatusBadge'
import NicheBadge from '@/components/clients/NicheBadge'
import MultiSelectFilter from '@/components/clients/MultiSelectFilter'
import ClientFormDrawer from '@/components/clients/ClientFormDrawer'
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
import { invalidate } from '@/lib/swr'
import { formatINR } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/dateHelpers'
import { useToast } from '@/hooks/use-toast'
import { CLIENT_NICHES, CLIENT_STATUSES_FILTER } from '@/constants/clients'
import type { ClientDetail, ClientListItem } from '@/types/client'

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  on_hold: 1,
  upcoming: 2,
  ended: 3,
  archived: 4,
}

export default function ClientListView() {
  const router = useRouter()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [nicheFilter, setNicheFilter] = useState<string[]>([])
  const [includeArchived, setIncludeArchived] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientDetail | null>(null)

  const [archiveTarget, setArchiveTarget] = useState<ClientListItem | null>(null)
  const [archiving, setArchiving] = useState(false)

  // SWR key is the API path; changing a filter swaps the key and refetches
  // automatically (replacing the old useEffect-on-filters wiring).
  const clientsKey = useMemo(() => {
    const params = new URLSearchParams({ limit: '100', page: '1' })
    if (includeArchived) params.set('includeArchived', 'true')
    statusFilter.forEach(s => params.append('status[]', s))
    nicheFilter.forEach(n => params.append('niche[]', n))
    return `/api/clients?${params}`
  }, [includeArchived, statusFilter, nicheFilter])

  const { data, isLoading } = useSWR<ClientListItem[]>(clientsKey)
  const clients = data ?? []
  const loading = isLoading

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = [...clients]
    if (q) {
      list = list.filter(
        c => c.name.toLowerCase().includes(q) || c.niche.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 99
      const sb = STATUS_ORDER[b.status] ?? 99
      if (sa !== sb) return sa - sb
      return a.name.localeCompare(b.name)
    })
    return list
  }, [clients, search])

  const openCreate = () => {
    setEditingClient(null)
    setDrawerOpen(true)
  }

  const openEdit = async (client: ClientListItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const res = await apiFetch<ClientDetail>(`/api/clients/${client.id}`)
    if (!res.success || !res.data) {
      toast({ variant: 'destructive', title: 'Failed to load client' })
      return
    }
    setEditingClient(res.data)
    setDrawerOpen(true)
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    setArchiving(true)
    const res = await apiFetch(`/api/clients/${archiveTarget.id}/archive`, { method: 'POST' })
    setArchiving(false)

    if (!res.success) {
      toast({ variant: 'destructive', title: 'Cannot archive', description: res.error ?? 'Try again' })
      return
    }

    toast({ variant: 'success', title: 'Client archived', description: `${archiveTarget.name} has been archived.` })
    setArchiveTarget(null)
    invalidate('/api/clients', 'dashboard:')
  }

  return (
    <>
      <PageShell
        title="Clients"
        subtitle="Manage your retainer client relationships"
        icon={Briefcase}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients or niche…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MultiSelectFilter
                label="Status"
                options={CLIENT_STATUSES_FILTER}
                selected={statusFilter}
                onChange={setStatusFilter}
              />
              <MultiSelectFilter
                label="Niche"
                options={CLIENT_NICHES.map(n => ({ value: n, label: n }))}
                selected={nicheFilter}
                onChange={setNicheFilter}
              />
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none px-2">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={e => setIncludeArchived(e.target.checked)}
                  className="rounded border-border"
                />
                Include Archived
              </label>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No clients found"
                  message={search || statusFilter.length || nicheFilter.length
                    ? 'Try adjusting your filters or search query.'
                    : 'Add your first retainer client to start tracking work.'}
                  actionLabel={!search && !statusFilter.length ? 'Add Client' : undefined}
                  onAction={!search && !statusFilter.length ? openCreate : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        {['Client Name', 'Niche', 'Retainer (₹/mo)', 'Status', 'Start Date', 'Videos Active', 'Next Due Date', 'Actions'].map(h => (
                          <TableHead key={h} className={h === 'Actions' ? 'text-right' : undefined}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(client => (
                        <TableRow
                          key={client.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                          <TableCell><NicheBadge niche={client.niche} /></TableCell>
                          <TableCell className="whitespace-nowrap">{formatINR(client.retainer_amount)}</TableCell>
                          <TableCell><StatusBadge status={client.status} variant="client" /></TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {formatDate(client.contract_start_date.split('T')[0])}
                          </TableCell>
                          <TableCell className="text-center">{client.videos_active}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {client.next_due_date
                              ? formatDate(client.next_due_date.split('T')[0])
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push(`/clients/${client.id}`)}>
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={e => openEdit(client, e)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              {client.status !== 'archived' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                                  onClick={() => setArchiveTarget(client)}
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  Archive
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {!loading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} client{filtered.length !== 1 ? 's' : ''}
              {search ? ` matching "${search}"` : ''}
            </p>
          )}
        </div>
      </PageShell>

      <ClientFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        client={editingClient}
        onSaved={() => invalidate('/api/clients', 'dashboard:')}
      />

      <Dialog open={Boolean(archiveTarget)} onOpenChange={open => !open && setArchiveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive client?</DialogTitle>
            <DialogDescription>
              {archiveTarget
                ? `"${archiveTarget.name}" will be hidden from the default list. This cannot be undone from the UI — the client record is preserved.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)} disabled={archiving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={archiving}>
              {archiving ? 'Archiving…' : 'Archive Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
