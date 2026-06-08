'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KPICardProps {
  label: string
  value: number | null
  icon: LucideIcon
  iconColor: string
  trend: number | null
  loading: boolean
  formatter: (val: number | null) => string
}

export default function KPICard({
  label,
  value,
  icon: Icon,
  iconColor,
  trend,
  loading,
  formatter,
}: KPICardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group hover:border-primary/25 hover:shadow-card-hover transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
            style={{ backgroundColor: `${iconColor}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: iconColor }} />
          </div>
          <TrendBadge trend={trend} />
        </div>

        <div className="text-2xl font-semibold tracking-tight text-foreground mb-1">
          {formatter(value)}
        </div>

        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </CardContent>
    </Card>
  )
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null || trend === 0) {
    return <span className="text-xs text-muted-foreground/40">—</span>
  }

  if (trend > 0) {
    return (
      <Badge variant="default" className="gap-1 bg-primary/10 text-primary border-0">
        <TrendingUp className="h-3 w-3" />
        +{trend.toFixed(1)}%
      </Badge>
    )
  }

  return (
    <Badge variant="destructive" className="gap-1 bg-destructive/10 text-destructive border-0">
      <TrendingDown className="h-3 w-3" />
      {trend.toFixed(1)}%
    </Badge>
  )
}
