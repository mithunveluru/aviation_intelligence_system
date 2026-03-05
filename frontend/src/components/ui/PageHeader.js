import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
export default function PageHeader({ icon: Icon, title, subtitle }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: -8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 }, className: "mb-8", children: [_jsxs("div", { className: "flex items-center gap-3 mb-1", children: [_jsx("div", { className: "p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20", children: _jsx(Icon, { size: 18, className: "text-cyan-400", strokeWidth: 1.8 }) }), _jsx("h1", { className: "text-xl font-semibold text-slate-100", children: title })] }), _jsx("p", { className: "text-sm text-slate-500 ml-12", children: subtitle })] }));
}
//# sourceMappingURL=PageHeader.js.map