'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Loader2, AlertCircle, XCircle, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FormValues = {
  password: string
  confirmPassword: string
}

type PageState = 'checking' | 'form' | 'invalid'

function getStrength(password: string) {
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const longEnough = password.length >= 8
  if (!longEnough) return { width: '33%', colorClass: 'bg-destructive', label: 'Weak', textClass: 'text-destructive' }
  if (hasUpper && hasNumber) return { width: '100%', colorClass: 'bg-primary', label: 'Strong', textClass: 'text-primary' }
  return { width: '66%', colorClass: 'bg-amber-500', label: 'Fair', textClass: 'text-amber-500' }
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [pageState, setPageState] = useState<PageState>('checking')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>()
  const passwordValue = watch('password', '')
  const strength = getStrength(passwordValue)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setPageState(session?.user ? 'form' : 'invalid')
    })
  }, [])

  const onSubmit = async ({ password }: FormValues) => {
    setLoading(true)
    setApiError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setApiError(error.message); return }
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.', variant: 'success' })
      setTimeout(() => router.push('/dashboard'), 1500)
    } finally {
      setLoading(false)
    }
  }

  if (pageState === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Loader2 size={28} className="animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Verifying reset link…</p>
      </div>
    )
  }

  if (pageState === 'invalid') {
    return (
      <div className="text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 mx-auto mb-5">
          <XCircle size={26} className="text-destructive" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">Link expired</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          This password reset link has expired or is invalid. Reset links are valid for 1 hour.
        </p>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={18} className="text-primary" />
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Set new password</h2>
        </div>
        <p className="text-sm text-muted-foreground">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              disabled={loading}
              className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters required' },
                validate: {
                  hasUpper: v => /[A-Z]/.test(v) || 'Must include an uppercase letter',
                  hasNumber: v => /[0-9]/.test(v) || 'Must include a number',
                },
              })}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errors.password.message}
            </p>
          )}

          {passwordValue.length > 0 && !errors.password && (
            <div className="mt-2">
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', strength.colorClass)}
                  style={{ width: strength.width }}
                />
              </div>
              <p className={cn('mt-1 text-xs font-medium', strength.textClass)}>
                {strength.label} password
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              disabled={loading}
              className={`pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: v => v === passwordValue || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {apiError && (
          <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <AlertCircle size={15} className="text-destructive shrink-0 mt-px" />
            <p className="text-sm text-destructive">{apiError}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-10 mt-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
