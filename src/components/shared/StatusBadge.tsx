import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface BadgeStyle {
  bg: string
  text: string
  dot: string
  label: string
}

const videoStatusStyles: Record<string, BadgeStyle> = {
  brief_received:      { bg: 'rgba(59,130,246,0.12)',  text: '#60A5FA', dot: '#3B82F6', label: 'Brief Received' },
  footage_received:    { bg: 'rgba(99,102,241,0.12)',  text: '#818CF8', dot: '#6366F1', label: 'Footage Received' },
  assigned:            { bg: 'rgba(139,92,246,0.12)',  text: '#A78BFA', dot: '#8B5CF6', label: 'Assigned' },
  in_editing:          { bg: 'rgba(245,158,11,0.12)',  text: '#FCD34D', dot: '#F59E0B', label: 'In Editing' },
  internal_review:     { bg: 'rgba(249,115,22,0.12)',  text: '#FB923C', dot: '#F97316', label: 'Internal Review' },
  sent_to_client:      { bg: 'rgba(62,207,142,0.12)',  text: '#3ECF8E', dot: '#3ECF8E', label: 'Sent to Client' },
  revisions_requested: { bg: 'rgba(239,68,68,0.12)',   text: '#F87171', dot: '#EF4444', label: 'Revisions Requested' },
  in_revision:         { bg: 'rgba(244,63,94,0.12)',   text: '#FB7185', dot: '#F43F5E', label: 'In Revision' },
  approved:            { bg: 'rgba(62,207,142,0.12)',  text: '#3ECF8E', dot: '#22C55E', label: 'Approved' },
  delivered:           { bg: 'rgba(62,207,142,0.08)',  text: '#2EBD7C', dot: '#16A34A', label: 'Delivered' },
  cancelled:           { bg: 'rgba(255,255,255,0.04)', text: '#666666', dot: '#444444', label: 'Cancelled' },
}

const clientStatusStyles: Record<string, BadgeStyle> = {
  active:       { bg: 'rgba(62,207,142,0.12)',  text: '#3ECF8E', dot: '#3ECF8E', label: 'Active' },
  on_hold:      { bg: 'rgba(245,158,11,0.12)',  text: '#FCD34D', dot: '#F59E0B', label: 'On Hold' },
  upcoming:     { bg: 'rgba(59,130,246,0.12)',  text: '#60A5FA', dot: '#3B82F6', label: 'Upcoming' },
  ended:        { bg: 'rgba(255,255,255,0.04)', text: '#888888', dot: '#555555', label: 'Ended' },
  archived:     { bg: 'rgba(255,255,255,0.03)', text: '#666666', dot: '#444444', label: 'Archived' },
  ending_soon:  { bg: 'rgba(239,68,68,0.12)',   text: '#F87171', dot: '#EF4444', label: 'Ending Soon' },
}

interface StatusBadgeProps {
  status: string
  variant?: 'video' | 'client'
}

export default function StatusBadge({ status, variant = 'video' }: StatusBadgeProps) {
  const map = variant === 'client' ? clientStatusStyles : videoStatusStyles
  const style = map[status] ?? {
    bg: 'rgba(255,255,255,0.05)',
    text: '#888888',
    dot: '#555555',
    label: status,
  }

  return (
    <Badge
      variant="outline"
      className={cn('border-0 font-medium')}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: style.dot }}
      />
      {style.label}
    </Badge>
  )
}
