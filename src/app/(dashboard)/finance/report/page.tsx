import AdminGuard from '@/components/layout/AdminGuard'
import FinanceReportView from '@/components/finance/FinanceReportView'

export default function FinanceReportPage() {
  return (
    <AdminGuard>
      <FinanceReportView />
    </AdminGuard>
  )
}
