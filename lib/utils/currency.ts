export function formatCurrency(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount) : (amount ?? 0)
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value as number) ? (value as number) : 0)
  } catch {
    // Fallback
    return `GH₵ ${(Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}
