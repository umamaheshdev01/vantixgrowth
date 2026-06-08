import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted relative overflow-hidden', className)}
      {...props}
    />
  )
}

export { Skeleton }
