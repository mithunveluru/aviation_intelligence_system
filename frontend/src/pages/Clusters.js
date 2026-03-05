import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Network, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import { useClusters } from '../hooks/useAnalysis';
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
];
// ─── Confidence Bar ───────────────────────────────────────────────────────────
function ConfidenceBar({ value }) {
    return (_jsxs("div", { className: "mt-3", children: [_jsxs("div", { className: "flex justify-between text-xs text-slate-500 mb-1", children: [_jsx("span", { children: "Model confidence" }), _jsxs("span", { className: "text-slate-300 font-medium", children: [(value * 100).toFixed(0), "%"] })] }), _jsx("div", { className: "h-1 bg-white/[0.06] rounded-full overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${value * 100}%` }, transition: { duration: 0.8, delay: 0.4, ease: 'easeOut' }, className: "h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400" }) })] }));
}
// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
    return (_jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-5 animate-pulse", children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "h-96 rounded-xl bg-white/5" }, i))) }));
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function Clusters() {
    const { data: clusters, isLoading, isError } = useClusters();
    // ─── States ─────────────────────────────────────────────────────────────────
    if (isLoading)
        return _jsx(LoadingSkeleton, {});
    if (isError)
        return (_jsxs("div", { className: "flex flex-col items-center justify-center h-64 gap-3", children: [_jsx(AlertTriangle, { className: "text-red-400", size: 32 }), _jsxs("p", { className: "text-slate-400 text-sm", children: ["Failed to load clusters. Is the backend running on", ' ', _jsx("code", { className: "text-cyan-400", children: "localhost:8000" }), "?"] }), _jsx("button", { onClick: () => window.location.reload(), className: "text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg hover:bg-cyan-400/10 transition-colors", children: "Retry" })] }));
    if (!clusters?.length)
        return (_jsxs("div", { className: "flex flex-col items-center justify-center h-64 gap-2", children: [_jsx(Network, { className: "text-slate-600", size: 32 }), _jsx("p", { className: "text-slate-500 text-sm", children: "No clusters found. Run the clustering pipeline first." })] }));
    // ─── Main Render ─────────────────────────────────────────────────────────────
    return (_jsxs("div", { children: [_jsx(PageHeader, { icon: Network, title: "Cluster Analysis", subtitle: "LLM-generated root cause summaries for each incident cluster" }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-5", children: clusters.filter((c) => c.cluster_label !== -1).map((c, i) => {
                    // ✅ Map API fields → UI variables
                    const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                    const yearRange = `${c.yearRangeStart ?? '?'}–${c.yearRangeEnd ?? '?'}`;
                    const fatalityRate = c.avgFatalityRate ?? 0;
                    const factors = Array.isArray(c.keyContributingFactors)
                        ? c.keyContributingFactors
                        : [];
                    const confidence = c.confidenceScore ?? 0;
                    return (_jsxs(GlassCard, { hover: true, delay: i * 0.08, className: "p-5", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-2 h-8 rounded-full flex-shrink-0", style: { background: color } }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-slate-100", children: c.clusterLabel ?? `Cluster ${c.clusterId}` }), _jsxs("p", { className: "text-xs text-slate-500", children: ["Cluster ", c.clusterId, " \u00B7 ", (c.incidentCount ?? 0).toLocaleString(), " incidents \u00B7 ", yearRange] })] })] }), _jsx(Badge, { label: c.dominantSeverity ?? 'Unknown' })] }), _jsx("div", { className: "grid grid-cols-2 gap-2 mb-4", children: [
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
                                ].map(({ label, value }) => (_jsxs("div", { className: "bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.05]", children: [_jsx("p", { className: "text-[10px] text-slate-500 uppercase tracking-wider", children: label }), _jsx("p", { className: "text-base font-bold text-slate-100 tabular-nums", children: value })] }, label))) }), _jsxs("div", { className: "mb-4", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wider text-slate-500 mb-1.5", children: "Root Cause" }), _jsx("p", { className: "text-xs text-slate-300 leading-relaxed line-clamp-3", children: c.rootCauseSummary ?? 'No root cause summary available.' })] }), _jsxs("div", { className: "mb-4", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wider text-slate-500 mb-2", children: "Key Signals" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: factors.length > 0 ? (factors.map((f) => (_jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-md\n                                   bg-white/[0.04] border border-white/[0.06] text-slate-400", children: f }, f)))) : (_jsx("span", { className: "text-[10px] text-slate-600 italic", children: "No factors available" })) })] }), _jsxs("div", { className: "p-3 rounded-lg border border-teal-500/20 bg-teal-500/5 mb-3", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wider text-teal-500 mb-1", children: "Recommended Action" }), _jsx("p", { className: "text-xs text-slate-300 leading-relaxed line-clamp-3", children: c.recommendations ?? 'No recommendations available.' })] }), _jsx(ConfidenceBar, { value: confidence })] }, c.clusterId));
                }) })] }));
}
//# sourceMappingURL=Clusters.js.map