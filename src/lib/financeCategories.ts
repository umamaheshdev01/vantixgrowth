export const INCOME_CATEGORIES = [
  { value: 'client_retainer',  label: 'Client Retainer' },
  { value: 'one_time_payment', label: 'One-time Payment' },
  { value: 'bonus',            label: 'Bonus' },
  { value: 'other_income',     label: 'Other Income' },
]

export const EXPENSE_CATEGORIES = [
  { value: 'salary_fulltime',    label: 'Salary (Full-time)' },
  { value: 'freelancer_payment', label: 'Freelancer Payment' },
  { value: 'software_tools',     label: 'Software / Tools' },
  { value: 'storage_cloud',      label: 'Storage / Cloud' },
  { value: 'marketing',          label: 'Marketing' },
  { value: 'office_misc',        label: 'Office / Misc' },
  { value: 'tax_accounting',     label: 'Tax / Accounting' },
  { value: 'other_expense',      label: 'Other Expense' },
]

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

export function getCategoryLabel(value: string): string {
  return ALL_CATEGORIES.find(c => c.value === value)?.label ?? value
}

export function getPaymentMethodLabel(value: string): string {
  const map: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    upi:           'UPI',
    cash:          'Cash',
    other:         'Other',
  }
  return map[value] ?? value
}
