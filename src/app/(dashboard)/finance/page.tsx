import AdminGuard from '@/components/layout/AdminGuard'
import PageShell from '@/components/shared/PageShell'
import { IndianRupee, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function FinanceListPage() {
  return (
    <AdminGuard>
      <PageShell
        title="Finance"
        subtitle="Track income, expenses, and monthly profit"
        icon={IndianRupee}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/finance/report">View Report</Link>
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </div>
        }
      />
    </AdminGuard>
  )
}
