import { emitToast } from '@/components/ui/toaster'

type ToastVariant = 'default' | 'destructive' | 'success'

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
}

export function useToast() {
  return {
    toast: (opts: ToastOptions) => emitToast(opts),
  }
}
