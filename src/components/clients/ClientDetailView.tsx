'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Loader2 } from 'lucide-react'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import TabBar from '@/components/shared/TabBar'
import ClientOverviewTab from '@/components/clients/ClientOverviewTab'
import ClientVideosTab from '@/components/clients/ClientVideosTab'
import ClientFinanceTab from '@/components/clients/ClientFinanceTab'
import ClientNotesActivityTab from '@/components/clients/ClientNotesActivityTab'
import ClientFormDrawer from '@/components/clients/ClientFormDrawer'
import { apiFetch } from '@/lib/api'
import type { ClientDetail, ClientFinanceResponse } from '@/types/client'

const TABS = ['Overview', 'Videos', 'Finance', 'Notes & Activity']

interface ClientDetailViewProps {
  clientId: string
}

export default function ClientDetailView({ clientId }: ClientDetailViewProps) {
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [editOpen, setEditOpen] = useState(false)

  const loadClient = useCallback(async () => {
    setLoading(true)
    const [clientRes, financeRes] = await Promise.all([
      apiFetch<ClientDetail>(`/api/clients/${clientId}`),
      apiFetch<ClientFinanceResponse>(`/api/clients/${clientId}/finance?limit=1`),
    ])

    if (!clientRes.success || !clientRes.data) {
      setClient(null)
      setLoading(false)
      return
    }

    setClient(clientRes.data)
    setTotalRevenue(financeRes.data?.total_received_lifetime ?? 0)
    setLoading(false)
  }, [clientId])

  useEffect(() => { loadClient() }, [loadClient])

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
          onNotesSaved={notes => setClient(prev => prev ? { ...prev, notes } : prev)}
        />
      )}

      <ClientFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
        onSaved={loadClient}
      />
    </div>
  )
}

function formatTier(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1) + ' package'
}
