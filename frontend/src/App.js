import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import Clusters from './pages/Clusters';
import Analysis from './pages/Analysis';
import Model from './pages/Model';
import Incidents from './pages/Incidents';
const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});
export default function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsx(Routes, { children: _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Overview, {}) }), _jsx(Route, { path: "clusters", element: _jsx(Clusters, {}) }), _jsx(Route, { path: "analysis", element: _jsx(Analysis, {}) }), _jsx(Route, { path: "model", element: _jsx(Model, {}) }), _jsx(Route, { path: "incidents", element: _jsx(Incidents, {}) })] }) }) }) }));
}
//# sourceMappingURL=App.js.map