export type ClientStatus = 'active' | 'on_hold' | 'upcoming' | 'ended' | 'archived'
export type PackageTier = 'starter' | 'growth' | 'premium'

export interface ClientListItem {
  id: string
  name: string
  niche: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  retainer_amount: number
  package_tier: PackageTier
  status: ClientStatus
  contract_start_date: string
  contract_end_date: string | null
  min_contract_months: number | null
  youtube_url: string | null
  notes: string | null
  logo_url: string | null
  created_at: string
  videos_active: number
  next_due_date: string | null
}

export interface ClientDetail extends ClientListItem {
  updated_at: string
}

export interface ClientFormValues {
  name: string
  niche: string
  contact_name: string
  contact_email: string
  contact_phone: string
  retainer_amount: string
  package_tier: PackageTier
  status: Exclude<ClientStatus, 'archived'>
  contract_start_date: string
  contract_end_date: string
  min_contract_months: string
  youtube_url: string
  notes: string
  logo_url: string
}

export interface ClientVideo {
  id: string
  title: string
  video_type: string
  status: string
  due_date: string
  revision_count: number
  assigned_at: string | null
  created_at: string
  assigned_editor: { id: string; user: { name: string } } | null
}

export interface ClientFinanceEntry {
  id: string
  date: string
  type: string
  category: string
  description: string
  amount: number
  payment_method: string
}

export interface ClientFinanceResponse {
  entries: ClientFinanceEntry[]
  meta: { page: number; limit: number; total: number }
  total_received_lifetime: number
  total_received_this_month: number
}

export interface ActivityLogEntry {
  id: string
  action: string
  created_at: string
  user: { name: string; email: string }
}
