'use client'

import AdminGuard from '@/components/layout/AdminGuard'
import { User, Building2, Users, Download, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    key: 'profile',
    icon: User,
    label: 'Profile',
    description: 'Manage your personal information, email, and password',
    accent: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    key: 'company',
    icon: Building2,
    label: 'Company',
    description: 'Update agency name, branding, and business details',
    accent: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    key: 'users',
    icon: Users,
    label: 'User Management',
    description: 'Invite team members, manage roles and permissions',
    accent: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    key: 'export',
    icon: Download,
    label: 'Data Export',
    description: 'Export clients, videos, and finance data as CSV',
    accent: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
  },
]

export default function SettingsPage() {
  return (
    <AdminGuard>
      <div className="space-y-8 animate-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and workspace preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map(({ key, icon: Icon, label, description, accent, bg }) => (
            <Card
              key={key}
              className="cursor-pointer hover:border-primary/25 hover:shadow-card-hover transition-all duration-200 group"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 mt-0.5',
                      bg
                    )}
                  >
                    <Icon className={cn('h-5 w-5', accent)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </div>
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
    </AdminGuard>
  )
}
