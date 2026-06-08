'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type ToastVariant = 'default' | 'destructive' | 'success'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

type Listener = (toast: Toast) => void
const listeners: Listener[] = []

export function emitToast(opts: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2, 9)
  listeners.forEach(fn => fn({ id, ...opts }))
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (toast: Toast) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 4500)
    }
    listeners.push(handler)
    return () => {
      const idx = listeners.indexOf(handler)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map(t => {
        const isDestructive = t.variant === 'destructive'
        const isSuccess = t.variant === 'success'

        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg animate-in bg-card',
              isDestructive && 'border-destructive/30',
              isSuccess && 'border-primary/30',
              !isDestructive && !isSuccess && 'border-border'
            )}
          >
            {isDestructive && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />}
            {isSuccess && <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />}
            {!isDestructive && !isSuccess && (
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
            )}

            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="text-sm font-medium leading-snug text-foreground">{t.title}</p>
              )}
              {t.description && (
                <p className="text-xs leading-snug mt-0.5 text-muted-foreground">{t.description}</p>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
