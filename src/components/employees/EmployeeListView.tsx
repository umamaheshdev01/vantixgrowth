'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Eye, Loader2, Pencil, Plus, Search, Users } from 'lucide-react'
import PageShell from '@/components/shared/PageShell'
import EmptyState from '@/components/shared/EmptyState'
import EmployeeFormDrawer, { type EmployeeListItem } from '@/components/employees/EmployeeFormDrawer'
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
import { useToast } from '@/hooks/use-toast'

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function EmploymentBadge({ type }: { type: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    full_time:  { bg: 'rgba(29,78,216,0.15)',  color: '#60A5FA', label: 'Full-time' },
    part_time:  { bg: 'rgba(180,83,9,0.15)',   color: '#FCD34D', label: 'Part-time' },
    freelance:  { bg: 'rgba(109,40,217,0.15)', color: '#A78BFA', label: 'Freelance' },
  }
  const s = styles[type] ?? { bg: 'rgba(255,255,255,0.08)', color: '#9CA3AF', label: type }
  return (
    <span
      className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function EmployeeStatusBadge({ status }: { status: string }) {
  const active = status === 'active'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: active ? 'rgba(21,128,61,0.15)' : 'rgba(255,255,255,0.06)',
        color: active ? '#4ADE80' : '#9CA3AF',
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: active ? '#22C55E' : '#6B7280' }}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#D1D5DB' }}
    >
      {role}
    </span>
  )
}

export default function EmployeeListView() {
  const router = useRouter()
  const { toast } = useToast()

  const { data, isLoading: loading } = useSWR<EmployeeListItem[]>('/api/employees?limit=200')
  const employees = data ?? []
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeListItem | null>(null)

  const [deactivateTarget, setDeactivateTarget] = useState<EmployeeListItem | null>(null)
  const [actioning, setActioning] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter(e => {
      if (q && !e.user.name.toLowerCase().includes(q) && !e.user.email.toLowerCase().includes(q))
        return false
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (typeFilter !== 'all' && e.employment_type !== typeFilter) return false
      return true
    })
  }, [employees, search, statusFilter, typeFilter])

  const openCreate = () => {
    setEditingEmployee(null)
    setDrawerOpen(true)
  }

  const openEdit = (emp: EmployeeListItem, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingEmployee(emp)
    setDrawerOpen(true)
  }

  const handleDeactivateClick = (emp: EmployeeListItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (emp.active_tasks > 0) {
      setDeactivateTarget(emp)
    } else {
      void confirmDeactivate(emp)
    }
  }

  const confirmDeactivate = async (emp: EmployeeListItem) => {
    setActioning(true)
    const res = await apiFetch(`/api/employees/${emp.id}/deactivate`, { method: 'POST' })
    setActioning(false)
    setDeactivateTarget(null)

    if (!res.success) {
      toast({ variant: 'destructive', title: 'Failed to deactivate', description: res.error ?? 'Try again' })
      return
    }
    toast({ variant: 'success', title: `${emp.user.name} deactivated` })
    invalidate('/api/employees', 'dashboard:')
  }

  const handleActivate = async (emp: EmployeeListItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setActioning(true)
    const res = await apiFetch(`/api/employees/${emp.id}/activate`, { method: 'POST' })
    setActioning(false)

    if (!res.success) {
      toast({ variant: 'destructive', title: 'Failed to activate', description: res.error ?? 'Try again' })
      return
    }
    toast({ variant: 'success', title: `${emp.user.name} activated` })
    invalidate('/api/employees', 'dashboard:')
  }

  return (
    <>
      <PageShell
        title="Employees"
        subtitle="Manage your team members and assignments."
        icon={Users}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="all">All Types</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No employees yet"
                  message={
                    search || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your filters or search query.'
                      : 'Add your first team member to start tracking work.'
                  }
                  actionLabel={!search && statusFilter === 'all' ? '+ Add Employee' : undefined}
                  onAction={!search && statusFilter === 'all' ? openCreate : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        {['Name', 'Role', 'Type', 'Pay Rate', 'Status', 'Active Tasks', 'Actions'].map(h => (
                          <TableHead key={h} className={h === 'Actions' ? 'text-right' : undefined}>
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((emp, idx) => (
                        <TableRow
                          key={emp.id}
                          className={`cursor-pointer ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}
                          onClick={() => router.push(`/employees/${emp.id}`)}
                        >
                          {/* Name + Avatar */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                                style={{ backgroundColor: '#1A56DB' }}
                              >
                                {getInitials(emp.user.name)}
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                {emp.user.name}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell><RoleBadge role={emp.role} /></TableCell>

                          <TableCell><EmploymentBadge type={emp.employment_type} /></TableCell>

                          <TableCell className="text-sm text-foreground whitespace-nowrap">
                            {formatINR(emp.pay_rate)}
                            {emp.pay_type === 'monthly' ? ' /mo' : ' /video'}
                          </TableCell>

                          <TableCell><EmployeeStatusBadge status={emp.status} /></TableCell>

                          <TableCell className="text-sm text-foreground">
                            {emp.active_tasks}
                          </TableCell>

                          <TableCell>
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => router.push(`/employees/${emp.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={e => openEdit(emp, e)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                              {emp.status === 'active' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-muted-foreground hover:text-destructive"
                                  onClick={e => handleDeactivateClick(emp, e)}
                                  disabled={actioning}
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-muted-foreground hover:text-primary"
                                  onClick={e => handleActivate(emp, e)}
                                  disabled={actioning}
                                >
                                  Activate
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
              Showing {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
              {search ? ` matching "${search}"` : ''}
            </p>
          )}
        </div>
      </PageShell>

      <EmployeeFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        employee={editingEmployee}
        onSaved={() => invalidate('/api/employees', 'dashboard:')}
      />

      {/* Deactivate confirmation */}
      <Dialog
        open={Boolean(deactivateTarget)}
        onOpenChange={open => !open && setDeactivateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate employee?</DialogTitle>
            <DialogDescription>
              {deactivateTarget
                ? `${deactivateTarget.user.name} has ${deactivateTarget.active_tasks} active video${deactivateTarget.active_tasks !== 1 ? 's' : ''} assigned. They will remain assigned after deactivation — please reassign them manually.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateTarget(null)}
              disabled={actioning}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actioning}
              onClick={() => deactivateTarget && confirmDeactivate(deactivateTarget)}
            >
              {actioning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
