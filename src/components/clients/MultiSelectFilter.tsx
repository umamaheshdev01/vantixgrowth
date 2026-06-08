'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface MultiSelectFilterProps {
  label: string
  options: readonly Option[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export default function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    )
  }

  const displayLabel =
    selected.length === 0
      ? label
      : selected.length === 1
      ? options.find(o => o.value === selected[0])?.label ?? label
      : `${label} (${selected.length})`

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn('min-w-[130px] justify-between', selected.length > 0 && 'border-primary/40 text-primary')}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute z-40 mt-1.5 min-w-[180px] rounded-lg border border-border bg-card shadow-lg py-1 animate-in">
          {options.map(opt => {
            const checked = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                    checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className={cn(checked && 'font-medium text-foreground')}>{opt.label}</span>
              </button>
            )
          })}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground border-t border-border mt-1"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  )
}
