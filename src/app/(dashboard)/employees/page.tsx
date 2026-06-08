import AdminGuard from '@/components/layout/AdminGuard'
import PageShell from '@/components/shared/PageShell'
import { Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EmployeeListPage() {
  return (
    <AdminGuard>
      <PageShell
        title="Employees"
        subtitle="Manage your team members and their assignments"
        icon={Users}
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        }
      />
    </AdminGuard>
  )
}
