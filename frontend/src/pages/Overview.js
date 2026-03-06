import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { AlertTriangle, Users, Plane, TrendingDown, Activity, } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, } from 'recharts';
import StatCard from '../components/ui/StatCard';
import GlassCard from '../components/ui/GlassCard';
import PageHeader from '../components/ui/PageHeader';
import { useStats, useYearlyTrends } from '../hooks/useAnalysis';
// ─── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length)
        return null;
    return (_jsxs("div", { className: "glass rounded-lg px-3 py-2 text-xs", children: [_jsx("p", { className: "text-slate-400 mb-1 font-medium", children: label }), payload.map((p) => (_jsxs("p", { style: { color: p.color }, children: [p.name, ": ", _jsx("span", { className: "font-semibold", children: p.value.toLocaleString() })] }, p.name)))] }));
};
// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
    return (_jsxs("div", { className: "animate-pulse space-y-6", children: [_jsx("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-4", children: Array.from({ length: 5 }).map((_, i) => (_jsx("div", { className: "h-28 rounded-xl bg-white/5" }, i))) }), _jsx("div", { className: "h-80 rounded-xl bg-white/5" })] }));
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function Overview() {
    const { data: stats, isLoading: statsLoading, isError: statsError } = useStats();
    const { data: yearlyTrends, isLoading: trendsLoading, isError: trendsError } = useYearlyTrends();
    const isLoading = statsLoading || trendsLoading;
    const isError = statsError || trendsError;
    // ✅ FIX 1: chartData derived from real API data INSIDE component
    const chartData = (yearlyTrends ?? []).filter((d) => d.year >= 1930 && d.year % 2 === 0);
    // ✅ FIX 2: STATS built dynamically from API, with safe fallbacks
    const STATS = [
        {
            icon: Plane,
            label: 'Total Incidents',
            value: stats?.totalIncidents
                ? stats.totalIncidents.toLocaleString()
                : '—',
            sub: '1908 – 2009',
            accent: 'cyan',
        },
        {
            icon: AlertTriangle,
            label: 'Total Fatalities',
            value: stats?.totalFatalities
                ? stats.totalFatalities.toLocaleString()
                : '—',
            sub: 'Across all incidents',
            accent: 'red',
        },
        {
            icon: Activity,
            label: 'Fatal Rate',
            value: stats?.avgFatalityRate != null
                ? `${stats.avgFatalityRate.toFixed(1)}%`
                : '—',
            sub: 'Incidents with deaths',
            accent: 'amber',
        },
        {
            icon: TrendingDown,
            label: 'Model Accuracy',
            value: stats?.modelAccuracy
                ? `${(stats.modelAccuracy * 100).toFixed(1)}%`
                : '—',
            sub: 'RandomForest classifier',
            accent: 'teal',
        },
        {
            icon: Users,
            label: 'Total Clusters',
            value: stats?.totalClusters != null
                ? String(stats.totalClusters)
                : '—',
            sub: 'HDBSCAN failure patterns',
            accent: 'emerald',
        },
    ];
    // ─── Render States ──────────────────────────────────────────────────────────
    if (isLoading)
        return _jsx(LoadingSkeleton, {});
    // ✅ FIX 3: Error state added
    if (isError)
        return (_jsxs("div", { className: "flex flex-col items-center justify-center h-64 gap-3", children: [_jsx(AlertTriangle, { className: "text-red-400", size: 32 }), _jsxs("p", { className: "text-slate-400 text-sm", children: ["Failed to load overview data. Is the backend running on", ' ', _jsx("code", { className: "text-cyan-400", children: "localhost:8000" }), "?"] }), _jsx("button", { onClick: () => window.location.reload(), className: "text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg hover:bg-cyan-400/10 transition-colors", children: "Retry" })] }));
    // ─── Main Render ────────────────────────────────────────────────────────────
    return (_jsxs("div", { children: [_jsx(PageHeader, { icon: Activity, title: "Overview", subtitle: "Global aviation incident statistics from 1908 to 2009" }), _jsx("div", { className: "grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8", children: STATS.map((s, i) => (_jsx(StatCard, { ...s, delay: i * 0.06 }, s.label))) }), _jsxs(GlassCard, { delay: 0.3, className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold text-slate-200", children: "Incidents & Fatalities \u2014 Yearly Trend" }), _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: "1930\u20132009 \u00B7 Every other year shown for clarity" })] }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-slate-500", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-3 h-0.5 bg-cyan-400 rounded inline-block" }), "Incidents"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-3 h-0.5 bg-red-400 rounded inline-block" }), "Fatalities"] })] })] }), chartData.length === 0 ? (_jsx("div", { className: "h-80 flex items-center justify-center text-slate-500 text-sm", children: "No trend data available yet." })) : (_jsx(ResponsiveContainer, { width: "100%", height: 320, children: _jsxs(AreaChart, { data: chartData, margin: { top: 4, right: 4, bottom: 0, left: 0 }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gCyan", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#06b6d4", stopOpacity: 0.25 }), _jsx("stop", { offset: "95%", stopColor: "#06b6d4", stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "gRed", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#ef4444", stopOpacity: 0.2 }), _jsx("stop", { offset: "95%", stopColor: "#ef4444", stopOpacity: 0 })] })] }), _jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.05)", vertical: false }), _jsx(XAxis, { dataKey: "year", tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false, interval: Math.floor(chartData.length / 8) }), _jsx(YAxis, { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false, width: 42 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Area, { type: "monotone", dataKey: "incidents", name: "Incidents", stroke: "#06b6d4", strokeWidth: 2, fill: "url(#gCyan)", dot: false, activeDot: { r: 4, fill: '#06b6d4' } }), _jsx(Area, { type: "monotone", dataKey: "fatalities", name: "Fatalities", stroke: "#ef4444", strokeWidth: 2, fill: "url(#gRed)", dot: false, activeDot: { r: 4, fill: '#ef4444' } })] }) }))] })] }));
}
//# sourceMappingURL=Overview.js.map