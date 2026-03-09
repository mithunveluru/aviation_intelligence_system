import { useState } from 'react'
import {
  Table2, Search, ChevronUp, ChevronDown,
  ChevronsUpDown, AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard   from '../components/ui/GlassCard'
import Badge       from '../components/ui/Badge'
import PageHeader  from '../components/ui/PageHeader'
import { useIncidents } from '../hooks/useAnalysis'
import clsx from 'clsx'

// Types
type SortKey = 'date' | 'operator' | 'aircraft' | 'location' | 'severity' | 'fatalities' | 'aboard'
type SortDir = 'asc' | 'desc'

// IncidentRow shape matches API response fields
interface IncidentRow {
  id:                    number
  date:                  string
  operator:              string
  aircraft:              string
  location:              string
  fatalities:            number
  aboard:                number
  severity:              string
  summary:               string
  cluster:               number
  predictedSeverity:     string
  predictionConfidence:  number
  extractedCauseCategory: string
  extractedPhaseOfFlight: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SEVERITIES = ['All', 'Fatal', 'Severe', 'Moderate', 'Minor']
const DECADES    = ['All', '1960s', '1970s', '1980s', '1990s', '2000s']
const PAGE_SIZE  = 12

const COLS: { key: SortKey; label: string; width: string }[] = [
  { key: 'date',       label: 'Date',       width: 'w-24' },
  { key: 'operator',   label: 'Operator',   width: 'w-44' },
  { key: 'aircraft',   label: 'Aircraft',   width: 'w-44' },
  { key: 'location',   label: 'Location',   width: 'w-40' },
  { key: 'severity',   label: 'Severity',   width: 'w-24' },
  { key: 'fatalities', label: 'Fatalities', width: 'w-24' },
  { key: 'aboard',     label: 'Aboard',     width: 'w-20' },
]

// ─── Sort Icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey)
    return <ChevronsUpDown size={11} className="opacity-30 ml-1 inline" />
  return dir === 'asc'
    ? <ChevronUp   size={11} className="text-cyan-400 ml-1 inline" />
    : <ChevronDown size={11} className="text-cyan-400 ml-1 inline" />
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-14 rounded-xl bg-white/5" />
      <div className="rounded-xl bg-white/5 overflow-hidden">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div key={i} className="h-12 border-b border-white/[0.04] bg-white/[0.02]" />
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Incidents() {
  const [q,       setQ]       = useState('')
  const [sev,     setSev]     = useState('All')
  const [decade,  setDecade]  = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page,    setPage]    = useState(1)

  // Pass all filter state to hook — server handles filter/sort/paginate
  const { data, isLoading, isError } = useIncidents({
    page,
    pageSize: PAGE_SIZE,
    severity: sev,
    decade,
    search:   q,
    sortKey,
    sortDir,
  })

  // All pagination/count values come from API response
  const pageData   = (data?.incidents ?? []) as IncidentRow[]
  const totalPages = data?.totalPages ?? 1
  const totalCount = data?.total      ?? 0

  // ─── Sort toggle — resets to page 1 ─────────────────────────────────────────
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  // ─── Filter change helpers ────────────────────────────────────────────────
  const handleSearch  = (v: string) => { setQ(v);      setPage(1) }
  const handleSev     = (v: string) => { setSev(v);    setPage(1) }
  const handleDecade  = (v: string) => { setDecade(v); setPage(1) }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        icon={Table2}
        title="Incident Records"
        subtitle="Searchable and filterable aviation incident database"
      />

      {/* Filters */}
      <GlassCard delay={0.05} className="p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search operator, aircraft, location…"
              value={q}
              onChange={e => handleSearch(e.target.value)}
              aria-label="Search incidents"
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm
                         bg-white/[0.04] border border-white/[0.08]
                         text-slate-300 placeholder-slate-600
                         focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06]
                         transition-colors"
            />
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1">
            {SEVERITIES.map(s => (
              <button
                key={s}
                onClick={() => handleSev(s)}
                aria-pressed={sev === s}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
                  sev === s
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/[0.06]',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Decade filter */}
          <select
            value={decade}
            onChange={e => handleDecade(e.target.value)}
            aria-label="Filter by decade"
            className="px-3 py-2 rounded-lg text-xs bg-white/[0.04]
                       border border-white/[0.08] text-slate-400
                       focus:outline-none focus:border-cyan-500/50
                       transition-colors"
          >
            {DECADES.map(d => (
              <option key={d} value={d}>{d === 'All' ? 'All decades' : d}</option>
            ))}
          </select>

          {/* Result count from API total */}
          <span className="text-xs text-slate-600 ml-auto">
            {isLoading ? '…' : totalCount.toLocaleString()} results
          </span>
        </div>
      </GlassCard>

      {/* Loading and error states */}
      {isLoading && <LoadingSkeleton />}

      {isError && (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertTriangle className="text-red-400" size={32} />
          <p className="text-slate-400 text-sm">
            Failed to load incidents. Is the backend running on{' '}
            <code className="text-cyan-400">localhost:8000</code>?
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg hover:bg-cyan-400/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table — only render when data available */}
      {!isLoading && !isError && (
        <GlassCard delay={0.1} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="grid" aria-label="Incident records">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {COLS.map(c => (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className={clsx(
                        'px-4 py-3 text-left font-medium text-slate-500',
                        'hover:text-slate-300 cursor-pointer select-none transition-colors',
                        c.width,
                      )}
                      aria-sort={
                        sortKey === c.key
                          ? sortDir === 'asc' ? 'ascending' : 'descending'
                          : 'none'
                      }
                    >
                      {c.label}
                      <SortIcon col={c.key} sortKey={sortKey} dir={sortDir} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-slate-500 min-w-[160px]">
                    Summary
                  </th>
                </tr>
              </thead>

              <tbody>
                <AnimatePresence mode="wait">
                  {pageData.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.2 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-400 tabular-nums">{row.date}</td>
                      <td className="px-4 py-3 text-slate-300 font-medium">{row.operator}</td>
                      <td className="px-4 py-3 text-slate-400">{row.aircraft}</td>
                      <td className="px-4 py-3 text-slate-400">{row.location}</td>
                      <td className="px-4 py-3"><Badge label={row.severity} /></td>
                      <td className="px-4 py-3 text-slate-400 tabular-nums text-right pr-6">
                        {row.fatalities === 0
                          ? <span className="text-emerald-500">0</span>
                          : <span className="text-red-400">{row.fatalities.toLocaleString()}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-400 tabular-nums">{row.aboard}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                        <p className="line-clamp-2 leading-relaxed">{row.summary}</p>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {pageData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-600">
                      No incidents match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination — ✅ totalPages from API */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3
                            border-t border-white/[0.06] text-xs text-slate-500">
              <span>
                Page {page} of {totalPages} · {totalCount.toLocaleString()} total
              </span>
              <div className="flex gap-1">
                {/* Smart pagination: show at most 7 buttons */}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  // If totalPages ≤ 7 just show all; otherwise show window around current page
                  const p = totalPages <= 7
                    ? i + 1
                    : Math.min(
                        Math.max(page - 3, 1) + i,
                        totalPages
                      )
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      aria-current={page === p ? 'page' : undefined}
                      className={clsx(
                        'w-7 h-7 rounded-md font-medium transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
                        page === p
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]',
                      )}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
