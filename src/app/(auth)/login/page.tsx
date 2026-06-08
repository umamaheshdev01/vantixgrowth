'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormValues = {
  email: string
  password: string
}

function toFriendlyError(msg: string): string {
  if (msg.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (msg.toLowerCase().includes('email not confirmed')) {
    return 'Please verify your email before signing in.'
  }
  return msg
}

export default function LoginPage() {
  const router = useRouter()
  const { user, login } = useAuth()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    router.replace(user.role === 'admin' ? '/dashboard' : '/videos')
  }, [user, router])

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>()

  const onSubmit = async ({ email, password }: FormValues) => {
    setLoading(true)
    setApiError('')
    try {
      await login(email, password)
    } catch (err) {
      const msg = toFriendlyError(err instanceof Error ? err.message : 'Sign in failed')
      setApiError(msg)
      toast({ title: 'Sign in failed', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your dashboard to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@vantixgrowth.com"
            disabled={loading}
            className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            })}
          />
          {errors.email && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-brand-hover transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              disabled={loading}
              className={`pr-10 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
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
        </div>

        {apiError && (
          <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <AlertCircle size={15} className="text-destructive shrink-0 mt-px" />
            <p className="text-sm text-destructive leading-snug">{apiError}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-10 mt-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
