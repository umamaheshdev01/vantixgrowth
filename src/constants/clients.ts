export const CLIENT_NICHES = [
  'Finance',
  'Education',
  'Fintech',
  'SaaS',
  'Personal Brand',
  'Other',
] as const

export const CLIENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
] as const

export const CLIENT_STATUSES_FILTER = [
  ...CLIENT_STATUSES,
  { value: 'archived', label: 'Archived' },
] as const

export const PACKAGE_TIERS = [
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'premium', label: 'Premium' },
] as const

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
  cash: 'Cash',
  other: 'Other',
}

export const FINANCE_CATEGORY_LABELS: Record<string, string> = {
  client_retainer: 'Client Retainer',
  other_income: 'Other Income',
}
