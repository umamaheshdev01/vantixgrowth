export function parsePagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20') || 20))
  return { page, limit, skip: (page - 1) * limit }
}

export function parseSort(
  url: URL,
  allowed: string[],
  defaultField = 'created_at',
  defaultOrder: 'asc' | 'desc' = 'desc',
): Record<string, 'asc' | 'desc'> {
  const field = url.searchParams.get('sort') ?? ''
  const order = url.searchParams.get('order') === 'asc' ? ('asc' as const) : ('desc' as const)
  return { [allowed.includes(field) ? field : defaultField]: order }
}
