'use client'

import { Pencil, ExternalLink } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'
import NicheBadge from '@/components/clients/NicheBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatINR } from '@/lib/formatCurrency'
import { formatDate, getDaysUntil } from '@/lib/dateHelpers'
import { PACKAGE_TIERS } from '@/constants/clients'
import type { ClientDetail } from '@/types/client'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value || '—'}</div>
    </div>
  )
}

interface ClientOverviewTabProps {
  client: ClientDetail
  totalRevenue: number
  onEdit: () => void
}

export default function ClientOverviewTab({ client, totalRevenue, onEdit }: ClientOverviewTabProps) {
  const tierLabel = PACKAGE_TIERS.find(t => t.value === client.package_tier)?.label ?? client.package_tier
  const startDate = client.contract_start_date.split('T')[0]
  const endDate = client.contract_end_date?.split('T')[0] ?? null
  const daysRemaining = endDate ? getDaysUntil(endDate) : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-xl">
            {client.logo_url ? <AvatarImage src={client.logo_url} alt={client.name} /> : null}
            <AvatarFallback className="rounded-xl text-sm">{getInitials(client.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-foreground">{client.name}</h2>
              <StatusBadge status={client.status} variant="client" />
              <NicheBadge niche={client.niche} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{client.contact_name} · {client.contact_email}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monthly Retainer</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{formatINR(client.retainer_amount)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tierLabel} package</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-semibold text-primary mt-1">{formatINR(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Lifetime income received</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Contract</p>
            <p className="text-sm font-semibold text-foreground mt-1">
              {formatDate(startDate)}
              {endDate ? ` → ${formatDate(endDate)}` : ' → Open-ended'}
            </p>
            {daysRemaining !== null && daysRemaining >= 0 && (
              <p className="text-xs text-amber-400 mt-0.5">{daysRemaining} days remaining</p>
            )}
            {daysRemaining !== null && daysRemaining < 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">Contract ended</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Client Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Field label="Contact Phone" value={client.contact_phone} />
            <Field label="Package Tier" value={tierLabel} />
            <Field label="Min Contract" value={client.min_contract_months ? `${client.min_contract_months} months` : null} />
            <Field label="Videos Active" value={client.videos_active} />
            <Field
              label="Next Due Date"
              value={client.next_due_date ? formatDate(client.next_due_date.split('T')[0]) : null}
            />
            <Field
              label="YouTube"
              value={
                client.youtube_url ? (
                  <a
                    href={client.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Channel <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null
              }
            />
            {client.notes && (
              <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
