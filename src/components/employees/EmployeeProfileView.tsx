'use client'

import useSWR from 'swr'
import { User, IndianRupee } from 'lucide-react'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatINR } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/dateHelpers'
import { getCategoryLabel, getPaymentMethodLabel } from '@/lib/financeCategories'

interface EmployeeProfile {
  id: string
  role: string
  employment_type: string
  pay_type: string
  pay_rate: number
  status: string
  start_date: string | null
  notes: string | null
  created_at: string
  user: { id: string; name: string; email: string; status: string }
  total_paid_to_date: number
}

interface PaymentEntry {
  id: string
  date: string
  description: string
  category: string
  amount: number
  payment_method: string
}

interface PaymentsResponse {
  entries: PaymentEntry[]
  total_this_month: number
  total_lifetime: number
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  freelance: 'Freelance',
}

const PAY_TYPE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  per_video: 'Per Video',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

export default function EmployeeProfileView() {
  const { data: profile = null, isLoading } = useSWR<EmployeeProfile>('/api/employees/me')
  const { data: payments = null } = useSWR<PaymentsResponse>('/api/employees/me/payments?limit=100')

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <User className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">No employee profile found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account isn’t linked to an employee record yet. Contact an admin.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <DetailPageHeader
        backHref="/videos"
        backLabel="Video Tracker"
        title="My Profile"
        icon={User}
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{profile.user.name}</h3>
            <StatusBadge status={profile.status} variant="client" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-y-5 gap-x-8 sm:grid-cols-2">
            <Field label="Email">{profile.user.email}</Field>
            <Field label="Role">{profile.role}</Field>
            <Field label="Employment Type">
              {EMPLOYMENT_LABELS[profile.employment_type] ?? profile.employment_type}
            </Field>
            <Field label="Pay Type">
              {PAY_TYPE_LABELS[profile.pay_type] ?? profile.pay_type}
            </Field>
            <Field label="Pay Rate">
              {formatINR(profile.pay_rate)}
              {profile.pay_type === 'per_video' ? ' / video' : ' / month'}
            </Field>
            <Field label="Total Paid to Date">{formatINR(profile.total_paid_to_date)}</Field>
            <Field label="Start Date">
              {profile.start_date ? formatDate(profile.start_date.split('T')[0]) : '—'}
            </Field>
            <Field label="Member Since">{formatDate(profile.created_at.split('T')[0])}</Field>
            {profile.notes && (
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <p className="whitespace-pre-wrap text-muted-foreground">{profile.notes}</p>
                </Field>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Payments */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid this month</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {formatINR(payments?.total_this_month ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total paid (lifetime)</p>
            <p className="mt-1 text-xl font-semibold text-primary">
              {formatINR(payments?.total_lifetime ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-sm font-semibold text-foreground">My Payments</h3>
        </CardHeader>
        <CardContent className="p-0">
          {!payments || payments.entries.length === 0 ? (
            <EmptyState
              icon={IndianRupee}
              title="No payments yet"
              message="Payments made to you will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Date', 'Description', 'Category', 'Amount (₹)', 'Payment Method'].map(h => (
                      <TableHead key={h} className={h.includes('Amount') ? 'text-right' : undefined}>
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(entry.date.split('T')[0])}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{entry.description}</TableCell>
                      <TableCell className="text-muted-foreground">{getCategoryLabel(entry.category)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold text-primary">
                        {formatINR(entry.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getPaymentMethodLabel(entry.payment_method)}
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
