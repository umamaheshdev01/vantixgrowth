'use client'

import { cn } from '@/lib/utils'

interface TabBarProps {
  tabs: string[]
  activeTab: number
  onTabChange: (index: number) => void
}

export default function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-1">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => onTabChange(i)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap rounded-t-md',
              activeTab === i
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30'
            )}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  )
}
