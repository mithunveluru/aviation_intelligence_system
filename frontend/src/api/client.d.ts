import { QueryClient } from '@tanstack/react-query';
export declare const queryClient: QueryClient;
export declare const api: import("axios").AxiosInstance;
export declare const endpoints: {
    stats: () => string;
    yearlyTrends: () => string;
    decadeBreakdown: () => string;
    severityDist: () => string;
    umapData: () => string;
    pipelineStatus: (runId: number) => string;
    clusters: (runId: number) => string;
    modelMetricsSummary: (runId: number) => string;
    modelMetricsFull: (runId: number) => string;
    confusionMatrix: (runId: number) => string;
    featureImportances: (runId: number) => string;
    incidents: (params: {
        runId: number;
        page?: number;
        pageSize?: number;
        severity?: string;
        decade?: string;
        search?: string;
        sortKey?: string;
        sortDir?: string;
    }) => string;
};
//# sourceMappingURL=client.d.ts.map