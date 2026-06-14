import { motion } from 'framer-motion'
import {
  AlertTriangle, Users, Plane, TrendingDown, Activity,
  Building2, Gauge,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from 'recharts'
import StatCard   from '../components/ui/StatCard'
import GlassCard  from '../components/ui/GlassCard'
import PageHeader from '../components/ui/PageHeader'
import ErrorState from '../components/ui/ErrorState'
import {
  useStats, useYearlyTrends, useSeverityDist,
  useTopOperators, useTopAircraft,
} from '../hooks/useAnalysis'
import { fmtCount, fmtRate, fmtPct, fmtCompact, fmtTruncate } from '../utils/format'

// ─── Severity colours ─────────────────────────────────────────────────────────
const SEV_COLORS: Record<string, string> = {
  Fatal:    '#ef4444',
  Severe:   '#f59e0b',
  Moderate: '#3b82f6',
  Minor:    '#10b981',
  Unknown:  '#475569',
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2.5 text-xs min-w-[140px]">
      <p className="text-slate-400 font-medium mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-semibold tabular-nums">{fmtCount(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Horizontal bar tooltip ───────────────────────────────────────────────────
function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-200 font-medium mb-0.5">
        {d.operator ?? d.aircraft ?? '—'}
      </p>
      <p className="text-slate-400">
        <span className="text-cyan-400 font-semibold">{fmtCount(d.incidents)}</span> incidents
      </p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl skeleton" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="h-80 rounded-xl skeleton lg:col-span-2" />
        <div className="h-80 rounded-xl skeleton" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-72 rounded-xl skeleton" />
        <div className="h-72 rounded-xl skeleton" />
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Overview() {
  const { data: stats,          isLoading: statsLoading,    isError: statsError    } = useStats()
  const { data: yearlyTrends,   isLoading: trendsLoading,   isError: trendsError   } = useYearlyTrends()
  const { data: severityRaw,    isLoading: sevLoading                               } = useSeverityDist()
  const { data: topOperators,   isLoading: opsLoading                               } = useTopOperators(8)
  const { data: topAircraft,    isLoading: acLoading                                } = useTopAircraft(8)

  const isLoading = statsLoading || trendsLoading
  const isError   = statsError   || trendsError

  const chartData = (yearlyTrends ?? []).filter(
    (d: any) => d.year >= 1930 && d.year % 2 === 0,
  )

  const severityData = (severityRaw ?? []).map((d: any) => ({
    name:  d.severity,
    count: d.count   ?? 0,
    pct:   d.percentage ?? 0,
    color: SEV_COLORS[d.severity] ?? '#475569',
  }))
  const totalLabelled = severityData.reduce((s: number, d: any) => s + d.count, 0)

  const opsData    = (topOperators  ?? []).map((d: any) => ({ ...d, name: fmtTruncate(d.operator,  20) }))
  const acData     = (topAircraft   ?? []).map((d: any) => ({ ...d, name: fmtTruncate(d.aircraft,  22) }))

  const STATS = [
    {
      icon:   Plane,
      label:  'Total Incidents',
      value:  fmtCount(stats?.totalIncidents),
      sub:    `${stats?.yearMin ?? '1908'} – ${stats?.yearMax ?? '2020'}`,
      accent: 'cyan' as const,
    },
    {
      icon:   AlertTriangle,
      label:  'Total Fatalities',
      value:  fmtCount(stats?.totalFatalities),
      sub:    'Across all incidents',
      accent: 'red' as const,
    },
    {
      icon:   Gauge,
      label:  'Fatal Incident Rate',
      value:  fmtPct(stats?.avgFatalityRate),
      sub:    'Incidents with deaths',
      accent: 'amber' as const,
    },
    {
      icon:   TrendingDown,
      label:  'Model Accuracy',
      value:  fmtRate(stats?.modelAccuracy),
      sub:    'XGBoost severity classifier',
      accent: 'teal' as const,
    },
    {
      icon:   Users,
      label:  'Unique Operators',
      value:  fmtCount(stats?.uniqueOperators),
      sub:    `${fmtCount(stats?.totalClusters)} failure clusters`,
      accent: 'emerald' as const,
    },
  ]

  if (isLoading) return <LoadingSkeleton />
  if (isError)   return <ErrorState />

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        title="Overview"
        subtitle="Global aviation incident statistics from 1908 to 2020"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STATS.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.05} />
        ))}
      </div>

      {/* Trend + Severity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Trend Chart */}
        <GlassCard delay={0.25} className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <SectionHeader
              title="Incidents & Fatalities — Yearly Trend"
              sub="1930–2020 · every other year shown"
            />
            <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-shrink-0 mt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 rounded inline-block" />
                Incidents
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-400 rounded inline-block" />
                Fatalities
              </span>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-600 text-sm">
              No trend data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor(chartData.length / 8)}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tickFormatter={(v) => fmtCompact(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="incidents"
                  name="Incidents"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  fill="url(#gCyan)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="fatalities"
                  name="Fatalities"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="url(#gRed)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Severity Breakdown */}
        <GlassCard delay={0.3} className="p-5">
          <SectionHeader
            title="Severity Breakdown"
            sub={totalLabelled > 0 ? `${fmtCount(totalLabelled)} labelled incidents` : undefined}
          />

          {severityData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
              No severity data.
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {severityData.map((d: any) => {
                const pct = totalLabelled > 0 ? (d.count / totalLabelled) * 100 : 0
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: d.color }}
                        />
                        <span className="text-xs text-slate-400">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-600 tabular-nums">
                          {fmtCount(d.count)}
                        </span>
                        <span className="text-slate-500 tabular-nums w-10 text-right">
                          {fmtPct(pct, 0)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: 0.35, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: d.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Additional stats */}
          {stats && (
            <div className="mt-5 pt-4 divider space-y-2">
              {[
                ['Aircraft Types', fmtCount(stats.uniqueAircraft)],
                ['Locations',      fmtCount(stats.uniqueLocations)],
                ['Survival Rate',  fmtPct(stats.survivalRate)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-600">{label}</span>
                  <span className="text-slate-400 font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Operators + Aircraft Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Operators */}
        <GlassCard delay={0.35} className="p-5">
          <div className="flex items-start gap-2 mb-4">
            <Building2 size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <SectionHeader title="Top Operators by Incidents" sub="Airlines and operators with most records" />
          </div>
          {opsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 rounded skeleton" />
              ))}
            </div>
          ) : opsData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
              No operator data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={248}>
              <BarChart
                layout="vertical"
                data={opsData}
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                barCategoryGap="28%"
              >
                <XAxis
                  type="number"
                  tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtCompact(v)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={108}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="incidents" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {opsData.map((_: any, i: number) => (
                    <Cell
                      key={i}
                      fill="#06b6d4"
                      fillOpacity={1 - i * 0.07}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        {/* Top Aircraft */}
        <GlassCard delay={0.4} className="p-5">
          <div className="flex items-start gap-2 mb-4">
            <Plane size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <SectionHeader title="Top Aircraft Types" sub="Models with highest incident frequency" />
          </div>
          {acLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 rounded skeleton" />
              ))}
            </div>
          ) : acData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-600 text-sm">
              No aircraft data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={248}>
              <BarChart
                layout="vertical"
                data={acData}
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                barCategoryGap="28%"
              >
                <XAxis
                  type="number"
                  tick={{ fill: '#475569', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtCompact(v)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="incidents" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {acData.map((_: any, i: number) => (
                    <Cell
                      key={i}
                      fill="#0d9488"
                      fillOpacity={1 - i * 0.07}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

