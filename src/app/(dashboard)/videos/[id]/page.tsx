'use client'

import { useParams } from 'next/navigation'
import { Video, Clock, RotateCcw, Activity } from 'lucide-react'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const SECTIONS = [
  { label: 'Status Timeline', icon: Clock, description: 'Track the full journey of this video through production stages' },
  { label: 'Quick Status Update', icon: Video, description: 'Update the current status and notify the client' },
  { label: 'Revision Log', icon: RotateCcw, description: 'View all revision requests and their notes' },
  { label: 'Activity Log', icon: Activity, description: 'Complete history of changes and actions' },
]

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6 animate-in">
      <DetailPageHeader
        backHref="/videos"
        backLabel="Back to Video Tracker"
        title="Video Detail"
        meta={id}
        icon={Video}
        iconClassName="bg-amber-500/90 border-0"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map(({ label, icon: Icon, description }) => (
          <Card
            key={label}
            className="hover:border-primary/25 hover:shadow-card-hover transition-all duration-200"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted border border-border shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
                  <Badge variant="muted" className="mt-3 text-[10px]">
                    Coming soon
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
