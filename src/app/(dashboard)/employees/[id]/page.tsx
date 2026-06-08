'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AdminGuard from '@/components/layout/AdminGuard'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import TabBar from '@/components/shared/TabBar'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const TABS = ['Overview', 'Assigned Videos', 'Payment History', 'Performance']

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState(0)

  return (
    <AdminGuard>
      <div className="space-y-6 animate-in">
        <DetailPageHeader
          backHref="/employees"
          backLabel="Back to Employees"
          title="Employee Detail"
          meta={id}
          icon={Users}
        />

        <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border border-border mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">{TABS[activeTab]}</p>
            <p className="text-sm text-muted-foreground mt-1">This section is under development</p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  )
}
