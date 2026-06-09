'use client'

import useSWR from 'swr'
import { IndianRupee } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'
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
import { formatINR } from '@/lib/formatCurrency'
import { formatDate } from '@/lib/dateHelpers'
import { FINANCE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '@/constants/clients'
import type { ClientFinanceResponse } from '@/types/client'

interface ClientFinanceTabProps {
  clientId: string
}

export default function ClientFinanceTab({ clientId }: ClientFinanceTabProps) {
  const { data = null, isLoading: loading } =
    useSWR<ClientFinanceResponse>(`/api/clients/${clientId}/finance?limit=100`)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  const entries = data?.entries ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total received (lifetime)</p>
            <p className="text-xl font-semibold text-primary mt-1">
              {formatINR(data?.total_received_lifetime ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total received this month</p>
            <p className="text-xl font-semibold text-foreground mt-1">
              {formatINR(data?.total_received_this_month ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <EmptyState
              icon={IndianRupee}
              title="No income entries"
              message="Finance entries linked to this client will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Date', 'Description', 'Category', 'Amount (₹)', 'Payment Method'].map(h => (
                      <TableHead key={h} className={h.includes('Amount') ? 'text-right' : undefined}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(entry.date.split('T')[0])}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{entry.description}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {FINANCE_CATEGORY_LABELS[entry.category] ?? entry.category}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary whitespace-nowrap">
                        {formatINR(entry.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[entry.payment_method] ?? entry.payment_method}
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
