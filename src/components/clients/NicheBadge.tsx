import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const nicheColors: Record<string, string> = {
  Finance: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Education: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Fintech: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  SaaS: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'Personal Brand': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Other: 'bg-muted text-muted-foreground border-border',
}

export default function NicheBadge({ niche, className }: { niche: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', nicheColors[niche] ?? nicheColors.Other, className)}
    >
      {niche}
    </Badge>
  )
}
