import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted border border-border">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      {title && <p className="text-sm font-semibold text-foreground mb-1">{title}</p>}
      <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
