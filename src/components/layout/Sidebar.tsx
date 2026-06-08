'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Video,
  IndianRupee,
  Settings,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const STORAGE_KEY = 'vantix-sidebar-collapsed'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/clients', label: 'Clients', icon: Briefcase, roles: ['admin'] },
  { href: '/employees', label: 'Employees', icon: Users, roles: ['admin'] },
  { href: '/videos', label: 'Video Tracker', icon: Video, roles: ['admin', 'employee'] },
  { href: '/finance', label: 'Finance', icon: IndianRupee, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
]

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function SidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const Icon = collapsed ? PanelLeft : PanelLeftClose

  const button = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn(
        'h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground',
        collapsed && 'mx-auto'
      )}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    )
  }

  return button
}

function Logo({
  collapsed,
  onToggle,
}: {
  collapsed?: boolean
  onToggle?: () => void
}) {
  return (
    <div
      className={cn(
        'flex h-14 items-center shrink-0 border-b border-sidebar-border',
        collapsed ? 'justify-center px-2' : 'gap-2 px-3'
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
        <span className="text-xs font-bold text-primary-foreground select-none">V</span>
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-foreground truncate">
            VantixGrowth
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">Agency Dashboard</p>
        </div>
      )}
      {!collapsed && onToggle && <SidebarToggle collapsed={false} onToggle={onToggle} />}
    </div>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  collapsed?: boolean
  onClick?: () => void
}) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center rounded-lg text-[13px] font-medium transition-all duration-200',
        collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-primary')} />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
        </>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const { user } = useAuth()
  const pathname = usePathname()
  const visible = NAV_ITEMS.filter(item => item.roles.includes(user?.role ?? ''))

  return (
    <ScrollArea className="flex-1 px-2 py-3">
      {!collapsed && (
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
          Navigation
        </p>
      )}
      <nav className="space-y-0.5">
        {visible.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={pathname === href || pathname.startsWith(href + '/')}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        ))}
      </nav>
    </ScrollArea>
  )
}

function SidebarFooter({
  collapsed,
  onToggle,
}: {
  collapsed?: boolean
  onToggle?: () => void
}) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="shrink-0 p-2 border-t border-sidebar-border space-y-1">
      {collapsed && onToggle && (
        <div className="flex justify-center pb-1">
          <SidebarToggle collapsed onToggle={onToggle} />
        </div>
      )}

      {user && (
        <div
          className={cn(
            'flex items-center rounded-lg px-2 py-2',
            collapsed ? 'justify-center' : 'gap-2.5'
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate text-foreground">{user.name}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{user.role}</p>
            </div>
          )}
        </div>
      )}

      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="w-full text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Sign out</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      )}
    </div>
  )
}

function SidebarBody({
  collapsed,
  onNavigate,
  onToggle,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  onToggle?: () => void
}) {
  return (
    <div className="flex flex-col h-full bg-sidebar overflow-hidden">
      <Logo collapsed={collapsed} onToggle={onToggle} />
      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      <SidebarFooter collapsed={collapsed} onToggle={onToggle} />
    </div>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setCollapsed(true)
    setMounted(true)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const desktopCollapsed = mounted && collapsed

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center border-b border-border bg-sidebar px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(v => !v)}
          className="text-muted-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-[10px] font-bold text-primary-foreground">V</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">VantixGrowth</span>
        </div>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 ease-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">V</span>
            </div>
            <span className="text-sm font-semibold">VantixGrowth</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
        <Separator />
        <SidebarFooter />
      </aside>

      {/* Desktop / tablet: togglable sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out overflow-hidden',
          desktopCollapsed ? 'w-14' : 'w-60'
        )}
      >
        <SidebarBody
          collapsed={desktopCollapsed}
          onToggle={toggleCollapsed}
        />
      </aside>
    </>
  )
}
