import { useState } from 'react'
import {
  Table2, Search, ChevronUp, ChevronDown,
  ChevronsUpDown, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard   from '../components/ui/GlassCard'
import Badge       from '../components/ui/Badge'
import PageHeader  from '../components/ui/PageHeader'
import ErrorState  from '../components/ui/ErrorState'
import { useIncidents } from '../hooks/useAnalysis'
import { fmtCount } from '../utils/format'
import clsx from 'clsx'

type SortKey = 'date' | 'operator' | 'aircraft' | 'location' | 'severity' | 'fatalities' | 'aboard'
type SortDir = 'asc' | 'desc'

interface IncidentRow {
  id:                     number
  date:                   string
  operator:               string
  aircraft:               string
  location:               string
  fatalities:             number
  aboard:                 number
  severity:               string
  summary:                string
  cluster:                number
  predictedSeverity:      string
  predictionConfidence:   number
  extractedCauseCategory: string
  extractedPhaseOfFlight: string
}

const SEVERITIES = ['All', 'Fatal', 'Severe', 'Moderate', 'Minor']
const DECADES = [
  'All',
  '1910s','1920s','1930s','1940s','1950s',
  '1960s','1970s','1980s','1990s','2000s','2010s',
]
const PAGE_SIZE = 12

const COLS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'date',       label: 'Date'       },
  { key: 'operator',   label: 'Operator'   },
  { key: 'aircraft',   label: 'Aircraft'   },
  { key: 'location',   label: 'Location'   },
  { key: 'severity',   label: 'Severity'   },
  { key: 'fatalities', label: 'Fatalities', align: 'right' },
  { key: 'aboard',     label: 'Aboard',    align: 'right' },
]

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey)
    return <ChevronsUpDown size={10} className="opacity-25 ml-1 inline" />
  return dir === 'asc'
    ? <ChevronUp   size={10} className="text-cyan-400 ml-1 inline" />
    : <ChevronDown size={10} className="text-cyan-400 ml-1 inline" />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 rounded-xl skeleton" />
      <div className="rounded-xl overflow-hidden panel">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div key={i} className="h-11 border-b border-white/[0.04]">
            <div className="h-3 skeleton rounded mx-4 my-4 w-48" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Incident Detail Modal ────────────────────────────────────────────────────
function IncidentModal({ incident, onClose }: { incident: IncidentRow; onClose: () => void }) {
  const fields: [string, string | number][] = [
    ['Date',          incident.date || '—'],
    ['Operator',      incident.operator],
    ['Aircraft',      incident.aircraft],
    ['Location',      incident.location],
    ['Fatalities',    fmtCount(incident.fatalities)],
    ['Aboard',        fmtCount(incident.aboard)],
    ['Cluster',       incident.cluster >= 0 ? `Cluster ${incident.cluster}` : 'Noise'],
    ['Phase',         incident.extractedPhaseOfFlight || '—'],
    ['Cause',         incident.extractedCauseCategory || '—'],
  ]
  if (incident.predictedSeverity) {
    fields.push(['Pred. Severity', incident.predictedSeverity])
    fields.push(['Confidence', `${Math.round(incident.predictionConfidence * 100)}%`])
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(2,8,23,0.88)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18 }}
          className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[88vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Badge label={incident.severity} />
              <span className="text-[11px] text-slate-600">ID #{incident.id}</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-slate-600 hover:text-slate-300 transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
                         rounded p-0.5"
            >
              <X size={16} />
            </button>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 mb-5">
            {fields.map(([label, val]) => (
              <div key={label}>
                <p className="metric-label mb-0.5">{label}</p>
                <p className="text-sm text-slate-200 font-medium">{val}</p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <p className="metric-label mb-2">Incident Summary</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {incident.summary || 'No summary available.'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Incidents() {
  const [q,        setQ]        = useState('')
  const [sev,      setSev]      = useState('All')
  const [decade,   setDecade]   = useState('All')
  const [sortKey,  setSortKey]  = useState<SortKey>('date')
  const [sortDir,  setSortDir]  = useState<SortDir>('desc')
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState<IncidentRow | null>(null)

  const { data, isLoading, isError } = useIncidents({
    page, pageSize: PAGE_SIZE, severity: sev, decade,
    search: q, sortKey, sortDir,
  })

  const rows       = (data?.incidents ?? []) as IncidentRow[]
  const totalPages = data?.totalPages ?? 1
  const totalCount = data?.total      ?? 0

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const start = Math.max(1, page - 3)
    const end   = Math.min(totalPages, start + 6)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  return (
    <div>
      {selected && (
        <IncidentModal incident={selected} onClose={() => setSelected(null)} />
      )}

      <PageHeader
        icon={Table2}
        title="Incident Records"
        subtitle="Searchable, filterable aviation incident database"
      >
        {!isLoading && (
          <span className="text-xs text-slate-600 tabular-nums">
            {fmtCount(totalCount)} records
          </span>
        )}
      </PageHeader>

      {/* Filters */}
      <GlassCard delay={0.05} className="p-3.5 mb-4">
        <div className="flex flex-wrap gap-2 items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search operator, aircraft, location…"
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              aria-label="Search incidents"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs
                         bg-white/[0.04] border border-white/[0.06]
                         text-slate-300 placeholder-slate-700
                         focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.06]
                         transition-colors"
            />
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-1">
            {SEVERITIES.map(s => (
              <button
                key={s}
                onClick={() => { setSev(s); setPage(1) }}
                aria-pressed={sev === s}
                className={clsx(
                  'px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                  sev === s
                    ? 'bg-cyan-500/12 text-cyan-400 border border-cyan-500/20'
                    : 'text-slate-600 hover:text-slate-400 border border-transparent hover:border-white/[0.06]',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Decade filter */}
          <select
            value={decade}
            onChange={e => { setDecade(e.target.value); setPage(1) }}
            aria-label="Filter by decade"
            className="px-2.5 py-2 rounded-lg text-[11px] bg-white/[0.04]
                       border border-white/[0.06] text-slate-500
                       focus:outline-none focus:border-cyan-500/40
                       transition-colors"
          >
            {DECADES.map(d => (
              <option key={d} value={d}>{d === 'All' ? 'All decades' : d}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {isLoading && <LoadingSkeleton />}
      {isError   && <ErrorState />}

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
                        'px-4 py-3 font-medium text-slate-600 text-[11px]',
                        'hover:text-slate-400 cursor-pointer select-none transition-colors',
                        c.align === 'right' ? 'text-right' : 'text-left',
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
                  <th className="px-4 py-3 text-left font-medium text-slate-600 text-[11px] min-w-[180px]">
                    Summary
                  </th>
                </tr>
              </thead>

              <tbody>
                <AnimatePresence mode="wait">
                  {rows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.012, duration: 0.18 }}
                      onClick={() => setSelected(row)}
                      className="border-b border-white/[0.04] hover:bg-white/[0.025]
                                 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-medium max-w-[160px] truncate">
                        {row.operator}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">
                        {row.aircraft}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">
                        {row.location}
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={row.severity} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.fatalities === 0
                          ? <span className="text-emerald-600">0</span>
                          : <span className="text-red-400 font-medium">
                              {fmtCount(row.fatalities)}
                            </span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                        {fmtCount(row.aboard)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[220px]">
                        <p className="line-clamp-2 leading-relaxed text-[11px]">
                          {row.summary}
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <p className="text-slate-600 text-sm">No incidents match the current filters.</p>
                      <p className="text-slate-700 text-xs mt-1">Try adjusting your search or filter criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3
                            border-t border-white/[0.05] text-xs text-slate-600">
              <span className="tabular-nums">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1 items-center">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className={clsx(
                    'p-1.5 rounded-md transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                    page === 1
                      ? 'text-slate-800 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]',
                  )}
                >
                  <ChevronLeft size={14} />
                </button>
                {pageNumbers().map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    aria-current={page === p ? 'page' : undefined}
                    className={clsx(
                      'w-7 h-7 rounded-md text-xs font-medium transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                      page === p
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                        : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]',
                    )}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                  className={clsx(
                    'p-1.5 rounded-md transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                    page === totalPages
                      ? 'text-slate-800 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]',
                  )}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
