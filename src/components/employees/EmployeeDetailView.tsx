'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  IndianRupee,
  Loader2,
  TrendingUp,
  Users,
  Video,
  XCircle,
} from 'lucide-react'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import TabBar from '@/components/shared/TabBar'
import StatusBadge from '@/components/shared/StatusBadge'
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
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiFetch } from '@/lib/api'
import { formatINR } from '@/lib/formatCurrency'
import { formatDate, getDaysUntil } from '@/lib/dateHelpers'
import { useToast } from '@/hooks/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeDetail extends EmployeeListItem {
  total_paid_to_date: number
}

interface AssignedVideo {
  id: string
  title: string
  status: string
  due_date: string
  revision_count: number
  client: { id: string; name: string }
}

interface PaymentEntry {
  id: string
  date: string
  description: string
  amount: number
  payment_method: string
}

interface PaymentsData {
  entries: PaymentEntry[]
  total_this_month: number
  total_lifetime: number
}

interface PerformanceHistory {
  video_id: string
  video_title: string
  client_name: string
  assigned_at: string | null
  delivered_at: string
  turnaround_days: number | null
  is_on_time: boolean
}

interface PerformanceData {
  total_delivered: number
  on_time: number
  late: number
  late_pct: number | null
  avg_turnaround_days: number | null
  history: PerformanceHistory[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Assigned Videos', 'Payment History', 'Performance']

function formatEmploymentType(t: string) {
  return t === 'full_time' ? 'Full-time' : t === 'part_time' ? 'Part-time' : 'Freelance'
}

function formatPaymentMethod(m: string) {
  const map: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    upi: 'UPI',
    cash: 'Cash',
    other: 'Other',
  }
  return map[m] ?? m
}

function DaysUntilCell({ dueDate }: { dueDate: string }) {
  const days = getDaysUntil(dueDate.split('T')[0])
  if (days < 0) {
    return <span className="text-xs font-medium" style={{ color: '#EF4444' }}>{Math.abs(days)}d overdue</span>
  }
  if (days === 0) {
    return <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>Due today</span>
  }
  if (days <= 3) {
    return <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>{days}d left</span>
  }
  return <span className="text-xs text-muted-foreground">{days}d left</span>
}

function StatBox({
  label,
  value,
  sub,
  loading,
}: {
  label: string
  value: string
  sub?: string
  loading?: boolean
}) {
  if (loading) return <Skeleton className="h-20 w-full rounded-lg" />
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Tab 1: Overview ─────────────────────────────────────────────────────────

function OverviewTab({
  employee,
  activeVideos,
  perf,
  perfLoading,
}: {
  employee: EmployeeDetail
  activeVideos: number
  perf: PerformanceData | null
  perfLoading: boolean
}) {
  const { toast } = useToast()
  const [notes, setNotes] = useState(employee.notes ?? '')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNotesSave = async () => {
    const res = await apiFetch(`/api/employees/${employee.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: notes.trim() || null }),
    })
    if (res.success) {
      setSavedAt(Date.now())
      if (savedTimer.current) clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSavedAt(null), 2000)
    } else {
      toast({ variant: 'destructive', title: 'Failed to save notes' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Details grid */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-y-4 gap-x-8 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
              <p className="text-sm font-medium text-foreground">{employee.user.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Pay Type</p>
              <p className="text-sm font-medium text-foreground">
                {employee.pay_type === 'monthly' ? 'Monthly Retainer' : 'Per Video'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Email</p>
              <p className="text-sm font-medium text-foreground">{employee.user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Pay Rate</p>
              <p className="text-sm font-medium text-foreground">
                {formatINR(employee.pay_rate)}
                {employee.pay_type === 'monthly' ? ' per month' : ' per video'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Role</p>
              <p className="text-sm font-medium text-foreground">{employee.role}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Start Date</p>
              <p className="text-sm font-medium text-foreground">
                {employee.start_date ? formatDate(employee.start_date.split('T')[0]) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Employment Type</p>
              <p className="text-sm font-medium text-foreground">
                {formatEmploymentType(employee.employment_type)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Active Since</p>
              <p className="text-sm font-medium text-foreground">
                {formatDate(employee.created_at.split('T')[0])}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBox
          label="Total Paid to Date"
          value={formatINR(employee.total_paid_to_date)}
        />
        <StatBox
          label="Active Videos"
          value={String(activeVideos)}
        />
        <StatBox
          label="Videos Delivered"
          value={perfLoading ? '…' : String(perf?.total_delivered ?? 0)}
          loading={perfLoading}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">Internal Notes</p>
          {savedAt && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#22C55E' }}>
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </span>
          )}
        </div>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleNotesSave}
          rows={4}
          maxLength={500}
          placeholder="Add internal notes about this employee…"
        />
        <p className="text-xs text-muted-foreground text-right">{notes.length}/500</p>
      </div>
    </div>
  )
}

// ─── Tab 2: Assigned Videos ───────────────────────────────────────────────────

function AssignedVideosTab({ employeeId }: { employeeId: string }) {
  const [videos, setVideos] = useState<AssignedVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeOnly, setActiveOnly] = useState(true)
  const [loaded, setLoaded] = useState(false)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch<AssignedVideo[]>(
      `/api/employees/${employeeId}/videos?includeAll=true&limit=200`,
    )
    setVideos(res.success && res.data ? res.data : [])
    setLoading(false)
    setLoaded(true)
  }, [employeeId])

  useEffect(() => {
    if (!loaded) fetchVideos()
  }, [loaded, fetchVideos])

  const displayed = activeOnly
    ? videos.filter(v => v.status !== 'delivered' && v.status !== 'cancelled')
    : videos

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={e => setActiveOnly(e.target.checked)}
            className="rounded border-border accent-primary"
          />
          <span className="text-sm text-muted-foreground">Active only</span>
        </label>
        <span className="text-xs text-muted-foreground">{displayed.length} video{displayed.length !== 1 ? 's' : ''}</span>
      </div>

      {displayed.length === 0 ? (
        <EmptyState
          icon={Video}
          message="No videos assigned to this employee yet."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Video Title', 'Client', 'Due Date', 'Status', 'Days Until Due', 'Revisions'].map(h => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((v, idx) => {
                    const dueDateStr = v.due_date.split('T')[0]
                    const days = getDaysUntil(dueDateStr)
                    const isOverdue = days < 0
                    return (
                      <TableRow key={v.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                        <TableCell className="font-medium text-foreground">
                          {v.title}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.client.name}</TableCell>
                        <TableCell
                          className="text-sm whitespace-nowrap"
                          style={{ color: isOverdue ? '#EF4444' : undefined }}
                        >
                          {formatDate(dueDateStr)}
                        </TableCell>
                        <TableCell><StatusBadge status={v.status} /></TableCell>
                        <TableCell><DaysUntilCell dueDate={v.due_date} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{v.revision_count}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Tab 3: Payment History ───────────────────────────────────────────────────

function PaymentHistoryTab({ employeeId }: { employeeId: string }) {
  const [data, setData] = useState<PaymentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    const res = await apiFetch<PaymentsData>(`/api/employees/${employeeId}/payments?limit=200`)
    if (res.success && res.data) {
      setData(res.data)
    }
    setLoading(false)
    setLoaded(true)
  }, [employeeId])

  useEffect(() => {
    if (!loaded) fetchPayments()
  }, [loaded, fetchPayments])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  const entries = data?.entries ?? []

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatBox label="Total Paid This Month" value={formatINR(data?.total_this_month ?? 0)} />
        <StatBox label="Total Paid Lifetime" value={formatINR(data?.total_lifetime ?? 0)} />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          message="No payments recorded for this employee yet."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Date', 'Description', 'Amount', 'Payment Method'].map(h => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, idx) => (
                    <TableRow key={entry.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(entry.date.split('T')[0])}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{entry.description}</TableCell>
                      <TableCell
                        className="text-sm font-medium whitespace-nowrap"
                        style={{ color: '#EF4444' }}
                      >
                        {formatINR(entry.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatPaymentMethod(entry.payment_method)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Tab 4: Performance ──────────────────────────────────────────────────────

function PerformanceTab({
  perf,
  loading,
}: {
  perf: PerformanceData | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  if (!perf) return null

  const { total_delivered, on_time, late, late_pct, avg_turnaround_days, history } = perf

  const lateColor =
    late_pct === null ? undefined
    : late_pct > 20 ? '#EF4444'
    : late_pct > 10 ? '#F59E0B'
    : '#22C55E'

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Delivered</p>
          </div>
          <p className="text-2xl font-semibold text-foreground">{total_delivered}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">On Time</p>
          <p className="text-2xl font-semibold" style={{ color: '#22C55E' }}>{on_time}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Late</p>
          <p className="text-2xl font-semibold" style={{ color: '#EF4444' }}>{late}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Late %</p>
          <p
            className="text-2xl font-semibold"
            style={{ color: lateColor ?? 'var(--foreground)' }}
          >
            {late_pct === null ? '—' : `${late_pct}%`}
          </p>
        </div>
      </div>

      {/* Avg turnaround */}
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-3xl font-semibold text-foreground mb-1">
          {avg_turnaround_days === null ? '—' : `${avg_turnaround_days} days`}
        </p>
        <p className="text-sm text-muted-foreground">Average time from assignment to delivery</p>
      </div>

      {/* History table */}
      {history.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          message="No delivered videos yet. Performance data will appear here once videos are delivered."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Video Title', 'Client', 'Assigned Date', 'Delivered Date', 'Turnaround', 'On Time'].map(h => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h, idx) => (
                    <TableRow key={h.video_id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                      <TableCell className="text-sm font-medium text-foreground">{h.video_title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{h.client_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {h.assigned_at ? formatDate(h.assigned_at.split('T')[0]) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(h.delivered_at.split('T')[0])}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {h.turnaround_days === null ? '—' : `${h.turnaround_days}d`}
                      </TableCell>
                      <TableCell>
                        {h.is_on_time ? (
                          <CheckCircle2 className="h-4 w-4" style={{ color: '#22C55E' }} />
                        ) : (
                          <XCircle className="h-4 w-4" style={{ color: '#EF4444' }} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Main Detail View ─────────────────────────────────────────────────────────

export default function EmployeeDetailView({ employeeId }: { employeeId: string }) {
  const router = useRouter()
  const { toast } = useToast()

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  const [perf, setPerf] = useState<PerformanceData | null>(null)
  const [perfLoading, setPerfLoading] = useState(true)

  // Videos count for overview stats (loaded alongside main data)
  const [activeVideos, setActiveVideos] = useState(0)
  const [videosLoaded, setVideosLoaded] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [actioning, setActioning] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setPerfLoading(true)

    const [empRes, perfRes] = await Promise.all([
      apiFetch<EmployeeDetail>(`/api/employees/${employeeId}`),
      apiFetch<PerformanceData>(`/api/employees/${employeeId}/performance`),
    ])

    if (!empRes.success || !empRes.data) {
      setEmployee(null)
      setLoading(false)
      setPerfLoading(false)
      return
    }

    setEmployee(empRes.data)
    setLoading(false)

    if (perfRes.success && perfRes.data) {
      setPerf(perfRes.data)
    }
    setPerfLoading(false)
  }, [employeeId])

  const loadActiveVideosCount = useCallback(async () => {
    if (videosLoaded) return
    const res = await apiFetch<{ id: string; status: string }[]>(
      `/api/employees/${employeeId}/videos?limit=200`,
    )
    if (res.success && res.data) {
      setActiveVideos(res.data.length)
    }
    setVideosLoaded(true)
  }, [employeeId, videosLoaded])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadActiveVideosCount() }, [loadActiveVideosCount])

  const handleToggleStatus = async () => {
    if (!employee) return
    setActioning(true)

    const isActive = employee.status === 'active'
    const endpoint = isActive
      ? `/api/employees/${employeeId}/deactivate`
      : `/api/employees/${employeeId}/activate`

    const res = await apiFetch(endpoint, { method: 'POST' })
    setActioning(false)
    setDeactivateOpen(false)

    if (!res.success) {
      toast({ variant: 'destructive', title: `Failed to ${isActive ? 'deactivate' : 'activate'}`, description: res.error ?? 'Try again' })
      return
    }

    toast({ variant: 'success', title: `${employee.user.name} ${isActive ? 'deactivated' : 'activated'}` })
    loadData()
  }

  const handleDeactivateClick = () => {
    if (!employee) return
    if (employee.active_tasks > 0) {
      setDeactivateOpen(true)
    } else {
      handleToggleStatus()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-semibold text-foreground mb-2">Employee not found</p>
        <button
          type="button"
          onClick={() => router.push('/employees')}
          className="text-sm text-primary hover:underline"
        >
          ← Back to Employees
        </button>
      </div>
    )
  }

  const isActive = employee.status === 'active'

  // Build EmployeeListItem shape for the form drawer
  const asListItem: EmployeeListItem = {
    id: employee.id,
    role: employee.role,
    employment_type: employee.employment_type,
    pay_type: employee.pay_type,
    pay_rate: employee.pay_rate,
    status: employee.status,
    start_date: employee.start_date,
    notes: employee.notes,
    created_at: employee.created_at,
    user: employee.user,
    active_tasks: employee.active_tasks,
  }

  return (
    <div className="space-y-6 animate-in">
      <DetailPageHeader
        backHref="/employees"
        backLabel="Employees"
        title={employee.user.name}
        icon={Users}
      />

      {/* Sub-header: badges + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#D1D5DB' }}
          >
            {employee.role}
          </span>
          <span
            className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor:
                employee.employment_type === 'full_time'
                  ? 'rgba(29,78,216,0.15)'
                  : employee.employment_type === 'part_time'
                  ? 'rgba(180,83,9,0.15)'
                  : 'rgba(109,40,217,0.15)',
              color:
                employee.employment_type === 'full_time'
                  ? '#60A5FA'
                  : employee.employment_type === 'part_time'
                  ? '#FCD34D'
                  : '#A78BFA',
            }}
          >
            {formatEmploymentType(employee.employment_type)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Users className="h-3.5 w-3.5" />
            Edit
          </Button>
          {isActive ? (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDeactivateClick}
              disabled={actioning}
            >
              {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Deactivate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleStatus}
              disabled={actioning}
            >
              {actioning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Activate
            </Button>
          )}
        </div>
      </div>

      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === 0 && (
          <OverviewTab
            employee={employee}
            activeVideos={activeVideos}
            perf={perf}
            perfLoading={perfLoading}
          />
        )}
        {activeTab === 1 && <AssignedVideosTab employeeId={employeeId} />}
        {activeTab === 2 && <PaymentHistoryTab employeeId={employeeId} />}
        {activeTab === 3 && <PerformanceTab perf={perf} loading={perfLoading} />}
      </div>

      <EmployeeFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={asListItem}
        onSaved={() => { loadData(); setVideosLoaded(false) }}
      />

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate employee?</DialogTitle>
            <DialogDescription>
              {employee.user.name} has {employee.active_tasks} active video
              {employee.active_tasks !== 1 ? 's' : ''} assigned. They will remain assigned after
              deactivation — please reassign them manually.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)} disabled={actioning}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleToggleStatus} disabled={actioning}>
              {actioning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
