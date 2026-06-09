'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import PageShell from '@/components/shared/PageShell'
import EmptyState from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetCloseButton,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { invalidate } from '@/lib/swr'
import { formatINR } from '@/lib/formatCurrency'
import { formatDate, getMonthRange, getPreviousMonthRange } from '@/lib/dateHelpers'
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  getCategoryLabel,
  getPaymentMethodLabel,
} from '@/lib/financeCategories'
import { useToast } from '@/hooks/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceEntry {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  payment_method: string
  client_id: string | null
  employee_id: string | null
  receipt_url: string | null
  notes: string | null
  created_at: string
  clients: { id: string; name: string } | null
  employees: { id: string; user_id: string; users: { name: string } } | null
}

interface DropdownClient { id: string; name: string; status?: string }
interface DropdownEmployee { id: string; user_id: string; users: { name: string }; status?: string }

interface FormValues {
  date: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: string
  payment_method: string
  client_id: string
  employee_id: string
  notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi',           label: 'UPI' },
  { value: 'cash',          label: 'Cash' },
  { value: 'other',         label: 'Other' },
]

const PAYROLL_CATS = new Set(['salary_fulltime', 'freelancer_payment'])

function toToday(): string {
  return new Date().toISOString().split('T')[0]
}

function emptyForm(): FormValues {
  return {
    date: toToday(),
    type: 'income',
    category: '',
    description: '',
    amount: '',
    payment_method: 'bank_transfer',
    client_id: '',
    employee_id: '',
    notes: '',
  }
}

function entryToForm(e: FinanceEntry): FormValues {
  return {
    date: e.date,
    type: e.type,
    category: e.category,
    description: e.description,
    amount: String(e.amount),
    payment_method: e.payment_method,
    client_id: e.client_id ?? '',
    employee_id: e.employee_id ?? '',
    notes: e.notes ?? '',
  }
}

// ─── Overview Metric Box ─────────────────────────────────────────────────────

function MetricBox({
  label,
  value,
  color,
  trend,
  loading,
}: {
  label: string
  value: string
  color: string
  trend: string | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex-1 min-w-[140px] rounded-xl border border-border bg-card p-4 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-[140px] rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold tracking-tight" style={{ color }}>{value}</p>
      {trend !== null && (
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      )}
    </div>
  )
}

// ─── Finance Entry Drawer ─────────────────────────────────────────────────────

function FinanceEntryDrawer({
  open,
  onOpenChange,
  entry,
  clients,
  employees,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  entry: FinanceEntry | null
  clients: DropdownClient[]
  employees: DropdownEmployee[]
  onSaved: () => void
}) {
  const { toast } = useToast()
  const isEdit = Boolean(entry)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ defaultValues: emptyForm() })

  const [saving, setSaving] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState('')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const initialRef = useRef('')

  const watchedType = watch('type')
  const watchedCategory = watch('category')

  const categories = watchedType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const clientRequired = watchedCategory === 'client_retainer'
  const employeeRequired = PAYROLL_CATS.has(watchedCategory)

  useEffect(() => {
    if (open) {
      const defaults = entry ? entryToForm(entry) : emptyForm()
      reset(defaults)
      initialRef.current = JSON.stringify(defaults)
      setReceiptFile(null)
      setReceiptError('')
      setUploadProgress(null)
    }
  }, [open, entry, reset])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Reset category when type changes
  const handleTypeChange = (type: 'income' | 'expense') => {
    setValue('type', type, { shouldDirty: true })
    setValue('category', '')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setReceiptError('')
    if (!file) { setReceiptFile(null); return }
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(file.type)) {
      setReceiptError('Only PDF, PNG, and JPG files are accepted.')
      setReceiptFile(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setReceiptError('File must be under 5MB.')
      setReceiptFile(null)
      return
    }
    setReceiptFile(file)
  }

  const sanitiseFilename = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._-]/g, '')

  const uploadReceipt = async (entryId: string, file: File): Promise<string> => {
    const path = `finance/${entryId}/${Date.now()}_${sanitiseFilename(file.name)}`
    setUploadProgress(0)
    const { data, error } = await supabase.storage.from('receipts').upload(path, file, {
      upsert: false,
      contentType: file.type,
    })
    setUploadProgress(100)
    if (error) throw new Error(error.message)
    const { data: pub } = supabase.storage.from('receipts').getPublicUrl(data.path)
    return pub.publicUrl
  }

  const onSubmit = async (values: FormValues) => {
    setSaving(true)
    try {
      const amount = Math.round(Number(values.amount))
      let receiptUrl: string | null = entry?.receipt_url ?? null

      if (!isEdit) {
        // Create first to get id, then upload if needed
        const payload = {
          date: values.date,
          type: values.type,
          category: values.category,
          description: values.description.trim(),
          amount,
          payment_method: values.payment_method,
          client_id: values.client_id || null,
          employee_id: values.employee_id || null,
          notes: values.notes.trim() || null,
          receipt_url: null as string | null,
        }
        const { data: created, error: createErr } = await supabase
          .from('finance_entries')
          .insert(payload)
          .select('id')
          .single()
        if (createErr) throw createErr

        if (receiptFile) {
          receiptUrl = await uploadReceipt(created.id, receiptFile)
          await supabase.from('finance_entries').update({ receipt_url: receiptUrl }).eq('id', created.id)
        }
      } else {
        if (receiptFile) {
          receiptUrl = await uploadReceipt(entry!.id, receiptFile)
        }
        const { error: updateErr } = await supabase
          .from('finance_entries')
          .update({
            date: values.date,
            type: values.type,
            category: values.category,
            description: values.description.trim(),
            amount,
            payment_method: values.payment_method,
            client_id: values.client_id || null,
            employee_id: values.employee_id || null,
            notes: values.notes.trim() || null,
            receipt_url: receiptUrl,
          })
          .eq('id', entry!.id)
        if (updateErr) throw updateErr
      }

      toast({ variant: 'success', title: isEdit ? 'Entry updated' : 'Entry added' })
      onOpenChange(false)
      onSaved()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      toast({ variant: 'destructive', title: 'Save failed', description: msg })
    } finally {
      setSaving(false)
      setUploadProgress(null)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && isDirty) {
      if (!confirm('You have unsaved changes. Close anyway?')) return
    }
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto p-0 sm:max-w-[480px]">
        <SheetCloseButton />
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{isEdit ? 'Edit Entry' : 'Add Finance Entry'}</SheetTitle>
            <SheetDescription>
              {isEdit ? 'Update this finance entry.' : 'Record a new income or expense.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 px-6 py-5">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-date">Date *</Label>
              <Input
                id="fin-date"
                type="date"
                className={errors.date ? 'border-destructive' : ''}
                {...register('date', { required: 'Date is required' })}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>

            {/* Type toggle */}
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <div className="flex rounded-md border border-input overflow-hidden">
                {(['income', 'expense'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className="flex-1 py-2 text-sm font-medium transition-colors"
                    style={
                      watchedType === t
                        ? {
                            backgroundColor: t === 'income' ? 'rgba(21,128,61,0.15)' : 'rgba(220,38,38,0.15)',
                            color: t === 'income' ? '#15803D' : '#DC2626',
                          }
                        : { color: 'var(--muted-foreground)' }
                    }
                  >
                    {t === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-category">Category *</Label>
              <select
                id="fin-category"
                className={`flex h-10 w-full rounded-md border ${errors.category ? 'border-destructive' : 'border-input'} bg-background/50 px-3 text-sm`}
                {...register('category', { required: 'Category is required' })}
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-desc">Description *</Label>
              <Input
                id="fin-desc"
                maxLength={200}
                className={errors.description ? 'border-destructive' : ''}
                {...register('description', {
                  required: 'Description is required',
                  maxLength: { value: 200, message: 'Max 200 characters' },
                })}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-amount">Amount (₹) *</Label>
              <Input
                id="fin-amount"
                type="number"
                min="1"
                step="1"
                placeholder="0"
                className={errors.amount ? 'border-destructive' : ''}
                {...register('amount', {
                  required: 'Amount is required',
                  validate: v => {
                    const n = Math.round(Number(v))
                    if (isNaN(n) || n <= 0) return 'Amount must be a positive number'
                    return true
                  },
                  onBlur: e => {
                    const rounded = Math.round(Number(e.target.value))
                    if (!isNaN(rounded) && rounded > 0) {
                      setValue('amount', String(rounded))
                    }
                  },
                })}
              />
              <p className="text-xs text-muted-foreground">Enter amount in rupees. Decimals will be rounded.</p>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-payment">Payment Method *</Label>
              <select
                id="fin-payment"
                className={`flex h-10 w-full rounded-md border ${errors.payment_method ? 'border-destructive' : 'border-input'} bg-background/50 px-3 text-sm`}
                {...register('payment_method', { required: 'Payment method is required' })}
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {errors.payment_method && <p className="text-xs text-destructive">{errors.payment_method.message}</p>}
            </div>

            {/* Linked Client */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-client">
                Linked Client {clientRequired && <span className="text-destructive">*</span>}
              </Label>
              <select
                id="fin-client"
                className={`flex h-10 w-full rounded-md border ${errors.client_id ? 'border-destructive' : 'border-input'} bg-background/50 px-3 text-sm`}
                {...register('client_id', {
                  validate: v => {
                    if (clientRequired && !v) return 'Client is required for this category'
                    return true
                  },
                })}
              >
                <option value="">None</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
            </div>

            {/* Linked Employee */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-employee">
                Linked Employee {employeeRequired && <span className="text-destructive">*</span>}
              </Label>
              <select
                id="fin-employee"
                className={`flex h-10 w-full rounded-md border ${errors.employee_id ? 'border-destructive' : 'border-input'} bg-background/50 px-3 text-sm`}
                {...register('employee_id', {
                  validate: v => {
                    if (employeeRequired && !v) return 'Employee is required for this category'
                    return true
                  },
                })}
              >
                <option value="">None</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.users?.name ?? 'Unknown'}</option>
                ))}
              </select>
              {errors.employee_id && <p className="text-xs text-destructive">{errors.employee_id.message}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-notes">Notes</Label>
              <Textarea
                id="fin-notes"
                rows={3}
                maxLength={300}
                placeholder="Optional internal notes…"
                {...register('notes', { maxLength: { value: 300, message: 'Max 300 characters' } })}
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
            </div>

            {/* Receipt */}
            <div className="space-y-1.5">
              <Label htmlFor="fin-receipt">Receipt / Proof</Label>
              {entry?.receipt_url && !receiptFile && (
                <a
                  href={entry.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-1"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View current receipt
                </a>
              )}
              <input
                id="fin-receipt"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
              {receiptFile && (
                <p className="text-xs text-muted-foreground">Selected: {receiptFile.name}</p>
              )}
              {receiptError && (
                <p className="text-xs text-destructive">{receiptError}</p>
              )}
              {uploadProgress !== null && uploadProgress < 100 && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
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
            <Button type="submit" disabled={saving || Boolean(receiptError)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Entry'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinanceListView() {
  const router = useRouter()
  const { toast } = useToast()

  // Month state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const currentMonth = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }, [])

  const isCurrentMonth =
    selectedMonth.getFullYear() === currentMonth.getFullYear() &&
    selectedMonth.getMonth() === currentMonth.getMonth()


  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | 'income' | 'expense'>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')

  // Sort
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Drawer / delete
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinanceEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  // These reads hit Supabase directly (not the REST API), so they use custom
  // 'finance:' SWR keys; finance mutations invalidate that prefix.
  const monthKey = `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`
  const { data: entriesData, isLoading: loading } = useSWR(
    `finance:entries:${monthKey}`,
    async () => {
      const { start, end } = getMonthRange(selectedMonth)
      const prev = getPreviousMonthRange(selectedMonth)
      const [currentRes, prevRes] = await Promise.all([
        supabase
          .from('finance_entries')
          .select('*, clients(id, name), employees(id, user_id, users(name))')
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false }),
        supabase
          .from('finance_entries')
          .select('id, type, category, amount')
          .gte('date', prev.start)
          .lte('date', prev.end),
      ])
      return {
        entries: (currentRes.data as FinanceEntry[]) ?? [],
        prevEntries: (prevRes.data as FinanceEntry[]) ?? [],
      }
    },
  )
  const entries = entriesData?.entries ?? []
  const prevEntries = entriesData?.prevEntries ?? []

  const { data: dropdowns } = useSWR('finance:dropdowns', async () => {
    const [clientsRes, empsRes] = await Promise.all([
      supabase.from('clients').select('id, name, status'),
      supabase.from('employees').select('id, user_id, status, users(name)'),
    ])
    return {
      clients: (clientsRes.data as unknown as DropdownClient[]) ?? [],
      employees: (empsRes.data as unknown as DropdownEmployee[]) ?? [],
    }
  })
  const clients = dropdowns?.clients ?? []
  const employees = dropdowns?.employees ?? []
  const dropdownsLoaded = dropdowns !== undefined

  // ─── Overview metrics ─────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    const net = income - expense
    const margin = income > 0 ? (net / income) * 100 : null
    const clientRevenue = entries
      .filter(e => e.type === 'income' && e.category === 'client_retainer')
      .reduce((s, e) => s + e.amount, 0)
    const payroll = entries
      .filter(e => e.type === 'expense' && PAYROLL_CATS.has(e.category))
      .reduce((s, e) => s + e.amount, 0)

    const prevIncome = prevEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const prevExpense = prevEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    const prevNet = prevIncome - prevExpense

    const trendStr = (curr: number, prev: number) => {
      if (prev === 0) return '—'
      const pct = ((curr - prev) / prev) * 100
      const sign = pct >= 0 ? '+' : ''
      return `${sign}${pct.toFixed(1)}% vs last month`
    }

    return {
      income, expense, net, margin, clientRevenue, payroll,
      incomeTrend: trendStr(income, prevIncome),
      expenseTrend: trendStr(expense, prevExpense),
      netTrend: trendStr(net, prevNet),
    }
  }, [entries, prevEntries])

  // ─── Filtered + sorted entries ────────────────────────────────────────────

  const displayed = useMemo(() => {
    let list = [...entries]
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(e => e.description.toLowerCase().includes(q))
    if (typeFilter) list = list.filter(e => e.type === typeFilter)
    if (categoryFilter) list = list.filter(e => e.category === categoryFilter)
    if (clientFilter) list = list.filter(e => e.client_id === clientFilter)
    if (employeeFilter) list = list.filter(e => e.employee_id === employeeFilter)

    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortField === 'amount') cmp = a.amount - b.amount
      else if (sortField === 'description') cmp = a.description.localeCompare(b.description)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [entries, search, typeFilter, categoryFilter, clientFilter, employeeFilter, sortField, sortDir])

  const categoryOptions = useMemo(() => {
    if (typeFilter === 'income') return INCOME_CATEGORIES
    if (typeFilter === 'expense') return EXPENSE_CATEGORIES
    return [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
  }, [typeFilter])

  const hasFilters = search || typeFilter || categoryFilter || clientFilter || employeeFilter

  const clearFilters = () => {
    setSearch(''); setTypeFilter(''); setCategoryFilter(''); setClientFilter(''); setEmployeeFilter('')
  }

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('finance_entries').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message })
      return
    }
    toast({ variant: 'success', title: 'Entry deleted' })
    setDeleteTarget(null)
    invalidate('finance:', '/api/clients', '/api/employees', 'dashboard:')
  }

  // ─── Month navigation ─────────────────────────────────────────────────────

  const prevMonth = () =>
    setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const nextMonth = () => {
    if (!isCurrentMonth)
      setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  const monthLabel = `${MONTH_SHORT[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`

  return (
    <>
      <PageShell
        title="Finance"
        subtitle="Track all income and expenses."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/finance/report')}>
              View P&amp;L Report
            </Button>
            <Button size="sm" onClick={() => { setEditingEntry(null); setDrawerOpen(true) }}>
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Month Overview Panel */}
          <Card>
            <CardContent className="p-5 space-y-4">
              {/* Month selector */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-foreground w-24 text-center">{monthLabel}</span>
                <button
                  type="button"
                  onClick={nextMonth}
                  disabled={isCurrentMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Metrics */}
              <div className="flex flex-wrap gap-3">
                <MetricBox
                  label="Total Income"
                  value={formatINR(metrics.income)}
                  color="#15803D"
                  trend={metrics.incomeTrend}
                  loading={loading}
                />
                <MetricBox
                  label="Total Expenses"
                  value={formatINR(metrics.expense)}
                  color="#DC2626"
                  trend={metrics.expenseTrend}
                  loading={loading}
                />
                <MetricBox
                  label="Net Profit"
                  value={metrics.net < 0 ? `−${formatINR(Math.abs(metrics.net))}` : formatINR(metrics.net)}
                  color={metrics.net >= 0 ? '#15803D' : '#DC2626'}
                  trend={metrics.netTrend}
                  loading={loading}
                />
                <MetricBox
                  label="Profit Margin"
                  value={metrics.margin !== null ? `${metrics.margin.toFixed(1)}%` : '—'}
                  color={metrics.net >= 0 ? '#15803D' : '#DC2626'}
                  trend={null}
                  loading={loading}
                />
                <MetricBox
                  label="Client Revenue"
                  value={formatINR(metrics.clientRevenue)}
                  color="var(--foreground)"
                  trend={null}
                  loading={loading}
                />
                <MetricBox
                  label="Payroll Cost"
                  value={formatINR(metrics.payroll)}
                  color="var(--foreground)"
                  trend={null}
                  loading={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search descriptions…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {/* Type toggle */}
              <div className="flex rounded-md border border-input overflow-hidden text-sm">
                {(['', 'income', 'expense'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTypeFilter(t); setCategoryFilter('') }}
                    className="px-3 py-2 transition-colors"
                    style={
                      typeFilter === t
                        ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                        : { color: 'var(--muted-foreground)' }
                    }
                  >
                    {t === '' ? 'All' : t === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="">All Categories</option>
                {categoryOptions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={employeeFilter}
                onChange={e => setEmployeeFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.users?.name ?? 'Unknown'}</option>
                ))}
              </select>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : displayed.length === 0 ? (
                <EmptyState
                  icon={IndianRupee}
                  title="No finance entries for this month"
                  message="Add your first entry to start tracking income and expenses."
                  actionLabel={!hasFilters ? '+ Add Entry' : undefined}
                  onAction={!hasFilters ? () => { setEditingEntry(null); setDrawerOpen(true) } : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead
                          className="cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleSort('date')}
                        >
                          Date
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleSort('description')}
                        >
                          Description
                        </TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleSort('amount')}
                        >
                          Amount
                        </TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayed.map((entry, idx) => (
                        <TableRow key={entry.id} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                          <TableCell className="whitespace-nowrap" style={{ fontSize: 13, color: '#6B7280' }}>
                            {formatDate(entry.date, 'DD Mon YYYY')}
                          </TableCell>
                          <TableCell
                            className="max-w-[180px] truncate font-medium"
                            style={{ fontSize: 14 }}
                            title={entry.description}
                          >
                            {entry.description}
                          </TableCell>
                          <TableCell>
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                              style={
                                entry.type === 'income'
                                  ? { backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.3)' }
                                  : { backgroundColor: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }
                              }
                            >
                              {entry.type === 'income' ? 'Income' : 'Expense'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#D1D5DB', border: '1px solid rgba(255,255,255,0.12)' }}
                            >
                              {getCategoryLabel(entry.category)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.clients ? (
                              <button
                                type="button"
                                className="text-primary hover:underline text-sm"
                                onClick={() => router.push(`/clients/${entry.client_id}`)}
                              >
                                {entry.clients.name}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.employees?.users?.name ?? '—'}
                          </TableCell>
                          <TableCell
                            className="font-semibold whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: entry.type === 'income' ? '#15803D' : '#DC2626',
                            }}
                          >
                            {entry.type === 'expense' ? '−' : ''}{formatINR(entry.amount)}
                          </TableCell>
                          <TableCell style={{ fontSize: 13, color: '#6B7280' }}>
                            {getPaymentMethodLabel(entry.payment_method)}
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={e => e.stopPropagation()}
                            >
                              {entry.receipt_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title="View receipt"
                                  onClick={() => window.open(entry.receipt_url!, '_blank')}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title="Edit"
                                onClick={() => { setEditingEntry(entry); setDrawerOpen(true) }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Delete"
                                onClick={() => setDeleteTarget(entry)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {!loading && displayed.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {displayed.length} entr{displayed.length !== 1 ? 'ies' : 'y'}
              {hasFilters ? ' (filtered)' : ''}
            </p>
          )}
        </div>
      </PageShell>

      {/* Entry Drawer */}
      {dropdownsLoaded && (
        <FinanceEntryDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          entry={editingEntry}
          clients={clients}
          employees={employees}
          onSaved={() => invalidate('finance:', '/api/clients', '/api/employees', 'dashboard:')}
        />
      )}

      {/* Delete Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this finance entry?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.description}" — ${formatINR(deleteTarget.amount)}. This cannot be undone.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
