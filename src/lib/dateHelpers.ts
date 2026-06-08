const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse a YYYY-MM-DD string in local time (avoids UTC offset issues with date-only strings)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(dateStr: string, format: 'DD Mon YYYY' | 'DD Mon' = 'DD Mon YYYY'): string {
  const d = parseLocalDate(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = MONTHS[d.getMonth()]
  if (format === 'DD Mon') return `${day} ${mon}`
  return `${day} ${mon} ${d.getFullYear()}`
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = parseLocalDate(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function getMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

export function getPreviousMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1).toISOString().split('T')[0]
  const end = new Date(date.getFullYear(), date.getMonth(), 0).toISOString().split('T')[0]
  return { start, end }
}

export function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = MONTHS[d.getMonth()]
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${mon} ${year}, ${hours}:${mins}`
}

export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value.split('T')[0]
  return value.toISOString().split('T')[0]
}
