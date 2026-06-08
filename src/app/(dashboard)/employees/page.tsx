import AdminGuard from '@/components/layout/AdminGuard'
import EmployeeListView from '@/components/employees/EmployeeListView'

export default function EmployeeListPage() {
  return (
    <AdminGuard>
      <EmployeeListView />
    </AdminGuard>
  )
}
