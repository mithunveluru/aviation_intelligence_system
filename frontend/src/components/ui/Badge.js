import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
const map = {
    Fatal: 'bg-red-500/15 text-red-400 border-red-500/20',
    Severe: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Moderate: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    Minor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    Unknown: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};
export default function Badge({ label, className }) {
    return (_jsx("span", { className: clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', map[label] ?? map.Unknown, className), children: label }));
}
//# sourceMappingURL=Badge.js.map