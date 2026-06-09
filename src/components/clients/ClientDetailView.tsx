'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Briefcase, Loader2 } from 'lucide-react'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import TabBar from '@/components/shared/TabBar'
import ClientOverviewTab from '@/components/clients/ClientOverviewTab'
import ClientVideosTab from '@/components/clients/ClientVideosTab'
import ClientFinanceTab from '@/components/clients/ClientFinanceTab'
import ClientNotesActivityTab from '@/components/clients/ClientNotesActivityTab'
import ClientFormDrawer from '@/components/clients/ClientFormDrawer'
import { invalidate } from '@/lib/swr'
import type { ClientDetail, ClientFinanceResponse } from '@/types/client'

const TABS = ['Overview', 'Videos', 'Finance', 'Notes & Activity']

interface ClientDetailViewProps {
  clientId: string
}

export default function ClientDetailView({ clientId }: ClientDetailViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)

  const { data: client = null, isLoading: clientLoading, mutate: mutateClient } =
    useSWR<ClientDetail>(`/api/clients/${clientId}`)
  const { data: finance, isLoading: financeLoading } =
    useSWR<ClientFinanceResponse>(`/api/clients/${clientId}/finance?limit=1`)

  const totalRevenue = finance?.total_received_lifetime ?? 0
  const loading = clientLoading || financeLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-32">
        <p className="text-sm font-medium text-foreground">Client not found</p>
        <button
          type="button"
          onClick={() => router.push('/clients')}
          className="text-sm text-primary mt-2 hover:underline"
        >
          Back to Clients
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      <DetailPageHeader
        backHref="/clients"
        backLabel="Back to Clients"
        title={client.name}
        description={`${client.contact_name} · ${formatTier(client.package_tier)}`}
        icon={Briefcase}
      />

      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 0 && (
        <ClientOverviewTab
          client={client}
          totalRevenue={totalRevenue}
          onEdit={() => setEditOpen(true)}
        />
      )}
      {activeTab === 1 && <ClientVideosTab clientId={client.id} clientName={client.name} />}
      {activeTab === 2 && <ClientFinanceTab clientId={client.id} />}
      {activeTab === 3 && (
        <ClientNotesActivityTab
          clientId={client.id}
          initialNotes={client.notes}
          onNotesSaved={notes =>
            mutateClient(prev => (prev ? { ...prev, notes } : prev), { revalidate: false })
          }
        />
      )}

      <ClientFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        onSaved={() => invalidate('/api/clients', 'dashboard:')}
      />
    </div>
  )
}

function formatTier(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1) + ' package'
}
