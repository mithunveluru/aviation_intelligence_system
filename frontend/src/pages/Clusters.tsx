import { Network, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import GlassCard  from '../components/ui/GlassCard'
import Badge      from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import ErrorState from '../components/ui/ErrorState'
import { useClusters } from '../hooks/useAnalysis'
import { fmtCount, fmtRate, fmtDecimal } from '../utils/format'

const CLUSTER_COLORS = [
  '#06b6d4', '#0d9488', '#f59e0b', '#8b5cf6',
  '#ef4444', '#10b981', '#3b82f6', '#f97316',
]

// ─── Confidence Bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="metric-label">LLM Confidence</span>
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-96 rounded-xl skeleton" />
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Clusters() {
  const { data: clusters, isLoading, isError } = useClusters()

  if (isLoading) return <LoadingSkeleton />
  if (isError)   return <ErrorState />

  if (!clusters?.length) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Network className="text-slate-700" size={28} />
      <p className="text-slate-500 text-sm text-center">
        No clusters found. Run the clustering pipeline first.
      </p>
    </div>
  )

  const validClusters = clusters.filter((c: any) => c.clusterLabel !== -1)

  return (
    <div>
      <PageHeader
        icon={Network}
        title="Cluster Analysis"
        subtitle="LLM-generated root cause summaries for each HDBSCAN incident cluster"
      >
        <span className="text-xs text-slate-600 tabular-nums">
          {validClusters.length} cluster{validClusters.length !== 1 ? 's' : ''} detected
        </span>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {validClusters.map((c: any, i: number) => {
          const color   = CLUSTER_COLORS[i % CLUSTER_COLORS.length]
          const factors = Array.isArray(c.keyContributingFactors) ? c.keyContributingFactors : []

          return (
            <GlassCard key={c.clusterId} hover delay={i * 0.07} className="p-5">

              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{ background: color }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-100 truncate">
                      {c.clusterLabel ?? `Cluster ${c.clusterId}`}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {fmtCount(c.incidentCount)} incidents
                      {' · '}
                      {c.yearRangeStart ?? '?'}–{c.yearRangeEnd ?? '?'}
                    </p>
                  </div>
                </div>
                <Badge label={c.dominantSeverity ?? 'Unknown'} />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Incidents',     value: fmtCount(c.incidentCount)          },
                  { label: 'Fatality Rate', value: fmtRate(c.avgFatalityRate, 0)       },
                  { label: 'Avg Fatal',     value: fmtDecimal(c.avgFatalities, 1)      },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg px-3 py-2 border border-white/[0.05]"
                    style={{ background: 'rgba(255,255,255,0.025)' }}
                  >
                    <p className="metric-label mb-1">{label}</p>
                    <p className="text-base font-bold text-slate-100 tabular-nums leading-none">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Root cause */}
              <div className="mb-4">
                <p className="metric-label mb-1.5">Root Cause</p>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {c.rootCauseSummary ?? 'No root cause summary available.'}
                </p>
              </div>

              {/* Factors */}
              {factors.length > 0 && (
                <div className="mb-4">
                  <p className="metric-label mb-2">Key Signals</p>
                  <div className="flex flex-wrap gap-1.5">
                    {factors.map((f: string) => (
                      <span
                        key={f}
                        className="text-[11px] px-2 py-0.5 rounded-md
                                   border border-white/[0.06] text-slate-400"
                        style={{ background: 'rgba(255,255,255,0.035)' }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {c.recommendations && c.recommendations !== 'No recommendations yet.' && (
                <div
                  className="p-3 rounded-lg border border-teal-500/15 mb-4"
                  style={{ background: 'rgba(13,148,136,0.05)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle size={11} className="text-teal-500 flex-shrink-0" />
                    <p className="metric-label text-teal-500/80">Recommended Action</p>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {c.recommendations}
                  </p>
                </div>
              )}

              <ConfidenceBar value={c.confidenceScore ?? 0} />
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}
