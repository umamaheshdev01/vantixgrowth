import AdminGuard from '@/components/layout/AdminGuard'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import { IndianRupee } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function FinanceReportPage() {
  return (
    <AdminGuard>
      <div className="space-y-6 animate-in">
        <DetailPageHeader
          backHref="/finance"
          backLabel="Back to Finance"
          title="Monthly P&L Report"
          description="Profit and loss breakdown by month"
          icon={IndianRupee}
        />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border border-border mb-4">
              <IndianRupee className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">Report coming soon</p>
            <p className="text-sm text-muted-foreground mt-1">Monthly P&L breakdown will appear here</p>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  )
}
