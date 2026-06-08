const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const NUM = new Intl.NumberFormat('en-IN')

export function formatINR(amount: number): string {
  return INR.format(amount)
}

export function formatNumber(num: number): string {
  return NUM.format(num)
}
