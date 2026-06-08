'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { ChevronLeft, Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormValues = { email: string }

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>()

  const onSubmit = async ({ email }: FormValues) => {
    setLoading(true)
    setApiError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      })
      if (error) {
        setApiError('No account found with this email address.')
        return
      }
      setSubmittedEmail(email)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  const handleTryAgain = () => {
    setSubmitted(false)
    setApiError('')
    reset()
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-5">
          <CheckCircle2 size={26} className="text-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">Check your inbox</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          We sent a password reset link to{' '}
          <span className="font-medium text-foreground">{submittedEmail}</span>.
          The link expires in 1 hour.
        </p>
        <Button variant="outline" asChild className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Didn&apos;t receive it? Check spam or{' '}
          <button
            onClick={handleTryAgain}
            className="text-primary hover:text-brand-hover font-medium transition-colors"
          >
            try again
          </button>
        </p>
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium"
      >
        <ChevronLeft size={16} />
        Back to sign in
      </Link>

      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Reset your password</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="you@vantixgrowth.com"
              disabled={loading}
              className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
              })}
            />
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errors.email.message}
            </p>
          )}
        </div>

        {apiError && (
          <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
            <AlertCircle size={15} className="text-destructive shrink-0 mt-px" />
            <p className="text-sm text-destructive">{apiError}</p>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-10">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </div>
  )
}
