import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BarChart3, Info, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, BarChart, Bar, PieChart, Pie, } from 'recharts';
import GlassCard from '../components/ui/GlassCard';
import PageHeader from '../components/ui/PageHeader';
import { useUMAPData, useSeverityDist, useDecadeBreakdown, useClusters, } from '../hooks/useAnalysis';
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
];
// ✅ Severity colours keyed by label
const SEVERITY_COLORS = {
    Fatal: '#ef4444',
    Severe: '#f59e0b',
    Moderate: '#06b6d4',
    Minor: '#10b981',
    Unknown: '#64748b',
};
const RADIAN = Math.PI / 180;
// ─── Pie label ────────────────────────────────────────────────────────────────
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, }) => {
    if (percent < 0.06)
        return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (_jsx("text", { x: x, y: y, fill: "white", textAnchor: "middle", dominantBaseline: "central", fontSize: 11, fontWeight: 600, children: `${(percent * 100).toFixed(0)}%` }));
};
// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
    return (_jsxs("div", { className: "space-y-5 animate-pulse", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-5", children: [_jsx("div", { className: "h-96 rounded-xl bg-white/5 lg:col-span-2" }), _jsx("div", { className: "h-96 rounded-xl bg-white/5" })] }), _jsx("div", { className: "h-72 rounded-xl bg-white/5" })] }));
}
// ─── Error State ──────────────────────────────────────────────────────────────
function ErrorState() {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center h-64 gap-3", children: [_jsx(AlertTriangle, { className: "text-red-400", size: 32 }), _jsxs("p", { className: "text-slate-400 text-sm", children: ["Failed to load analysis data. Is the backend running on", ' ', _jsx("code", { className: "text-cyan-400", children: "localhost:    " }), "?"] }), _jsx("button", { onClick: () => window.location.reload(), className: "text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg hover:bg-cyan-400/10 transition-colors", children: "Retry" })] }));
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function Analysis() {
    // ✅ FIX 1: replace all seed imports with real API hooks
    const { data: umapRaw, isLoading: umapLoading, isError: umapError } = useUMAPData();
    const { data: severityRaw, isLoading: sevLoading, isError: sevError } = useSeverityDist();
    const { data: decadeRaw, isLoading: decadeLoading, isError: decadeError } = useDecadeBreakdown();
    const { data: clusters, isLoading: clustersLoading } = useClusters();
    const isLoading = umapLoading || sevLoading || decadeLoading || clustersLoading;
    const isError = umapError || sevError || decadeError;
    if (isLoading)
        return _jsx(LoadingSkeleton, {});
    if (isError)
        return _jsx(ErrorState, {});
    // ✅ FIX 2: build cluster label lookup from API — replaces clusterCards seed lookup
    const clusterLabelMap = {};
    (clusters ?? []).forEach((c) => {
        clusterLabelMap[c.clusterId] = c.clusterLabel ?? `Cluster ${c.clusterId}`;
    });
    // ✅ FIX 3: UMAP — API has no color field, derive from cluster index
    const umapPoints = (umapRaw ?? []).map((pt) => ({
        ...pt,
        color: CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length] ?? '#64748b',
    }));
    // ✅ FIX 4: severity — API returns { severity, count, percentage }
    //           chart needs { name, value, color }
    const severityData = (severityRaw ?? []).map((d) => ({
        name: d.severity,
        value: d.count,
        color: SEVERITY_COLORS[d.severity] ?? '#64748b',
    }));
    // decade data shape matches directly — { decade, incidents, fatalities }
    const decadeData = decadeRaw ?? [];
    // ─── Tooltips ───────────────────────────────────────────────────────────────
    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.[0])
            return null;
        const d = payload[0].payload;
        return (_jsx("div", { className: "glass rounded-lg px-3 py-2 text-xs", children: 'cluster' in d ? (_jsxs(_Fragment, { children: [_jsxs("p", { className: "text-slate-400", children: ["Cluster", ' ', _jsx("span", { className: "text-slate-200 font-semibold", children: clusterLabelMap[d.cluster] ?? `Cluster ${d.cluster}` })] }), _jsxs("p", { className: "text-slate-400", children: ["Severity", ' ', _jsx("span", { className: "text-slate-200 font-semibold", children: d.severity })] })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-slate-400 font-semibold", children: d.decade }), _jsxs("p", { className: "text-cyan-400", children: ["Incidents: ", _jsx("b", { children: (d.incidents ?? 0).toLocaleString() })] }), _jsxs("p", { className: "text-red-400", children: ["Fatalities: ", _jsx("b", { children: (d.fatalities ?? 0).toLocaleString() })] })] })) }));
    };
    // ─── Main Render ─────────────────────────────────────────────────────────────
    return (_jsxs("div", { children: [_jsx(PageHeader, { icon: BarChart3, title: "Pattern Analysis", subtitle: "UMAP cluster projections, severity distribution, and incident trends by decade" }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5", children: [_jsxs(GlassCard, { delay: 0.05, className: "p-5 lg:col-span-2", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold text-slate-200", children: "UMAP Cluster Projection" }), _jsxs("p", { className: "text-xs text-slate-500 mt-0.5", children: ["2D embedding of ", umapPoints.length.toLocaleString(), " incidents \u2014 coloured by cluster"] })] }), _jsx(Info, { size: 14, className: "text-slate-600" })] }), _jsx("div", { className: "flex flex-wrap gap-3 mb-3", children: (clusters ?? []).map((c, i) => (_jsxs("span", { className: "flex items-center gap-1.5 text-xs text-slate-400", children: [_jsx("span", { className: "w-2 h-2 rounded-full flex-shrink-0", style: { background: CLUSTER_COLORS[i % CLUSTER_COLORS.length] } }), (c.clusterLabel ?? `Cluster ${c.clusterId}`).split(' ')[0]] }, c.clusterId))) }), umapPoints.length === 0 ? (_jsx("div", { className: "h-72 flex items-center justify-center text-slate-500 text-sm", children: "No UMAP data available. Run the analysis pipeline first." })) : (_jsx(ResponsiveContainer, { width: "100%", height: 300, children: _jsxs(ScatterChart, { margin: { top: 4, right: 4, bottom: 0, left: 0 }, children: [_jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.04)" }), _jsx(XAxis, { dataKey: "x", type: "number", domain: ['auto', 'auto'], tick: { fill: '#475569', fontSize: 10 }, axisLine: false, tickLine: false, label: { value: 'UMAP-1', fill: '#475569', fontSize: 10, position: 'insideBottom', offset: -2 } }), _jsx(YAxis, { dataKey: "y", type: "number", domain: ['auto', 'auto'], tick: { fill: '#475569', fontSize: 10 }, axisLine: false, tickLine: false, width: 30 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}), cursor: { stroke: 'rgba(255,255,255,0.1)' } }), _jsx(Scatter, { data: umapPoints, isAnimationActive: false, children: umapPoints.map((pt, i) => (_jsx(Cell, { fill: pt.color, fillOpacity: 0.75 }, i))) })] }) }))] }), _jsxs(GlassCard, { delay: 0.1, className: "p-5", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-200 mb-1", children: "Severity Distribution" }), _jsxs("p", { className: "text-xs text-slate-500 mb-4", children: ["Labelled incidents (n=", severityData.reduce((s, d) => s + d.value, 0).toLocaleString(), ")"] }), severityData.length === 0 ? (_jsx("div", { className: "h-56 flex items-center justify-center text-slate-500 text-sm", children: "No severity data available." })) : (_jsx(ResponsiveContainer, { width: "100%", height: 220, children: _jsx(PieChart, { children: _jsx(Pie, { data: severityData, cx: "50%", cy: "50%", innerRadius: 52, outerRadius: 88, paddingAngle: 3, dataKey: "value", labelLine: false, label: renderPieLabel, isAnimationActive: true, animationBegin: 200, animationDuration: 800, children: severityData.map((d) => (_jsx(Cell, { fill: d.color, stroke: "transparent" }, d.name))) }) }) })), _jsx("div", { className: "space-y-2 mt-2", children: severityData.map((d) => (_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("span", { className: "flex items-center gap-2 text-slate-400", children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { background: d.color } }), d.name] }), _jsx("span", { className: "text-slate-300 font-semibold tabular-nums", children: d.value.toLocaleString() })] }, d.name))) })] })] }), _jsxs(GlassCard, { delay: 0.15, className: "p-5", children: [_jsx("h2", { className: "text-sm font-semibold text-slate-200 mb-1", children: "Incidents by Decade" }), _jsx("p", { className: "text-xs text-slate-500 mb-5", children: "Aviation safety trend over 90 years of records" }), decadeData.length === 0 ? (_jsx("div", { className: "h-60 flex items-center justify-center text-slate-500 text-sm", children: "No decade data available." })) : (_jsx(ResponsiveContainer, { width: "100%", height: 240, children: _jsxs(BarChart, { data: decadeData, margin: { top: 4, right: 4, bottom: 0, left: 0 }, barCategoryGap: "28%", children: [_jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.05)", vertical: false }), _jsx(XAxis, { dataKey: "decade", tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false }), _jsx(YAxis, { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false, width: 42 }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}), cursor: { fill: 'rgba(255,255,255,0.03)' } }), _jsx(Bar, { dataKey: "incidents", name: "Incidents", fill: "#06b6d4", radius: [4, 4, 0, 0], fillOpacity: 0.85 }), _jsx(Bar, { dataKey: "fatalities", name: "Fatalities", fill: "#ef4444", radius: [4, 4, 0, 0], fillOpacity: 0.7 })] }) })), _jsxs("div", { className: "flex gap-5 mt-3 justify-end text-xs text-slate-500", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-3 h-0.5 bg-cyan-400 rounded" }), "Incidents"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-3 h-0.5 bg-red-400 rounded" }), "Fatalities"] })] })] })] }));
}
//# sourceMappingURL=Analysis.js.map