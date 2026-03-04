import { BarChart3, Info, AlertTriangle } from 'lucide-react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, BarChart, Bar,
  PieChart, Pie,
} from 'recharts'
import GlassCard from '../components/ui/GlassCard'
import PageHeader from '../components/ui/PageHeader'
import {
  useUMAPData,
  useSeverityDist,
  useDecadeBreakdown,
  useClusters,
} from '../hooks/useAnalysis'

// ─── Cluster colours (must match Clusters.tsx) ────────────────────────────────
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

// ✅ Severity colours keyed by label
const SEVERITY_COLORS: Record<string, string> = {
  Fatal:    '#ef4444',
  Severe:   '#f59e0b',
  Moderate: '#06b6d4',
  Minor:    '#10b981',
  Unknown:  '#64748b',
}

const RADIAN = Math.PI / 180

// ─── Pie label ────────────────────────────────────────────────────────────────
const renderPieLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) => {
  if (percent < 0.06) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x} y={y} fill="white" textAnchor="middle"
      dominantBaseline="central" fontSize={11} fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="h-96 rounded-xl bg-white/5 lg:col-span-2" />
        <div className="h-96 rounded-xl bg-white/5" />
      </div>
      <div className="h-72 rounded-xl bg-white/5" />
    </div>
  )
}

// ─── Error State ──────────────────────────────────────────────────────────────
function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="text-red-400" size={32} />
      <p className="text-slate-400 text-sm">
        Failed to load analysis data. Is the backend running on{' '}
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
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Analysis() {
  // ✅ FIX 1: replace all seed imports with real API hooks
  const { data: umapRaw,    isLoading: umapLoading,   isError: umapError   } = useUMAPData()
  const { data: severityRaw,isLoading: sevLoading,    isError: sevError    } = useSeverityDist()
  const { data: decadeRaw,  isLoading: decadeLoading, isError: decadeError } = useDecadeBreakdown()
  const { data: clusters,   isLoading: clustersLoading                     } = useClusters()

  const isLoading = umapLoading || sevLoading || decadeLoading || clustersLoading
  const isError   = umapError   || sevError   || decadeError

  if (isLoading) return <LoadingSkeleton />
  if (isError)   return <ErrorState />

  // ✅ FIX 2: build cluster label lookup from API — replaces clusterCards seed lookup
  const clusterLabelMap: Record<number, string> = {}
  ;(clusters ?? []).forEach((c: any) => {
    clusterLabelMap[c.clusterId] = c.clusterLabel ?? `Cluster ${c.clusterId}`
  })

  // ✅ FIX 3: UMAP — API has no color field, derive from cluster index
  const umapPoints = (umapRaw ?? []).map((pt: any) => ({
    ...pt,
    color: CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length] ?? '#64748b',
  }))

  // ✅ FIX 4: severity — API returns { severity, count, percentage }
  //           chart needs { name, value, color }
  const severityData = (severityRaw ?? []).map((d: any) => ({
    name:  d.severity,
    value: d.count,
    color: SEVERITY_COLORS[d.severity] ?? '#64748b',
  }))

  // decade data shape matches directly — { decade, incidents, fatalities }
  const decadeData = decadeRaw ?? []

  // ─── Tooltips ───────────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null
    const d = payload[0].payload
    return (
      <div className="glass rounded-lg px-3 py-2 text-xs">
        {'cluster' in d ? (
          <>
            <p className="text-slate-400">
              Cluster{' '}
              <span className="text-slate-200 font-semibold">
                {/* ✅ FIX 5: use API lookup map, not clusterCards seed */}
                {clusterLabelMap[d.cluster] ?? `Cluster ${d.cluster}`}
              </span>
            </p>
            <p className="text-slate-400">
              Severity{' '}
              <span className="text-slate-200 font-semibold">{d.severity}</span>
            </p>
          </>
        ) : (
          <>
            <p className="text-slate-400 font-semibold">{d.decade}</p>
            <p className="text-cyan-400">
              Incidents: <b>{(d.incidents ?? 0).toLocaleString()}</b>
            </p>
            <p className="text-red-400">
              Fatalities: <b>{(d.fatalities ?? 0).toLocaleString()}</b>
            </p>
          </>
        )}
      </div>
    )
  }

  // ─── Main Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Pattern Analysis"
        subtitle="UMAP cluster projections, severity distribution, and incident trends by decade"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* UMAP Scatter — spans 2 cols */}
        <GlassCard delay={0.05} className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                UMAP Cluster Projection
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                2D embedding of {umapPoints.length.toLocaleString()} incidents — coloured by cluster
              </p>
            </div>
            <Info size={14} className="text-slate-600" />
          </div>

          {/* ✅ FIX: cluster legend from API, not seed */}
          <div className="flex flex-wrap gap-3 mb-3">
            {(clusters ?? []).map((c: any, i: number) => (
              <span
                key={c.clusterId}
                className="flex items-center gap-1.5 text-xs text-slate-400"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
                />
                {(c.clusterLabel ?? `Cluster ${c.clusterId}`).split(' ')[0]}
              </span>
            ))}
          </div>

          {umapPoints.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
              No UMAP data available. Run the analysis pipeline first.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="x" type="number" domain={['auto', 'auto']}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  label={{ value: 'UMAP-1', fill: '#475569', fontSize: 10, position: 'insideBottom', offset: -2 }}
                />
                <YAxis
                  dataKey="y" type="number" domain={['auto', 'auto']}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Scatter data={umapPoints} isAnimationActive={false}>
                  {umapPoints.map((pt: any, i: number) => (
                    <Cell key={i} fill={pt.color} fillOpacity={0.75} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Severity Pie */}
        <GlassCard delay={0.1} className="p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">
            Severity Distribution
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Labelled incidents (n={severityData.reduce((s: number, d: any) => s + d.value, 0).toLocaleString()})
          </p>

          {severityData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
              No severity data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                  isAnimationActive
                  animationBegin={200}
                  animationDuration={800}
                >
                  {severityData.map((d: any) => (
                    <Cell key={d.name} fill={d.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Custom legend */}
          <div className="space-y-2 mt-2">
            {severityData.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="text-slate-300 font-semibold tabular-nums">
                  {d.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Decade Bar Chart — full width */}
      <GlassCard delay={0.15} className="p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-1">
          Incidents by Decade
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Aviation safety trend over 90 years of records
        </p>

        {decadeData.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-slate-500 text-sm">
            No decade data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={decadeData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              barCategoryGap="28%"
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="decade"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false} tickLine={false} width={42}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="incidents"  name="Incidents"  fill="#06b6d4" radius={[4,4,0,0]} fillOpacity={0.85} />
              <Bar dataKey="fatalities" name="Fatalities" fill="#ef4444" radius={[4,4,0,0]} fillOpacity={0.7}  />
            </BarChart>
          </ResponsiveContainer>
        )}

        <div className="flex gap-5 mt-3 justify-end text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 rounded" />Incidents
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-400 rounded" />Fatalities
          </span>
        </div>
      </GlassCard>
    </div>
  )
}
