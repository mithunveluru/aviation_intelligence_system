import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

console.log("API BASE =", API_BASE)

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── React Query Client ───────────────────────────────────────────────────────
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,  
    },
  },
});


// ─── API Endpoint Builders ────────────────────────────────────────────────────
export const endpoints = {

  // Match existing backend routes
  stats:           () => `/analysis/overview`,
  yearlyTrends:    () => `/analysis/trends/yearly`,
  decadeBreakdown: () => `/analysis/trends/decade`,
  severityDist:    () => `/analysis/severity-dist`,   // new endpoint (added below)
  umapData:        () => `/analysis/umap`,             // new endpoint (added below)

  // Pipeline
  pipelineStatus: (runId: number) => `/pipeline/${runId}/status`,

  // Clusters
  clusters: (runId: number) => `/clusters?run_id=${runId}`,

  // Model
  modelMetricsSummary:  (runId: number) => `/model/metrics/${runId}/summary`,
  modelMetricsFull:     (runId: number) => `/model/metrics/${runId}`,
  confusionMatrix:      (runId: number) => `/model/metrics/${runId}/confusion-matrix`,
  featureImportances:   (runId: number) => `/model/metrics/${runId}/feature-importances`,

  // Incidents
  incidents: (params: {
  runId: number;
  page?: number;
  pageSize?: number;
  severity?: string;
  decade?: string;
  search?: string;
  sortKey?: string;
  sortDir?: string;
}) => {
  const q = new URLSearchParams();
  // ✅ Backend has no run_id param — removed
  q.append('page',      String(params.page     ?? 1));
  q.append('page_size', String(params.pageSize ?? 12));

  if (params.severity && params.severity !== 'All')
    q.append('severity', params.severity);
  if (params.decade && params.decade !== 'All')
    q.append('decade',   params.decade);
  if (params.search && params.search.trim())
    q.append('search',   params.search.trim());
  if (params.sortKey)
    q.append('sort_key', params.sortKey);
  if (params.sortDir)
    q.append('sort_dir', params.sortDir);

  return `/incidents?${q.toString()}`;
},


};
