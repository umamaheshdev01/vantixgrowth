'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  IndianRupee,
  Briefcase,
  Video,
  TrendingUp,
  Percent,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Clock,
} from 'lucide-react'

import AdminGuard from '@/components/layout/AdminGuard'
import KPICard from '@/components/shared/KPICard'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { useDashboardData } from '@/hooks/useDashboardData'
import type { DashboardClient, DashboardVideo } from '@/hooks/useDashboardData'
import { formatINR } from '@/lib/formatCurrency'
import { formatDate, getDaysUntil } from '@/lib/dateHelpers'
import { statusLabels } from '@/lib/statusLabels'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function isEndingSoon(contractEndDate: string | null): boolean {
  if (!contractEndDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = (new Date(contractEndDate).getTime() - today.getTime()) / 86_400_000
  return diff >= 0 && diff <= 30
}

const NON_TERMINAL = ['delivered', 'cancelled']

const PIPELINE_STAGES = [
  'brief_received', 'footage_received', 'assigned', 'in_editing',
  'internal_review', 'sent_to_client', 'revisions_requested',
  'in_revision', 'approved', 'delivered', 'cancelled',
] as const

function KPIGrid() {
  const { allClients, allVideos, financeThisMonth, financeLastMonth, loading } = useDashboardData()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const currentMRR = allClients.filter(c => c.status === 'active').reduce((s, c) => s + (c.retainer_amount ?? 0), 0)
  const previousMRR = allClients
    .filter(c => c.status === 'active' && c.contract_start_date && new Date(c.contract_start_date) < monthStart)
    .reduce((s, c) => s + (c.retainer_amount ?? 0), 0)
  const mrrTrend = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : null

  const activeClientCount = allClients.filter(c => c.status === 'active').length
  const videosInProgress = allVideos.filter(v => !NON_TERMINAL.includes(v.status)).length

  const incomeThis = financeThisMonth.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expenseThis = financeThisMonth.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const profitThis = incomeThis - expenseThis
  const incomeLast = financeLastMonth.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const expenseLast = financeLastMonth.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const profitLast = incomeLast - expenseLast
  const profitTrend = financeLastMonth.length > 0 && profitLast !== 0 ? ((profitThis - profitLast) / Math.abs(profitLast)) * 100 : null

  const marginThis = incomeThis === 0 ? null : (profitThis / incomeThis) * 100
  const marginLast = incomeLast === 0 ? null : (profitLast / incomeLast) * 100
  const marginTrend = marginThis !== null && marginLast !== null && marginLast !== 0 ? ((marginThis - marginLast) / Math.abs(marginLast)) * 100 : null

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const overdueCount = allVideos.filter(v => v.due_date && new Date(v.due_date) < today && !NON_TERMINAL.includes(v.status)).length

  const profitColor = profitThis >= 0 ? '#3ECF8E' : '#EF4444'
  const overdueColor = overdueCount > 0 ? '#EF4444' : '#666666'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard label="Total MRR" value={currentMRR} icon={IndianRupee} iconColor="#3ECF8E" trend={mrrTrend} loading={loading} formatter={v => v !== null ? formatINR(v) : '—'} />
      <KPICard label="Active Clients" value={activeClientCount} icon={Briefcase} iconColor="#60A5FA" trend={null} loading={loading} formatter={v => v !== null ? `${v}` : '—'} />
      <KPICard label="Videos Active" value={videosInProgress} icon={Video} iconColor="#FCD34D" trend={null} loading={loading} formatter={v => v !== null ? `${v}` : '—'} />
      <KPICard label="Profit / Month" value={profitThis} icon={TrendingUp} iconColor={profitColor} trend={profitTrend} loading={loading} formatter={v => v !== null ? formatINR(v) : '—'} />
      <KPICard label="Profit Margin" value={marginThis} icon={Percent} iconColor={profitColor} trend={marginTrend} loading={loading} formatter={v => v === null ? '—' : `${v.toFixed(1)}%`} />
      <KPICard label="Overdue Videos" value={overdueCount} icon={AlertCircle} iconColor={overdueColor} trend={null} loading={loading} formatter={v => v !== null ? `${v}` : '—'} />
    </div>
  )
}

function ActiveClientsSection() {
  const { clients, allVideos, loading } = useDashboardData()
  const router = useRouter()

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Briefcase}
          title="No active clients"
          message="Add your first retainer client to start tracking work."
          actionLabel="Go to Clients"
          onAction={() => router.push('/clients')}
        />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {clients.map(client => (
        <ClientCard key={client.id} client={client} allVideos={allVideos} />
      ))}
    </div>
  )
}

function ClientCard({ client, allVideos }: { client: DashboardClient; allVideos: DashboardVideo[] }) {
  const router = useRouter()
  const clientVideos = allVideos.filter(v => v.client_id === client.id && !NON_TERMINAL.includes(v.status))
  const sorted = [...clientVideos].sort((a, b) => (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1)
  const nextDue = sorted[0]?.due_date ?? null
  const effectiveStatus = isEndingSoon(client.contract_end_date) ? 'ending_soon' : client.status

  return (
    <Card
      className="cursor-pointer hover:border-primary/25 hover:shadow-card-hover transition-all duration-200"
      onClick={() => router.push(`/clients/${client.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-8 w-8 rounded-lg">
              {client.logo_url ? (
                <AvatarImage src={client.logo_url} alt={client.name} />
              ) : null}
              <AvatarFallback className="rounded-lg text-[11px]">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold truncate text-foreground">{client.name}</p>
          </div>
          <StatusBadge status={effectiveStatus} variant="client" />
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <IndianRupee className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium text-foreground">{formatINR(client.retainer_amount ?? 0)}</span>
            <span>/ month</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span>{clientVideos.length} video{clientVideos.length !== 1 ? 's' : ''} active</span>
          </div>
          {nextDue && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Next due {formatDate(nextDue)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PipelineSection() {
  const { allVideos, loading } = useDashboardData()
  const router = useRouter()
  const counts = allVideos.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1
    return acc
  }, {})
  const muted = ['delivered', 'cancelled']

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <CardTitle>Production Pipeline</CardTitle>
          <CardDescription className="mt-1">Click any stage to filter videos</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
          <Link href="/videos">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-row flex-wrap gap-2">
        {PIPELINE_STAGES.map(stage => {
          const count = counts[stage] ?? 0
          const isMuted = muted.includes(stage)
          const hasItems = count > 0 && !isMuted

          return (
            <button
              key={stage}
              onClick={() => router.push(`/videos?status=${stage}`)}
              disabled={loading}
              className={cn(
                'relative flex flex-col items-start px-4 py-3 rounded-xl text-left transition-all duration-200 min-w-[120px] border',
                isMuted
                  ? 'bg-background/50 border-border/40 opacity-50'
                  : 'bg-muted/40 border-border hover:border-primary/30 hover:bg-primary/5'
              )}
            >
              {hasItems && (
                <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {statusLabels[stage] ?? stage}
              </span>
              <span className={cn('text-xl font-semibold tracking-tight', isMuted && 'text-muted-foreground/40')}>
                {loading ? '—' : count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function UpcomingDeadlines() {
  const { allVideos, allClients, employees, loading } = useDashboardData()

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const sevenDaysOut = new Date(today.getTime() + 7 * 86_400_000)

  const overdue = allVideos
    .filter(v => v.due_date && new Date(v.due_date) < today && !NON_TERMINAL.includes(v.status))
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))

  const upcoming = allVideos
    .filter(v => {
      if (!v.due_date || NON_TERMINAL.includes(v.status)) return false
      const d = new Date(v.due_date)
      return d >= today && d <= sevenDaysOut
    })
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))

  const rows = [...overdue, ...upcoming].slice(0, 10)
  const clientMap = Object.fromEntries(allClients.map(c => [c.id, c.name]))
  const employeeMap = Object.fromEntries(employees.map(e => [e.id, e.users?.name ?? null]))

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-3">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">All caught up!</p>
        <p className="text-sm text-muted-foreground mt-1">No upcoming deadlines in the next 7 days</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {['Video', 'Client', 'Editor', 'Due Date', 'Status', 'Time'].map(h => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(video => {
          const days = video.due_date ? getDaysUntil(video.due_date) : null
          const editorName = video.assigned_editor_id ? (employeeMap[video.assigned_editor_id] ?? null) : null

          return (
            <TableRow key={video.id}>
              <TableCell>
                <Link
                  href={`/videos/${video.id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 max-w-[200px]"
                >
                  {video.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {clientMap[video.client_id] ?? '—'}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {editorName
                  ? <span className="text-muted-foreground">{editorName}</span>
                  : <span className="text-muted-foreground/50 italic text-xs">Unassigned</span>
                }
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {video.due_date ? formatDate(video.due_date) : '—'}
              </TableCell>
              <TableCell>
                <StatusBadge status={video.status} variant="video" />
              </TableCell>
              <TableCell>
                <DaysBadge days={days} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground/40">—</span>

  if (days < 0) {
    return (
      <Badge variant="destructive" className="gap-1 bg-destructive/10 text-destructive border-0">
        <Clock className="h-3 w-3" />
        {Math.abs(days)}d overdue
      </Badge>
    )
  }
  if (days === 0) {
    return (
      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-0">
        Due today
      </Badge>
    )
  }
  if (days <= 2) return <span className="text-sm font-semibold text-destructive">{days}d left</span>
  if (days <= 5) return <span className="text-sm font-medium text-amber-400">{days}d left</span>
  return <span className="text-sm text-muted-foreground">{days}d left</span>
}

function RecentFinance() {
  const { recentFinance, loading } = useDashboardData()
  const router = useRouter()

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (recentFinance.length === 0) {
    return (
      <EmptyState
        icon={IndianRupee}
        title="No entries yet"
        message="Finance entries will appear here."
        actionLabel="Go to Finance"
        onAction={() => router.push('/finance')}
      />
    )
  }

  return (
    <div>
      <div className="space-y-1">
        {recentFinance.map(entry => (
          <div
            key={entry.id}
            className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                entry.type === 'income' ? 'bg-primary/10' : 'bg-destructive/10'
              )}
            >
              <IndianRupee
                className={cn('h-3.5 w-3.5', entry.type === 'income' ? 'text-primary' : 'text-destructive')}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{entry.description}</p>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                <span>{formatDate(entry.date, 'DD Mon')}</span>
                <span className="h-1 w-1 rounded-full bg-border" />
                <span>{entry.category}</span>
              </div>
            </div>
            <span
              className={cn(
                'text-sm font-semibold shrink-0',
                entry.type === 'income' ? 'text-primary' : 'text-destructive'
              )}
            >
              {entry.type === 'income' ? '+' : '−'}{formatINR(entry.amount)}
            </span>
          </div>
        ))}
      </div>
      <Separator className="my-3" />
      <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary px-0">
        <Link href="/finance">
          View all transactions <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-8 animate-in">
      <div>
        <p className="text-sm text-muted-foreground mb-1">{getFormattedDate()}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      <KPIGrid />

      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Active Clients</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Current retainer relationships</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary">
            <Link href="/clients">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <ActiveClientsSection />
      </section>

      <Card>
        <CardContent className="p-6">
          <PipelineSection />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Next 7 days + overdue videos</CardDescription>
          </CardHeader>
          <CardContent>
            <UpcomingDeadlines />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Recent Finance</CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentFinance />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AdminGuard>
      <DashboardContent />
    </AdminGuard>
  )
}
