'use client'

import { useParams } from 'next/navigation'
import AdminGuard from '@/components/layout/AdminGuard'
import EmployeeDetailView from '@/components/employees/EmployeeDetailView'

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <AdminGuard>
      <EmployeeDetailView employeeId={id} />
    </AdminGuard>
  )
}
