import { Card, CardContent } from '@/components/ui/card'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
      <div className="pointer-events-none absolute inset-0 surface-grid opacity-40" />
      <div className="pointer-events-none absolute inset-0 glow-top" />

      <div className="relative z-10 w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-glow">
            <span className="text-base font-bold text-primary-foreground select-none">V</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">VantixGrowth</span>
        </div>

        <Card className="border-border/80 shadow-card-hover">
          <CardContent className="p-8">{children}</CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Internal tool &mdash; VantixGrowth &copy; 2026
        </p>
      </div>
    </div>
  )
}
