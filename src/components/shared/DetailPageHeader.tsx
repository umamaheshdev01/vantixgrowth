import Link from 'next/link'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DetailPageHeaderProps {
  backHref: string
  backLabel: string
  title: string
  description?: string
  meta?: string
  icon: LucideIcon
  iconClassName?: string
}

export default function DetailPageHeader({
  backHref,
  backLabel,
  title,
  description,
  meta,
  icon: Icon,
  iconClassName,
}: DetailPageHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl shrink-0',
            iconClassName ?? 'bg-primary/15 border border-primary/20'
          )}
        >
          <Icon className={cn('h-5 w-5', iconClassName ? 'text-white' : 'text-primary')} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
          {meta && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono">{meta}</p>
          )}
        </div>
      </div>
    </div>
  )
}
