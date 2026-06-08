import AdminGuard from '@/components/layout/AdminGuard'
import ClientListView from '@/components/clients/ClientListView'

export default function ClientListPage() {
  return (
    <AdminGuard>
      <ClientListView />
    </AdminGuard>
  )
}
