// Centralized number formatting — use these everywhere, never format inline

/** Integer with commas: 6841 → "6,841" */
export function fmtCount(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  return Math.round(n).toLocaleString()
}

/** Already-percentage (0–100 scale): 60.3 → "60.3%" */
export function fmtPct(n: number | null | undefined, dec = 1): string {
  if (n == null || !isFinite(n)) return '—'
  return `${n.toFixed(dec)}%`
}

/** 0–1 ratio as percentage: 0.603 → "60.3%" */
export function fmtRate(n: number | null | undefined, dec = 1): string {
  if (n == null || !isFinite(n)) return '—'
  return `${(n * 100).toFixed(dec)}%`
}

/** Fixed decimal places: 52.3456789 → "52.35" */
export function fmtDecimal(n: number | null | undefined, dec = 2): string {
  if (n == null || !isFinite(n)) return '—'
  return n.toFixed(dec)
}

/** Compact large numbers: 94293 → "94.3K", 1234567 → "1.2M" */
export function fmtCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n))
}

/** Truncate long strings for display */
export function fmtTruncate(s: string | null | undefined, max = 22): string {
  if (!s) return '—'
  return s.length > max ? `${s.slice(0, max)}…` : s
}
