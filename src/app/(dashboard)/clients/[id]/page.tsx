'use client'

import { useParams } from 'next/navigation'
import AdminGuard from '@/components/layout/AdminGuard'
import ClientDetailView from '@/components/clients/ClientDetailView'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <AdminGuard>
      <ClientDetailView clientId={id} />
    </AdminGuard>
  )
}
