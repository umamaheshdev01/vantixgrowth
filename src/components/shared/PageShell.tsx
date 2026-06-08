import { type LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PageShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  icon?: LucideIcon
  children?: ReactNode
  className?: string
}

export default function PageShell({
  title,
  subtitle,
  actions,
  icon: Icon,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn('space-y-8 animate-in', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {children ?? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            {Icon && (
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border border-border">
                <Icon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm font-medium text-muted-foreground">Content coming soon</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              This section is under development
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
