import { Network, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import GlassCard from '../components/ui/GlassCard'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import { useClusters } from '../hooks/useAnalysis'

// ─── Cluster accent colours (no colour field in API — derive from index) ──────
const CLUSTER_COLORS = [
  '#06b6d4', // cyan
  '#0d9488', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f97316', // orange
]

// ─── Confidence Bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>Model confidence</span>
        <span className="text-slate-300 font-medium">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
        />
      </div>
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-96 rounded-xl bg-white/5" />
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Clusters() {
  const { data: clusters, isLoading, isError } = useClusters()

  // ─── States ─────────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="text-red-400" size={32} />
      <p className="text-slate-400 text-sm">
        Failed to load clusters. Is the backend running on{' '}
        <code className="text-cyan-400">localhost:8000</code>?
      </p>
      <button
        onClick={() => window.location.reload()}
        className="text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg hover:bg-cyan-400/10 transition-colors"
      >
        Retry
      </button>
    </div>
  )

  if (!clusters?.length) return (
    <div className="flex flex-col items-center justify-center h-64 gap-2">
      <Network className="text-slate-600" size={32} />
      <p className="text-slate-500 text-sm">
        No clusters found. Run the clustering pipeline first.
      </p>
    </div>
  )

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        icon={Network}
        title="Cluster Analysis"
        subtitle="LLM-generated root cause summaries for each incident cluster"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {clusters.map((c: any, i: number) => {
          // ✅ Map API fields → UI variables
          const color      = CLUSTER_COLORS[i % CLUSTER_COLORS.length]
          const yearRange  = `${c.yearRangeStart ?? '?'}–${c.yearRangeEnd ?? '?'}`
          const fatalityRate = c.avgFatalityRate ?? 0
          const factors    = Array.isArray(c.keyContributingFactors)
                               ? c.keyContributingFactors
                               : []
          const confidence = c.confidenceScore ?? 0

          return (
            <GlassCard
              key={c.clusterId}
              hover
              delay={i * 0.08}
              className="p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2 h-8 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <div>
                    {/* ✅ FIX: c.name → c.clusterLabel */}
                    <h3 className="text-sm font-semibold text-slate-100">
                      {c.clusterLabel ?? `Cluster ${c.clusterId}`}
                    </h3>
                    {/* ✅ FIX: c.label → c.clusterId, c.count → c.incidentCount */}
                    <p className="text-xs text-slate-500">
                      Cluster {c.clusterId} · {(c.incidentCount ?? 0).toLocaleString()} incidents · {yearRange}
                    </p>
                  </div>
                </div>
                <Badge label={c.dominantSeverity ?? 'Unknown'} />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  {
                    label: 'Incidents',
                    // ✅ FIX: c.count → c.incidentCount
                    value: (c.incidentCount ?? 0).toLocaleString(),
                  },
                  {
                    label: 'Fatality rate',
                    // ✅ FIX: c.fatalityRate → c.avgFatalityRate
                    value: `${(fatalityRate * 100).toFixed(0)}%`,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.05]"
                  >
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {label}
                    </p>
                    <p className="text-base font-bold text-slate-100 tabular-nums">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Root cause */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
                  Root Cause
                </p>
                {/* ✅ FIX: c.rootCause → c.rootCauseSummary */}
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {c.rootCauseSummary ?? 'No root cause summary available.'}
                </p>
              </div>

              {/* Factors */}
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                  Key Signals
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {/* ✅ FIX: c.factors → c.keyContributingFactors (array-guarded) */}
                  {factors.length > 0 ? (
                    factors.map((f: string) => (
                      <span
                        key={f}
                        className="text-[10px] px-2 py-0.5 rounded-md
                                   bg-white/[0.04] border border-white/[0.06] text-slate-400"
                      >
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">
                      No factors available
                    </span>
                  )}
                </div>
              </div>

              {/* Recommendation */}
              <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5 mb-3">
                <p className="text-[10px] uppercase tracking-wider text-teal-500 mb-1">
                  Recommended Action
                </p>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {c.recommendations ?? 'No recommendations available.'}
                </p>
              </div>

              {/* ✅ FIX: c.confidence → c.confidenceScore */}
              <ConfidenceBar value={confidence} />
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
