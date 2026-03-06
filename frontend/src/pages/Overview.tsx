import { motion } from 'framer-motion'
import {
  AlertTriangle, Users, Plane, TrendingDown, Activity,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import StatCard from '../components/ui/StatCard'
import GlassCard from '../components/ui/GlassCard'
import PageHeader from '../components/ui/PageHeader'
import { useStats, useYearlyTrends } from '../hooks/useAnalysis'

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-80 rounded-xl bg-white/5" />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Overview() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useStats()
  const { data: yearlyTrends, isLoading: trendsLoading, isError: trendsError } = useYearlyTrends()

  const isLoading = statsLoading || trendsLoading
  const isError   = statsError  || trendsError

  // ✅ FIX 1: chartData derived from real API data INSIDE component
  const chartData = (yearlyTrends ?? []).filter(
    (d: any) => d.year >= 1930 && d.year % 2 === 0
  )

  // ✅ FIX 2: STATS built dynamically from API, with safe fallbacks
  const STATS = [
    {
      icon:   Plane,
      label:  'Total Incidents',
      value:  stats?.totalIncidents
                ? stats.totalIncidents.toLocaleString()
                : '—',
      sub:    '1908 – 2009',
      accent: 'cyan' as const,
    },
    {
      icon:   AlertTriangle,
      label:  'Total Fatalities',
      value:  stats?.totalFatalities
                ? stats.totalFatalities.toLocaleString()
                : '—',
      sub:    'Across all incidents',
      accent: 'red' as const,
    },
    {
      icon:   Activity,
      label:  'Fatal Rate',
      value:  stats?.avgFatalityRate != null
                ? `${stats.avgFatalityRate.toFixed(1)}%`
                : '—',
      sub:    'Incidents with deaths',
      accent: 'amber' as const,
    },
    {
  icon:   TrendingDown,
  label:  'Model Accuracy',
  value:  stats?.modelAccuracy
            ? `${(stats.modelAccuracy * 100).toFixed(1)}%`
            : '—',
  sub:    'RandomForest classifier',
  accent: 'teal' as const,
},
{
  icon:   Users,
  label:  'Total Clusters',
  value:  stats?.totalClusters != null
            ? String(stats.totalClusters)
            : '—',
  sub:    'HDBSCAN failure patterns',
  accent: 'emerald' as const,
},
  ]

  // ─── Render States ──────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />

  // ✅ FIX 3: Error state added
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="text-red-400" size={32} />
      <p className="text-slate-400 text-sm">
        Failed to load overview data. Is the backend running on{' '}
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

  // ─── Main Render ────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        icon={Activity}
        title="Overview"
        subtitle="Global aviation incident statistics from 1908 to 2009"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {STATS.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i * 0.06} />
        ))}
      </div>

      {/* Yearly trend chart */}
      <GlassCard delay={0.3} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Incidents &amp; Fatalities — Yearly Trend
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              1930–2009 · Every other year shown for clarity
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
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

        {/* Empty state if no chart data */}
        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-slate-500 text-sm">
            No trend data available yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(chartData.length / 8)}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="incidents"
                name="Incidents"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#gCyan)"
                dot={false}
                activeDot={{ r: 4, fill: '#06b6d4' }}
              />
              <Area
                type="monotone"
                dataKey="fatalities"
                name="Fatalities"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#gRed)"
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>
    </div>
  )
}
