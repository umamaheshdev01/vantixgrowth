'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, IndianRupee, Printer } from 'lucide-react'
import DetailPageHeader from '@/components/shared/DetailPageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/formatCurrency'
import { getMonthRange, getPreviousMonthRange } from '@/lib/dateHelpers'
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '@/lib/financeCategories'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawEntry {
  type: 'income' | 'expense'
  category: string
  amount: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumByCategory(entries: RawEntry[], type: 'income' | 'expense', category: string): number {
  return entries.filter(e => e.type === type && e.category === category).reduce((s, e) => s + e.amount, 0)
}

function calcChange(curr: number, prev: number): { amount: number; pct: number | null } {
  return {
    amount: curr - prev,
    pct: prev > 0 ? ((curr - prev) / prev) * 100 : null,
  }
}

function ChangeCell({ curr, prev }: { curr: number; prev: number }) {
  if (curr === 0 && prev === 0) return <span className="text-muted-foreground text-sm">—</span>
  const { amount, pct } = calcChange(curr, prev)
  if (prev === 0) return <span className="text-muted-foreground text-sm">—</span>
  if (amount === 0) return <span className="text-muted-foreground text-sm">—</span>
  const pos = amount > 0
  const sign = pos ? '+' : '−'
  const color = pos ? '#15803D' : '#DC2626'
  return (
    <span className="text-sm font-medium" style={{ color }}>
      {sign}{formatINR(Math.abs(amount))}
      {pct !== null && <span className="ml-1 text-xs">({sign}{Math.abs(pct).toFixed(1)}%)</span>}
    </span>
  )
}

function ReportRow({
  label,
  curr,
  prev,
  bold,
  labelColor,
}: {
  label: string
  curr: number
  prev: number
  bold?: boolean
  labelColor?: string
}) {
  return (
    <tr
      className={bold ? 'border-t border-border' : ''}
      style={bold ? { backgroundColor: 'rgba(255,255,255,0.03)' } : undefined}
    >
      <td
        className={`py-2.5 pr-4 text-sm ${bold ? 'font-semibold' : 'font-normal'}`}
        style={{ color: labelColor ?? (bold ? 'var(--foreground)' : 'var(--muted-foreground)') }}
      >
        {label}
      </td>
      <td className={`py-2.5 pr-4 text-sm text-right ${bold ? 'font-semibold' : ''} whitespace-nowrap`}>
        {curr > 0 || bold ? formatINR(curr) : '—'}
      </td>
      <td className={`py-2.5 pr-4 text-sm text-right ${bold ? 'font-semibold' : ''} text-muted-foreground whitespace-nowrap`}>
        {prev > 0 || bold ? formatINR(prev) : '—'}
      </td>
      <td className="py-2.5 text-right">
        {bold ? (
          <ChangeCell curr={curr} prev={prev} />
        ) : curr === 0 && prev === 0 ? (
          <span className="text-muted-foreground text-sm">—</span>
        ) : (
          <ChangeCell curr={curr} prev={prev} />
        )}
      </td>
    </tr>
  )
}

function HBarChart({
  title,
  items,
  total,
  color,
}: {
  title: string
  items: { label: string; amount: number }[]
  total: number
  color: string
}) {
  const filtered = items.filter(i => i.amount > 0)
  if (filtered.length === 0) return null

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="space-y-2">
        {filtered.map(item => {
          const pct = total > 0 ? (item.amount / total) * 100 : 0
          return (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-[130px] shrink-0 truncate">{item.label}</span>
              <div className="flex-1 bg-muted rounded" style={{ height: 20 }}>
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(pct, 1)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-foreground w-[90px] text-right shrink-0 whitespace-nowrap">
                {formatINR(item.amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinanceReportView() {
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

  const [entries, setEntries] = useState<RawEntry[]>([])
  const [prevEntries, setPrevEntries] = useState<RawEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getMonthRange(selectedMonth)
    const prev = getPreviousMonthRange(selectedMonth)

    const [cur, pre] = await Promise.all([
      supabase
        .from('finance_entries')
        .select('type, category, amount')
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('finance_entries')
        .select('type, category, amount')
        .gte('date', prev.start)
        .lte('date', prev.end),
    ])

    setEntries((cur.data as RawEntry[]) ?? [])
    setPrevEntries((pre.data as RawEntry[]) ?? [])
    setLoading(false)
  }, [selectedMonth])

  useEffect(() => { fetchData() }, [fetchData])

  const prevMonthLabel = useMemo(() => {
    const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    return `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`
  }, [selectedMonth])

  const monthLabel = `${MONTH_SHORT[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`
  const monthFull  = `${MONTH_FULL[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`

  const prevMonth = () =>
    setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const nextMonth = () => {
    if (!isCurrentMonth)
      setSelectedMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }

  // ─── Calculated data ──────────────────────────────────────────────────────

  const { incomeRows, expenseRows, totals } = useMemo(() => {
    const incomeRows = INCOME_CATEGORIES.map(c => ({
      value: c.value,
      label: c.label,
      curr: sumByCategory(entries, 'income', c.value),
      prev: sumByCategory(prevEntries, 'income', c.value),
    })).filter(r => r.curr > 0 || r.prev > 0)

    const expenseRows = EXPENSE_CATEGORIES.map(c => ({
      value: c.value,
      label: c.label,
      curr: sumByCategory(entries, 'expense', c.value),
      prev: sumByCategory(prevEntries, 'expense', c.value),
    })).filter(r => r.curr > 0 || r.prev > 0)

    const totalIncome    = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const totalExpense   = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    const prevTotalInc   = prevEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
    const prevTotalExp   = prevEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
    const netProfit      = totalIncome - totalExpense
    const prevNet        = prevTotalInc - prevTotalExp
    const margin         = totalIncome > 0 ? (netProfit / totalIncome) * 100 : null

    return {
      incomeRows,
      expenseRows,
      totals: {
        income: totalIncome,
        expense: totalExpense,
        prevIncome: prevTotalInc,
        prevExpense: prevTotalExp,
        net: netProfit,
        prevNet,
        margin,
      },
    }
  }, [entries, prevEntries])

  const printedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, aside, [data-sidebar], .no-print { display: none !important; }
          .print-full { width: 100% !important; max-width: 100% !important; }
          .print-timestamp::after { content: "Printed: ${printedDate}"; display: block; margin-top: 32px; font-size: 11px; color: #6B7280; }
          * { box-shadow: none !important; }
        }
      `}</style>

      <div className="space-y-6 animate-in">
        <div className="flex items-start justify-between gap-4 flex-wrap no-print">
          <DetailPageHeader
            backHref="/finance"
            backLabel="Finance"
            title="Monthly P&L Report"
            description="Profit and loss breakdown by month."
            icon={IndianRupee}
          />
          <Button
            variant="outline"
            size="sm"
            className="no-print shrink-0 mt-1"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-3 no-print">
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

        {/* Report Card */}
        <Card className="print-full">
          <CardContent className="p-6 space-y-8 print-timestamp">
            {/* Report header */}
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">VantixGrowth — Monthly P&amp;L Report</h2>
              <p className="text-sm text-muted-foreground">{monthFull}</p>
              <div className="border-t border-border mt-3" />
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Income Section */}
                <section>
                  <h3 className="text-base font-semibold mb-3" style={{ color: '#15803D' }}>Income</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                          <th className="py-2 pr-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">This Month</th>
                          <th className="py-2 pr-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{prevMonthLabel}</th>
                          <th className="py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incomeRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-sm text-muted-foreground italic">No income entries for this period.</td>
                          </tr>
                        ) : (
                          incomeRows.map(r => (
                            <ReportRow key={r.value} label={r.label} curr={r.curr} prev={r.prev} />
                          ))
                        )}
                        <ReportRow
                          label="Total Income"
                          curr={totals.income}
                          prev={totals.prevIncome}
                          bold
                          labelColor="#15803D"
                        />
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Expense Section */}
                <section>
                  <h3 className="text-base font-semibold mb-3" style={{ color: '#DC2626' }}>Expenses</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-2 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                          <th className="py-2 pr-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">This Month</th>
                          <th className="py-2 pr-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">{prevMonthLabel}</th>
                          <th className="py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-sm text-muted-foreground italic">No expense entries for this period.</td>
                          </tr>
                        ) : (
                          expenseRows.map(r => (
                            <ReportRow key={r.value} label={r.label} curr={r.curr} prev={r.prev} />
                          ))
                        )}
                        <ReportRow
                          label="Total Expenses"
                          curr={totals.expense}
                          prev={totals.prevExpense}
                          bold
                          labelColor="#DC2626"
                        />
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Summary Box */}
                <section
                  className="rounded-lg p-4 space-y-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {/* Net Profit */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Net Profit</span>
                    <span
                      className="text-base font-bold"
                      style={{ color: totals.net >= 0 ? '#15803D' : '#DC2626' }}
                    >
                      {totals.net < 0 ? '−' : ''}{formatINR(Math.abs(totals.net))}
                    </span>
                  </div>

                  {/* Profit Margin */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Profit Margin</span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: totals.net >= 0 ? '#15803D' : '#DC2626' }}
                    >
                      {totals.margin !== null ? `${totals.margin.toFixed(1)}%` : '—'}
                    </span>
                  </div>

                  {/* vs Previous Month */}
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-sm font-semibold text-foreground">vs {prevMonthLabel} Profit</span>
                    <span>
                      {prevEntries.length === 0 ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <ChangeCell curr={totals.net} prev={totals.prevNet} />
                      )}
                    </span>
                  </div>
                </section>

                {/* Breakdown Charts */}
                {(incomeRows.some(r => r.curr > 0) || expenseRows.some(r => r.curr > 0)) && (
                  <section className="space-y-6">
                    <h3 className="text-sm font-semibold text-foreground">Category Breakdown — {monthFull}</h3>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <HBarChart
                        title="Income Breakdown"
                        items={incomeRows.map(r => ({ label: r.label, amount: r.curr }))}
                        total={totals.income}
                        color="#1A56DB"
                      />
                      <HBarChart
                        title="Expense Breakdown"
                        items={expenseRows.map(r => ({ label: r.label, amount: r.curr }))}
                        total={totals.expense}
                        color="#DC2626"
                      />
                    </div>
                  </section>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
