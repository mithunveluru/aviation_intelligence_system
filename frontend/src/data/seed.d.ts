export interface YearlyTrend {
    year: number;
    incidents: number;
    fatalities: number;
}
export interface ClusterCard {
    label: number;
    name: string;
    count: number;
    yearRange: string;
    dominantSeverity: string;
    fatalityRate: number;
    confidence: number;
    rootCause: string;
    factors: string[];
    recommendations: string;
    color: string;
}
export interface UMAPPoint {
    x: number;
    y: number;
    cluster: number;
    severity: string;
}
export interface DecadeBucket {
    decade: string;
    incidents: number;
    fatalities: number;
}
export interface IncidentRow {
    id: number;
    date: string;
    operator: string;
    aircraft: string;
    location: string;
    severity: 'Fatal' | 'Severe' | 'Moderate' | 'Minor';
    fatalities: number;
    aboard: number;
    summary: string;
}
export interface ModelMetrics {
    accuracy: number;
    f1: number;
    precision: number;
    recall: number;
    perClass: {
        label: string;
        precision: number;
        recall: number;
        f1: number;
        support: number;
    }[];
}
export interface ConfusionData {
    classNames: string[];
    matrix: number[][];
}
export declare const yearlyTrends: YearlyTrend[];
export declare const decadeData: DecadeBucket[];
export declare const severityData: {
    name: string;
    value: number;
    color: string;
}[];
export declare const clusterCards: ClusterCard[];
export declare const umapPoints: (UMAPPoint & {
    color: string;
})[];
export declare const confusionData: ConfusionData;
export declare const modelMetrics: ModelMetrics;
export declare const incidents: IncidentRow[];
//# sourceMappingURL=seed.d.ts.map