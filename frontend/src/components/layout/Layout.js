import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AviationBg from './AviationBg';
export default function Layout() {
    return (_jsxs("div", { className: "flex h-screen overflow-hidden bg-navy-950", children: [_jsx(AviationBg, {}), _jsx(Sidebar, {}), _jsx("main", { className: "flex-1 overflow-y-auto relative z-10", id: "main-content", tabIndex: -1, children: _jsx("div", { className: "max-w-[1400px] mx-auto p-6", children: _jsx(Outlet, {}) }) })] }));
}
//# sourceMappingURL=Layout.js.map