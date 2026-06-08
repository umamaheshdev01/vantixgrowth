'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetCloseButton,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { toDateInputValue } from '@/lib/dateHelpers'
import { cn } from '@/lib/utils'

const ROLES = [
  'Video Editor',
  'Lead Editor',
  'Thumbnail Designer',
  'Social Media Assistant',
  'VA',
  'Other',
]

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'freelance', label: 'Freelance' },
]

export interface EmployeeListItem {
  id: string
  role: string
  employment_type: string
  pay_type: string
  pay_rate: number
  status: string
  start_date: string | null
  notes: string | null
  created_at: string
  user: { id: string; name: string; email: string; status: string }
  active_tasks: number
}

interface FormValues {
  full_name: string
  login_email: string
  role: string
  employment_type: string
  status: string
  pay_type: string
  pay_rate: string
  temp_password: string
  start_date: string
  notes: string
}

const emptyForm = (): FormValues => ({
  full_name: '',
  login_email: '',
  role: 'Video Editor',
  employment_type: 'full_time',
  status: 'active',
  pay_type: 'monthly',
  pay_rate: '',
  temp_password: '',
  start_date: '',
  notes: '',
})

function employeeToForm(e: EmployeeListItem): FormValues {
  return {
    full_name: e.user.name,
    login_email: e.user.email,
    role: e.role,
    employment_type: e.employment_type,
    status: e.status,
    pay_type: e.pay_type,
    pay_rate: String(e.pay_rate),
    temp_password: '',
    start_date: e.start_date ? toDateInputValue(e.start_date) : '',
    notes: e.notes ?? '',
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: EmployeeListItem | null
  onSaved: () => void
}

export default function EmployeeFormDrawer({ open, onOpenChange, employee, onSaved }: Props) {
  const { toast } = useToast()
  const isEdit = Boolean(employee)
  const [form, setForm] = useState<FormValues>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const initialRef = useRef<string>('')

  useEffect(() => {
    if (open) {
      const initial = employee ? employeeToForm(employee) : emptyForm()
      setForm(initial)
      initialRef.current = JSON.stringify(initial)
      setErrors({})
      setDirty(false)
    }
  }, [open, employee])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const set = (field: keyof FormValues, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      setDirty(JSON.stringify(next) !== initialRef.current)
      return next
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    else if (form.full_name.length > 100) e.full_name = 'Max 100 characters'
    if (!isEdit) {
      if (!form.login_email.trim()) e.login_email = 'Login email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.login_email))
        e.login_email = 'Invalid email format'
      if (!form.temp_password) e.temp_password = 'Temporary password is required'
      else if (form.temp_password.length < 8) e.temp_password = 'Must be at least 8 characters'
    }
    if (!form.role) e.role = 'Role is required'
    if (!form.employment_type) e.employment_type = 'Employment type is required'
    if (!form.pay_type) e.pay_type = 'Pay type is required'
    const rate = parseInt(form.pay_rate, 10)
    if (!form.pay_rate || isNaN(rate) || rate <= 0) e.pay_rate = 'Enter a positive whole number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && dirty) {
      if (!confirm('You have unsaved changes. Close anyway?')) return
    }
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const prevPayType = employee?.pay_type
    setSaving(true)

    const res = isEdit
      ? await apiFetch(`/api/employees/${employee!.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            role: form.role,
            employment_type: form.employment_type,
            pay_type: form.pay_type,
            pay_rate: parseInt(form.pay_rate, 10),
            status: form.status,
            start_date: form.start_date || null,
            notes: form.notes.trim() || null,
          }),
        })
      : await apiFetch('/api/employees', {
          method: 'POST',
          body: JSON.stringify({
            full_name: form.full_name.trim(),
            login_email: form.login_email.trim(),
            role: form.role,
            employment_type: form.employment_type,
            pay_type: form.pay_type,
            pay_rate: parseInt(form.pay_rate, 10),
            status: form.status,
            temp_password: form.temp_password,
            start_date: form.start_date || undefined,
            notes: form.notes.trim() || undefined,
          }),
        })

    setSaving(false)

    if (!res.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: res.error ?? 'Check the form and try again' })
      return
    }

    setDirty(false)
    toast({
      variant: 'success',
      title: isEdit ? 'Employee updated' : 'Employee added successfully',
    })

    if (isEdit && prevPayType && prevPayType !== form.pay_type) {
      setTimeout(() => {
        toast({
          title: 'Pay type updated',
          description: 'Historical payments are not affected.',
        })
      }, 400)
    }

    onOpenChange(false)
    onSaved()
  }

  const fc = (field: string) => cn(errors[field] && 'border-destructive focus-visible:ring-destructive')

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto p-0 sm:max-w-[480px]">
        <SheetCloseButton />
        <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Update team member details and pay information.'
                : 'Create a new team member account.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 px-6 py-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-full_name">Full Name *</Label>
              <Input
                id="emp-full_name"
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                maxLength={100}
                className={fc('full_name')}
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>

            {/* Login Email */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-login_email">Login Email *</Label>
              <Input
                id="emp-login_email"
                type="email"
                value={form.login_email}
                onChange={e => set('login_email', e.target.value)}
                disabled={isEdit}
                className={fc('login_email')}
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground">This will be their login username.</p>
              )}
              {errors.login_email && <p className="text-xs text-destructive">{errors.login_email}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Role */}
              <div className="space-y-1.5">
                <Label htmlFor="emp-role">Role *</Label>
                <select
                  id="emp-role"
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm',
                    fc('role'),
                  )}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
              </div>

              {/* Employment Type */}
              <div className="space-y-1.5">
                <Label htmlFor="emp-employment_type">Employment Type *</Label>
                <select
                  id="emp-employment_type"
                  value={form.employment_type}
                  onChange={e => set('employment_type', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                >
                  {EMPLOYMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="emp-status">Status *</Label>
                <select
                  id="emp-status"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <Label htmlFor="emp-start_date">Start Date</Label>
                <Input
                  id="emp-start_date"
                  type="date"
                  value={form.start_date}
                  onChange={e => set('start_date', e.target.value)}
                />
              </div>
            </div>

            {/* Pay Type */}
            <div className="space-y-2">
              <Label>Pay Type *</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="emp-pay_type"
                    value="monthly"
                    checked={form.pay_type === 'monthly'}
                    onChange={e => set('pay_type', e.target.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm">Monthly Retainer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="emp-pay_type"
                    value="per_video"
                    checked={form.pay_type === 'per_video'}
                    onChange={e => set('pay_type', e.target.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm">Per Video</span>
                </label>
              </div>
              {errors.pay_type && <p className="text-xs text-destructive">{errors.pay_type}</p>}
            </div>

            {/* Pay Rate */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-pay_rate">
                {form.pay_type === 'monthly' ? 'Monthly Salary (₹)' : 'Rate Per Video (₹)'} *
              </Label>
              <Input
                id="emp-pay_rate"
                type="number"
                min={1}
                step={1}
                value={form.pay_rate}
                onChange={e => set('pay_rate', e.target.value)}
                className={fc('pay_rate')}
              />
              {errors.pay_rate && <p className="text-xs text-destructive">{errors.pay_rate}</p>}
            </div>

            {/* Temp Password (create only) */}
            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="emp-temp_password">Temporary Password *</Label>
                <Input
                  id="emp-temp_password"
                  type="password"
                  value={form.temp_password}
                  onChange={e => set('temp_password', e.target.value)}
                  className={fc('temp_password')}
                />
                <p className="text-xs text-muted-foreground">
                  Employee will be prompted to change this on first login.
                </p>
                {errors.temp_password && (
                  <p className="text-xs text-destructive">{errors.temp_password}</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-notes">Notes</Label>
              <Textarea
                id="emp-notes"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{form.notes.length}/500</p>
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Employee'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
