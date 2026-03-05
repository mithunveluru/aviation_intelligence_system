export declare function useStats(): import("@tanstack/react-query").UseQueryResult<{
    totalIncidents: any;
    totalFatalities: any;
    totalAboard: any;
    avgFatalityRate: any;
    survivalRate: any;
    yearMin: any;
    yearMax: any;
    uniqueOperators: any;
    uniqueAircraft: any;
    uniqueLocations: any;
    totalClusters: number;
    modelAccuracy: any;
    f1Weighted: any;
}, Error>;
export declare function useYearlyTrends(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useSeverityDist(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useDecadeBreakdown(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useUMAPData(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useClusters(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useModelMetrics(): import("@tanstack/react-query").UseQueryResult<{
    accuracy: any;
    f1Weighted: any;
    precisionWeighted: any;
    recallWeighted: any;
    nEstimators: any;
    trainingSamples: any;
    testSamples: any;
    modelType: any;
    modelPath: any;
}, Error>;
export declare function useModelMetricsFull(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useConfusionMatrix(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useFeatureImportances(): import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare function useIncidents(params: {
    page: number;
    pageSize: number;
    severity: string;
    decade: string;
    search: string;
    sortKey: string;
    sortDir: string;
}): import("@tanstack/react-query").UseQueryResult<{
    incidents: {
        id: any;
        date: any;
        operator: any;
        aircraft: any;
        location: any;
        fatalities: any;
        aboard: any;
        severity: any;
        summary: any;
        cluster: any;
        predictedSeverity: any;
        predictionConfidence: any;
        extractedCauseCategory: any;
        extractedPhaseOfFlight: any;
    }[];
    total: any;
    page: any;
    pageSize: any;
    totalPages: any;
}, Error>;
//# sourceMappingURL=useAnalysis.d.ts.map