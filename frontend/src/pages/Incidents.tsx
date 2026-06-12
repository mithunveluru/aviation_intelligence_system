import { useState } from 'react'
import {
  Table2, Search, ChevronUp, ChevronDown,
  ChevronsUpDown, X, ExternalLink,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard   from '../components/ui/GlassCard'
import Badge       from '../components/ui/Badge'
import PageHeader  from '../components/ui/PageHeader'
import ErrorState  from '../components/ui/ErrorState'
import { useIncidents } from '../hooks/useAnalysis'
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
const DECADES    = [
  'All',
  '1910s', '1920s', '1930s', '1940s', '1950s',
  '1960s', '1970s', '1980s', '1990s', '2000s', '2010s',
]
const PAGE_SIZE = 12

const COLS: { key: SortKey; label: string; width: string }[] = [
  { key: 'date',       label: 'Date',       width: 'w-24' },
  { key: 'operator',   label: 'Operator',   width: 'w-44' },
  { key: 'aircraft',   label: 'Aircraft',   width: 'w-44' },
  { key: 'location',   label: 'Location',   width: 'w-40' },
  { key: 'severity',   label: 'Severity',   width: 'w-24' },
  { key: 'fatalities', label: 'Fatalities', width: 'w-24' },
  { key: 'aboard',     label: 'Aboard',     width: 'w-20' },
]

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey)
    return <ChevronsUpDown size={11} className="opacity-30 ml-1 inline" />
  return dir === 'asc'
    ? <ChevronUp   size={11} className="text-cyan-400 ml-1 inline" />
    : <ChevronDown size={11} className="text-cyan-400 ml-1 inline" />
}

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

// ─── Incident Detail Modal ────────────────────────────────────────────────────
function IncidentModal({ incident, onClose }: { incident: IncidentRow; onClose: () => void }) {
  const fields: [string, string | number][] = [
    ['Date',          incident.date || '—'],
    ['Operator',      incident.operator],
    ['Aircraft',      incident.aircraft],
    ['Location',      incident.location],
    ['Fatalities',    incident.fatalities],
    ['Aboard',        incident.aboard],
    ['Cluster',       incident.cluster >= 0 ? `Cluster ${incident.cluster}` : 'Noise / Unclustered'],
    ['Phase',         incident.extractedPhaseOfFlight || '—'],
    ['Cause',         incident.extractedCauseCategory || '—'],
  ]
  if (incident.predictedSeverity) {
    fields.push(['Predicted Severity', incident.predictedSeverity])
    fields.push(['Confidence', `${(incident.predictionConfidence * 100).toFixed(0)}%`])
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Badge label={incident.severity} />
              <span className="text-xs text-slate-500">Incident #{incident.id}</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close incident detail"
              className="text-slate-500 hover:text-slate-300 transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-5 text-xs">
            {fields.map(([label, val]) => (
              <div key={label}>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
                <p className="text-slate-200 font-medium">{val}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Incident Summary</p>
            <p className="text-sm text-slate-300 leading-relaxed">{incident.summary || 'No summary available.'}</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Incidents() {
  const [q,         setQ]         = useState('')
  const [sev,       setSev]       = useState('All')
  const [decade,    setDecade]    = useState('All')
  const [sortKey,   setSortKey]   = useState<SortKey>('date')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')
  const [page,      setPage]      = useState(1)
  const [selected,  setSelected]  = useState<IncidentRow | null>(null)

  const { data, isLoading, isError } = useIncidents({
    page,
    pageSize: PAGE_SIZE,
    severity: sev,
    decade,
    search:   q,
    sortKey,
    sortDir,
  })

  const pageData   = (data?.incidents ?? []) as IncidentRow[]
  const totalPages = data?.totalPages ?? 1
  const totalCount = data?.total      ?? 0

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const handleSearch = (v: string) => { setQ(v);      setPage(1) }
  const handleSev    = (v: string) => { setSev(v);    setPage(1) }
  const handleDecade = (v: string) => { setDecade(v); setPage(1) }

  // Smart pagination: show window of pages around current
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
          <div className="flex items-center gap-1 flex-wrap">
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

          <span className="text-xs text-slate-600 ml-auto">
            {isLoading ? '…' : totalCount.toLocaleString()} results
          </span>
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
                  <th className="px-4 py-3 w-8" />
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
                      transition={{ delay: i * 0.015, duration: 0.2 }}
                      onClick={() => setSelected(row)}
                      className="border-b border-white/[0.04] hover:bg-white/[0.03]
                                 transition-colors cursor-pointer group"
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
                      <td className="px-4 py-3">
                        <ExternalLink
                          size={12}
                          className="text-slate-600 group-hover:text-slate-400 transition-colors"
                        />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {pageData.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-600">
                      No incidents match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3
                            border-t border-white/[0.06] text-xs text-slate-500">
              <span>
                Page {page} of {totalPages} · {totalCount.toLocaleString()} total
              </span>
              <div className="flex gap-1 items-center">
                {page > 1 && (
                  <button
                    onClick={() => setPage(p => p - 1)}
                    aria-label="Previous page"
                    className="px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-300
                               hover:bg-white/[0.04] transition-all
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    ‹
                  </button>
                )}
                {pageNumbers().map(p => (
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
                ))}
                {page < totalPages && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    aria-label="Next page"
                    className="px-2 py-1.5 rounded-md text-slate-500 hover:text-slate-300
                               hover:bg-white/[0.04] transition-all
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    ›
                  </button>
                )}
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
