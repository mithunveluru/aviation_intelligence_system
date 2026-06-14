import { BarChart3, Info } from 'lucide-react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, BarChart, Bar,
  PieChart, Pie,
} from 'recharts'
import GlassCard  from '../components/ui/GlassCard'
import PageHeader from '../components/ui/PageHeader'
import ErrorState from '../components/ui/ErrorState'
import {
  useUMAPData, useSeverityDist, useDecadeBreakdown, useClusters,
} from '../hooks/useAnalysis'
import { fmtCount, fmtPct } from '../utils/format'

const CLUSTER_COLORS = [
  '#06b6d4', '#0d9488', '#f59e0b', '#8b5cf6',
  '#ef4444', '#10b981', '#3b82f6', '#f97316',
]

const SEVERITY_COLORS: Record<string, string> = {
  Fatal:    '#ef4444',
  Severe:   '#f59e0b',
  Moderate: '#3b82f6',
  Minor:    '#10b981',
  Unknown:  '#475569',
}

const RADIAN = Math.PI / 180

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
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

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="h-96 rounded-xl skeleton lg:col-span-2" />
        <div className="h-96 rounded-xl skeleton" />
      </div>
      <div className="h-72 rounded-xl skeleton" />
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Tooltips ─────────────────────────────────────────────────────────────────
function ScatterTip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="glass rounded-lg px-3 py-2.5 text-xs min-w-[140px]">
      <p className="text-slate-300 font-medium mb-1">
        {d.clusterLabel ?? `Cluster ${d.cluster}`}
      </p>
      <p className="text-slate-400 flex justify-between gap-4">
        <span>Severity</span>
        <span className="text-slate-200 font-medium">{d.severity}</span>
      </p>
      {d.year > 0 && (
        <p className="text-slate-400 flex justify-between gap-4">
          <span>Year</span>
          <span className="text-slate-200 font-medium">{d.year}</span>
        </p>
      )}
    </div>
  )
}

function DecadeTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="glass rounded-lg px-3 py-2.5 text-xs min-w-[140px]">
      <p className="text-slate-400 font-medium mb-1.5">{d.decade}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-semibold tabular-nums">{fmtCount(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Analysis() {
  const { data: umapRaw,    isLoading: umapLoading,    isError: umapError    } = useUMAPData()
  const { data: severityRaw,isLoading: sevLoading,     isError: sevError     } = useSeverityDist()
  const { data: decadeRaw,  isLoading: decadeLoading,  isError: decadeError  } = useDecadeBreakdown()
  const { data: clusters,   isLoading: clustersLoading                        } = useClusters()

  const isLoading = umapLoading || sevLoading || decadeLoading || clustersLoading
  const isError   = umapError   || sevError   || decadeError

  if (isLoading) return <LoadingSkeleton />
  if (isError)   return <ErrorState />

  const clusterLabelMap: Record<number, string> = {}
  ;(clusters ?? []).forEach((c: any) => {
    clusterLabelMap[c.clusterId] = c.clusterLabel ?? `Cluster ${c.clusterId}`
  })

  const umapPoints = (umapRaw ?? []).map((pt: any) => ({
    ...pt,
    color:        CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length] ?? '#475569',
    clusterLabel: clusterLabelMap[pt.cluster] ?? `Cluster ${pt.cluster}`,
  }))

  const severityData = (severityRaw ?? []).map((d: any) => ({
    name:  d.severity,
    value: d.count,
    pct:   d.percentage ?? 0,
    color: SEVERITY_COLORS[d.severity] ?? '#475569',
  }))

  const decadeData = decadeRaw ?? []
  const totalSev = severityData.reduce((s: number, d: any) => s + d.value, 0)

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Pattern Analysis"
        subtitle="UMAP cluster projections, severity distribution, and incident trends by decade"
      />

      <div className="space-y-5">

        {/* Row 1: UMAP + Severity Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* UMAP Scatter */}
          <GlassCard delay={0.05} className="p-5 lg:col-span-2">
            <div className="flex items-start justify-between mb-4">
              <SectionHeader
                title="UMAP Cluster Projection"
                sub={`2D embedding · ${fmtCount(umapPoints.length)} incidents coloured by cluster`}
              />
              <div title="2D UMAP reduction from 384-dimensional sentence embeddings">
                <Info size={14} className="text-slate-600 mt-0.5" />
              </div>
            </div>

            {/* Cluster legend */}
            {(clusters ?? []).length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {(clusters ?? []).map((c: any, i: number) => (
                  <span
                    key={c.clusterId}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
                    />
                    {(c.clusterLabel ?? `Cluster ${c.clusterId}`).replace('Cluster ', 'C')}
                  </span>
                ))}
              </div>
            )}

            {umapPoints.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-600 text-sm">
                No UMAP data. Run the analysis pipeline first.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" />
                  <XAxis
                    dataKey="x" type="number" domain={['auto', 'auto']}
                    tick={{ fill: '#475569', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    label={{
                      value: 'UMAP-1', fill: '#475569', fontSize: 10,
                      position: 'insideBottom', offset: -2,
                    }}
                  />
                  <YAxis
                    dataKey="y" type="number" domain={['auto', 'auto']}
                    tick={{ fill: '#475569', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    content={<ScatterTip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                  />
                  <Scatter data={umapPoints} isAnimationActive={false}>
                    {umapPoints.map((pt: any, i: number) => (
                      <Cell key={i} fill={pt.color} fillOpacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Severity Pie */}
          <GlassCard delay={0.1} className="p-5">
            <SectionHeader
              title="Severity Distribution"
              sub={`n = ${fmtCount(totalSev)} labelled incidents`}
            />

            {severityData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-slate-600 text-sm">
                No severity data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={86}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={PieLabel}
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

            <div className="space-y-2 mt-2">
              {severityData.map((d: any) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-400">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 tabular-nums">{fmtCount(d.value)}</span>
                    <span className="text-slate-400 font-semibold tabular-nums w-10 text-right">
                      {fmtPct(totalSev > 0 ? (d.value / totalSev) * 100 : 0, 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Row 2: Decade Chart */}
        <GlassCard delay={0.15} className="p-5">
          <div className="flex items-start justify-between mb-4">
            <SectionHeader
              title="Incidents by Decade"
              sub="Aviation safety record across 90+ years of data"
            />
            <div className="flex gap-5 text-[11px] text-slate-500 flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 rounded" />Incidents
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-400 rounded" />Fatalities
              </span>
            </div>
          </div>

          {decadeData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-600 text-sm">
              No decade data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={decadeData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                barCategoryGap="30%"
                barGap={2}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="decade"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  width={42}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                />
                <Tooltip content={<DecadeTip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar
                  dataKey="incidents" name="Incidents"
                  fill="#06b6d4" radius={[3,3,0,0]} fillOpacity={0.9}
                />
                <Bar
                  dataKey="fatalities" name="Fatalities"
                  fill="#ef4444" radius={[3,3,0,0]} fillOpacity={0.75}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

      </div>
    </div>
  )
}
