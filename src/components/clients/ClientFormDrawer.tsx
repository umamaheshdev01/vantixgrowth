'use client'

import { useEffect, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import {
  CLIENT_NICHES,
  CLIENT_STATUSES,
  PACKAGE_TIERS,
} from '@/constants/clients'
import type { ClientDetail, ClientFormValues } from '@/types/client'
import { toDateInputValue } from '@/lib/dateHelpers'
import { cn } from '@/lib/utils'

const emptyForm = (): ClientFormValues => ({
  name: '',
  niche: 'Finance',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  retainer_amount: '',
  package_tier: 'starter',
  status: 'active',
  contract_start_date: new Date().toISOString().split('T')[0],
  contract_end_date: '',
  min_contract_months: '',
  youtube_url: '',
  notes: '',
  logo_url: '',
})

function clientToForm(client: ClientDetail): ClientFormValues {
  return {
    name: client.name,
    niche: client.niche,
    contact_name: client.contact_name,
    contact_email: client.contact_email,
    contact_phone: client.contact_phone ?? '',
    retainer_amount: String(client.retainer_amount),
    package_tier: client.package_tier,
    status: client.status === 'archived' ? 'active' : client.status,
    contract_start_date: toDateInputValue(client.contract_start_date),
    contract_end_date: toDateInputValue(client.contract_end_date),
    min_contract_months: client.min_contract_months ? String(client.min_contract_months) : '',
    youtube_url: client.youtube_url ?? '',
    notes: client.notes ?? '',
    logo_url: client.logo_url ?? '',
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

interface ClientFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: ClientDetail | null
  onSaved: () => void
}

export default function ClientFormDrawer({ open, onOpenChange, client, onSaved }: ClientFormDrawerProps) {
  const { toast } = useToast()
  const isEdit = Boolean(client)
  const [form, setForm] = useState<ClientFormValues>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(client ? clientToForm(client) : emptyForm())
      setErrors({})
    }
  }, [open, client])

  const set = (field: keyof ClientFormValues, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Client name is required'
    else if (form.name.length > 100) e.name = 'Max 100 characters'
    if (!form.niche) e.niche = 'Niche is required'
    if (!form.contact_name.trim()) e.contact_name = 'Contact name is required'
    if (!form.contact_email.trim()) e.contact_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) e.contact_email = 'Invalid email format'
    const amount = parseInt(form.retainer_amount, 10)
    if (!form.retainer_amount || isNaN(amount) || amount <= 0) e.retainer_amount = 'Enter a positive whole number'
    if (!form.contract_start_date) e.contract_start_date = 'Start date is required'
    else {
      const start = new Date(form.contract_start_date)
      const max = new Date()
      max.setDate(max.getDate() + 90)
      if (start > max) e.contract_start_date = 'Cannot be more than 90 days in the future'
    }
    if (form.youtube_url.trim()) {
      const url = form.youtube_url.trim()
      if (!url.startsWith('https://youtube.com/') && !url.startsWith('https://www.youtube.com/')) {
        e.youtube_url = 'Must start with https://youtube.com or https://www.youtube.com'
      }
    }
    if (form.notes.length > 1000) e.notes = 'Max 1000 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      niche: form.niche,
      contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim(),
      contact_phone: form.contact_phone.trim() || null,
      retainer_amount: parseInt(form.retainer_amount, 10),
      package_tier: form.package_tier,
      status: form.status,
      contract_start_date: form.contract_start_date,
      contract_end_date: form.contract_end_date || null,
      min_contract_months: form.min_contract_months ? parseInt(form.min_contract_months, 10) : null,
      youtube_url: form.youtube_url.trim() || null,
      notes: form.notes.trim() || null,
      logo_url: form.logo_url.trim() || null,
    }
    return payload
  }

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Logo must be under 2MB' })
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Use PNG, JPG, or WEBP' })
      return
    }

    const entityId = client?.id ?? 'new'
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('entity_type', 'client')
    fd.append('entity_id', entityId)

    const res = await apiFetch<{ url: string }>('/api/upload', { method: 'POST', body: fd })
    setUploading(false)

    if (!res.success || !res.data?.url) {
      toast({ variant: 'destructive', title: 'Upload failed', description: res.error ?? 'Try again' })
      return
    }
    set('logo_url', res.data.url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    const payload = buildPayload()

    const res = isEdit
      ? await apiFetch<ClientDetail>(`/api/clients/${client!.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      : await apiFetch<ClientDetail>('/api/clients', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

    setSaving(false)

    if (!res.success) {
      if (res.details) setErrors(res.details)
      toast({ variant: 'destructive', title: 'Save failed', description: res.error ?? 'Check the form' })
      return
    }

    toast({
      variant: 'success',
      title: isEdit ? 'Client updated' : 'Client created',
      description: `${form.name} has been saved.`,
    })
    onOpenChange(false)
    onSaved()
  }

  const fieldClass = (field: string) => cn(errors[field] && 'border-destructive focus-visible:ring-destructive')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto p-0">
        <SheetCloseButton />
        <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{isEdit ? 'Edit Client' : 'Add Client'}</SheetTitle>
            <SheetDescription>
              {isEdit ? 'Update client details and retainer information.' : 'Add a new retainer client to your roster.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 px-6 py-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 rounded-lg">
                {form.logo_url ? <AvatarImage src={form.logo_url} alt={form.name} /> : null}
                <AvatarFallback className="rounded-lg text-xs">
                  {form.name ? getInitials(form.name) : '—'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="logo" className="text-sm font-medium">Logo / Avatar</Label>
                <div className="mt-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary hover:text-brand-hover">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Uploading…' : 'Upload image'}
                    <input
                      id="logo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={uploading}
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) handleLogoUpload(f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP · max 2MB</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">Client Name *</Label>
                <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} className={fieldClass('name')} maxLength={100} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="niche">Niche *</Label>
                <select
                  id="niche"
                  value={form.niche}
                  onChange={e => set('niche', e.target.value)}
                  className={cn('flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm', fieldClass('niche'))}
                >
                  {CLIENT_NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="package_tier">Package Tier *</Label>
                <select
                  id="package_tier"
                  value={form.package_tier}
                  onChange={e => set('package_tier', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                >
                  {PACKAGE_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact_name">Contact Person *</Label>
                <Input id="contact_name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={fieldClass('contact_name')} />
                {errors.contact_name && <p className="text-xs text-destructive">{errors.contact_name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input id="contact_email" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} className={fieldClass('contact_email')} />
                {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input id="contact_phone" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} maxLength={20} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="retainer_amount">Retainer (₹/mo) *</Label>
                <Input id="retainer_amount" type="number" min={1} step={1} value={form.retainer_amount} onChange={e => set('retainer_amount', e.target.value)} className={fieldClass('retainer_amount')} />
                {errors.retainer_amount && <p className="text-xs text-destructive">{errors.retainer_amount}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
                >
                  {CLIENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contract_start_date">Contract Start *</Label>
                <Input id="contract_start_date" type="date" value={form.contract_start_date} onChange={e => set('contract_start_date', e.target.value)} className={fieldClass('contract_start_date')} />
                {errors.contract_start_date && <p className="text-xs text-destructive">{errors.contract_start_date}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contract_end_date">Contract End</Label>
                <Input id="contract_end_date" type="date" value={form.contract_end_date} onChange={e => set('contract_end_date', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="min_contract_months">Min Contract (mo)</Label>
                <Input id="min_contract_months" type="number" min={1} step={1} value={form.min_contract_months} onChange={e => set('min_contract_months', e.target.value)} />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="youtube_url">YouTube Channel URL</Label>
                <Input id="youtube_url" type="url" placeholder="https://youtube.com/..." value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} className={fieldClass('youtube_url')} />
                {errors.youtube_url && <p className="text-xs text-destructive">{errors.youtube_url}</p>}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={e => set('notes', e.target.value)} maxLength={1000} rows={3} className={fieldClass('notes')} />
                <p className="text-xs text-muted-foreground text-right">{form.notes.length}/1000</p>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Client'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
