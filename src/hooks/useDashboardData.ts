'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { REFRESH } from '@/lib/swr'

export interface DashboardClient {
  id: string
  name: string
  status: string
  retainer_amount: number
  logo_url: string | null
  contract_end_date: string | null
}

export interface AllClient {
  id: string
  name: string
  retainer_amount: number
  status: string
  contract_start_date: string | null
}

export interface DashboardVideo {
  id: string
  title: string
  client_id: string
  status: string
  due_date: string | null
  assigned_editor_id: string | null
  created_at: string
}

export interface FinanceEntry {
  id: string
  date: string
  type: 'income' | 'expense'
  amount: number
}

export interface RecentFinanceEntry {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  created_at: string
}

export interface Employee {
  id: string
  user_id: string
  users: { id: string; name: string } | null
}

interface DashboardData {
  clients: DashboardClient[]
  allClients: AllClient[]
  allVideos: DashboardVideo[]
  financeThisMonth: FinanceEntry[]
  financeLastMonth: FinanceEntry[]
  recentFinance: RecentFinanceEntry[]
  employees: Employee[]
  loading: boolean
  error: string | null
}

const initialState: DashboardData = {
  clients: [],
  allClients: [],
  allVideos: [],
  financeThisMonth: [],
  financeLastMonth: [],
  recentFinance: [],
  employees: [],
  loading: true,
  error: null,
}

type DashboardPayload = Omit<DashboardData, 'loading' | 'error'>

async function fetchDashboard(): Promise<DashboardPayload> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [
    clientsRes,
    allClientsRes,
    videosRes,
    financeCurrentRes,
    financeLastRes,
    recentFinanceRes,
    employeesRes,
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, status, retainer_amount, logo_url, contract_end_date')
      .in('status', ['active', 'on_hold', 'upcoming']),

    supabase
      .from('clients')
      .select('id, name, retainer_amount, status, contract_start_date'),

    supabase
      .from('videos')
      .select('id, title, client_id, status, due_date, assigned_editor_id, created_at'),

    supabase
      .from('finance_entries')
      .select('id, date, type, amount')
      .gte('date', monthStart)
      .lte('date', monthEnd),

    supabase
      .from('finance_entries')
      .select('id, date, type, amount')
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd),

    supabase
      .from('finance_entries')
      .select('id, date, type, category, amount, description, created_at')
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('employees')
      .select('id, user_id, users(id, name)'),
  ])

  // Surface the first query error so SWR routes it to its `error` slot.
  const firstError = [
    clientsRes, allClientsRes, videosRes,
    financeCurrentRes, financeLastRes, recentFinanceRes, employeesRes,
  ].find((r) => r.error)?.error

  if (firstError) throw new Error(firstError.message)

  return {
    clients: (clientsRes.data ?? []) as DashboardClient[],
    allClients: (allClientsRes.data ?? []) as AllClient[],
    allVideos: (videosRes.data ?? []) as DashboardVideo[],
    financeThisMonth: (financeCurrentRes.data ?? []) as FinanceEntry[],
    financeLastMonth: (financeLastRes.data ?? []) as FinanceEntry[],
    recentFinance: (recentFinanceRes.data ?? []) as RecentFinanceEntry[],
    employees: (employeesRes.data ?? []) as unknown as Employee[],
  }
}

export function useDashboardData(): DashboardData {
  // Dashboard aggregates change as others edit, so it polls on a timer.
  const { data, error, isLoading } = useSWR('dashboard:data', fetchDashboard, {
    refreshInterval: REFRESH.DASHBOARD,
  })

  if (!data) {
    return { ...initialState, loading: isLoading, error: error ? error.message : null }
  }

  return {
    ...data,
    loading: false,
    error: error ? error.message : null,
  }
}
