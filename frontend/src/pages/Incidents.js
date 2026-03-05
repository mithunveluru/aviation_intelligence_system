import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Table2, Search, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle, } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/ui/GlassCard';
import Badge from '../components/ui/Badge';
import PageHeader from '../components/ui/PageHeader';
import { useIncidents } from '../hooks/useAnalysis';
import clsx from 'clsx';
// ─── Constants ────────────────────────────────────────────────────────────────
const SEVERITIES = ['All', 'Fatal', 'Severe', 'Moderate', 'Minor'];
const DECADES = ['All', '1960s', '1970s', '1980s', '1990s', '2000s'];
const PAGE_SIZE = 12;
const COLS = [
    { key: 'date', label: 'Date', width: 'w-24' },
    { key: 'operator', label: 'Operator', width: 'w-44' },
    { key: 'aircraft', label: 'Aircraft', width: 'w-44' },
    { key: 'location', label: 'Location', width: 'w-40' },
    { key: 'severity', label: 'Severity', width: 'w-24' },
    { key: 'fatalities', label: 'Fatalities', width: 'w-24' },
    { key: 'aboard', label: 'Aboard', width: 'w-20' },
];
// ─── Sort Icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, dir }) {
    if (col !== sortKey)
        return _jsx(ChevronsUpDown, { size: 11, className: "opacity-30 ml-1 inline" });
    return dir === 'asc'
        ? _jsx(ChevronUp, { size: 11, className: "text-cyan-400 ml-1 inline" })
        : _jsx(ChevronDown, { size: 11, className: "text-cyan-400 ml-1 inline" });
}
// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
    return (_jsxs("div", { className: "animate-pulse space-y-4", children: [_jsx("div", { className: "h-14 rounded-xl bg-white/5" }), _jsx("div", { className: "rounded-xl bg-white/5 overflow-hidden", children: Array.from({ length: PAGE_SIZE }).map((_, i) => (_jsx("div", { className: "h-12 border-b border-white/[0.04] bg-white/[0.02]" }, i))) })] }));
}
// ─── Main Component ───────────────────────────────────────────────────────────
export default function Incidents() {
    const [q, setQ] = useState('');
    const [sev, setSev] = useState('All');
    const [decade, setDecade] = useState('All');
    const [sortKey, setSortKey] = useState('date');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    // ✅ FIX 3: pass all filter state to hook — server handles filter/sort/paginate
    const { data, isLoading, isError } = useIncidents({
        page,
        pageSize: PAGE_SIZE,
        severity: sev,
        decade,
        search: q,
        sortKey,
        sortDir,
    });
    // ✅ FIX 4: all pagination/count values come from API response
    const pageData = (data?.incidents ?? []);
    const totalPages = data?.totalPages ?? 1;
    const totalCount = data?.total ?? 0;
    // ─── Sort toggle — resets to page 1 ─────────────────────────────────────────
    const toggleSort = (key) => {
        if (sortKey === key)
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else {
            setSortKey(key);
            setSortDir('asc');
        }
        setPage(1);
    };
    // ─── Filter change helpers ────────────────────────────────────────────────
    const handleSearch = (v) => { setQ(v); setPage(1); };
    const handleSev = (v) => { setSev(v); setPage(1); };
    const handleDecade = (v) => { setDecade(v); setPage(1); };
    // ─── Render ───────────────────────────────────────────────────────────────
    return (_jsxs("div", { children: [_jsx(PageHeader, { icon: Table2, title: "Incident Records", subtitle: "Searchable and filterable aviation incident database" }), _jsx(GlassCard, { delay: 0.05, className: "p-4 mb-5", children: _jsxs("div", { className: "flex flex-wrap gap-3 items-center", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" }), _jsx("input", { type: "search", placeholder: "Search operator, aircraft, location\u2026", value: q, onChange: e => handleSearch(e.target.value), "aria-label": "Search incidents", className: "w-full pl-9 pr-4 py-2 rounded-lg text-sm\n                         bg-white/[0.04] border border-white/[0.08]\n                         text-slate-300 placeholder-slate-600\n                         focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06]\n                         transition-colors" })] }), _jsx("div", { className: "flex items-center gap-1", children: SEVERITIES.map(s => (_jsx("button", { onClick: () => handleSev(s), "aria-pressed": sev === s, className: clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500', sev === s
                                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
                                    : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/[0.06]'), children: s }, s))) }), _jsx("select", { value: decade, onChange: e => handleDecade(e.target.value), "aria-label": "Filter by decade", className: "px-3 py-2 rounded-lg text-xs bg-white/[0.04]\n                       border border-white/[0.08] text-slate-400\n                       focus:outline-none focus:border-cyan-500/50\n                       transition-colors", children: DECADES.map(d => (_jsx("option", { value: d, children: d === 'All' ? 'All decades' : d }, d))) }), _jsxs("span", { className: "text-xs text-slate-600 ml-auto", children: [isLoading ? '…' : totalCount.toLocaleString(), " results"] })] }) }), isLoading && _jsx(LoadingSkeleton, {}), isError && (_jsxs("div", { className: "flex flex-col items-center justify-center h-64 gap-3", children: [_jsx(AlertTriangle, { className: "text-red-400", size: 32 }), _jsxs("p", { className: "text-slate-400 text-sm", children: ["Failed to load incidents. Is the backend running on", ' ', _jsx("code", { className: "text-cyan-400", children: "localhost:8000" }), "?"] }), _jsx("button", { onClick: () => window.location.reload(), className: "text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg hover:bg-cyan-400/10 transition-colors", children: "Retry" })] })), !isLoading && !isError && (_jsxs(GlassCard, { delay: 0.1, className: "overflow-hidden", children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-xs", role: "grid", "aria-label": "Incident records", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-white/[0.06]", children: [COLS.map(c => (_jsxs("th", { onClick: () => toggleSort(c.key), className: clsx('px-4 py-3 text-left font-medium text-slate-500', 'hover:text-slate-300 cursor-pointer select-none transition-colors', c.width), "aria-sort": sortKey === c.key
                                                    ? sortDir === 'asc' ? 'ascending' : 'descending'
                                                    : 'none', children: [c.label, _jsx(SortIcon, { col: c.key, sortKey: sortKey, dir: sortDir })] }, c.key))), _jsx("th", { className: "px-4 py-3 text-left font-medium text-slate-500 min-w-[160px]", children: "Summary" })] }) }), _jsxs("tbody", { children: [_jsx(AnimatePresence, { mode: "wait", children: pageData.map((row, i) => (_jsxs(motion.tr, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { delay: i * 0.02, duration: 0.2 }, className: "border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors", children: [_jsx("td", { className: "px-4 py-3 text-slate-400 tabular-nums", children: row.date }), _jsx("td", { className: "px-4 py-3 text-slate-300 font-medium", children: row.operator }), _jsx("td", { className: "px-4 py-3 text-slate-400", children: row.aircraft }), _jsx("td", { className: "px-4 py-3 text-slate-400", children: row.location }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { label: row.severity }) }), _jsx("td", { className: "px-4 py-3 text-slate-400 tabular-nums text-right pr-6", children: row.fatalities === 0
                                                            ? _jsx("span", { className: "text-emerald-500", children: "0" })
                                                            : _jsx("span", { className: "text-red-400", children: row.fatalities.toLocaleString() }) }), _jsx("td", { className: "px-4 py-3 text-slate-400 tabular-nums", children: row.aboard }), _jsx("td", { className: "px-4 py-3 text-slate-500 max-w-[200px]", children: _jsx("p", { className: "line-clamp-2 leading-relaxed", children: row.summary }) })] }, row.id))) }), pageData.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-12 text-center text-slate-600", children: "No incidents match the current filters." }) }))] })] }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between px-4 py-3\n                            border-t border-white/[0.06] text-xs text-slate-500", children: [_jsxs("span", { children: ["Page ", page, " of ", totalPages, " \u00B7 ", totalCount.toLocaleString(), " total"] }), _jsx("div", { className: "flex gap-1", children: Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                    // If totalPages ≤ 7 just show all; otherwise show window around current page
                                    const p = totalPages <= 7
                                        ? i + 1
                                        : Math.min(Math.max(page - 3, 1) + i, totalPages);
                                    return (_jsx("button", { onClick: () => setPage(p), "aria-current": page === p ? 'page' : undefined, className: clsx('w-7 h-7 rounded-md font-medium transition-all', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500', page === p
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'), children: p }, p));
                                }) })] }))] }))] }));
}
//# sourceMappingURL=Incidents.js.map