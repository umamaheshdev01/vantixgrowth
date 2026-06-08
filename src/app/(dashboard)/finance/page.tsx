import AdminGuard from '@/components/layout/AdminGuard'
import FinanceListView from '@/components/finance/FinanceListView'

export default function FinanceListPage() {
  return (
    <AdminGuard>
      <FinanceListView />
    </AdminGuard>
  )
}
