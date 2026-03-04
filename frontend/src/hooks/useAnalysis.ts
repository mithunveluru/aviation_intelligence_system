import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '../api/client';

const RUN_ID = 2;


export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const [overviewRes, clustersRes, metricsRes] = await Promise.all([
        api.get(endpoints.stats()),
        api.get(endpoints.clusters(RUN_ID)).catch(() => ({ data: { data: [] } })),
        api.get(endpoints.modelMetricsSummary(RUN_ID)).catch(() => ({ data: { data: {} } })),
      ]);

      const d = overviewRes.data.data;
      const clusters = clustersRes.data.data ?? [];
      const m = metricsRes.data.data ?? {};

      return {
        totalIncidents:    d.total_incidents       ?? 0,
        totalFatalities:   d.total_fatalities      ?? 0,
        totalAboard:       d.total_aboard          ?? 0,
        avgFatalityRate:   d.overall_fatality_rate ?? 0,
        survivalRate:      d.overall_survival_rate ?? 0,
        yearMin:           d.year_min              ?? 0,
        yearMax:           d.year_max              ?? 0,
        uniqueOperators:   d.unique_operators      ?? 0,
        uniqueAircraft:    d.unique_aircraft_types ?? 0,
        uniqueLocations:   d.unique_locations      ?? 0,
        totalClusters:     Array.isArray(clusters) ? clusters.length : 0,
        modelAccuracy:     m.accuracy              ?? 0,
        f1Weighted:        m.f1_weighted           ?? 0,
      };
    },
  });
}

export function useYearlyTrends() {
  return useQuery({
    queryKey: ['yearly-trends'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.yearlyTrends());


      return (data.data ?? []).map((d: any) => ({
        year:         d.year,
        incidents:    d.incident_count    ?? 0,
        fatalities:   d.total_fatalities  ?? 0,
        fatalityRate: d.avg_fatality_rate ?? 0,
      }));
    },
  });
}

export function useSeverityDist() {
  return useQuery({
    queryKey: ['severity-dist'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.severityDist());

     
      return data.data ?? [];
    },
  });
}

export function useDecadeBreakdown() {
  return useQuery({
    queryKey: ['decade-breakdown'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.decadeBreakdown());

  
      return (data.data ?? []).map((d: any) => ({
        decade:          d.decade_label       ?? d.decade ?? '',
        incidents:       d.incident_count     ?? 0,
        fatalities:      d.total_fatalities   ?? 0,
        avgFatalityRate: d.avg_fatality_rate  ?? 0,
      }));
    },
  });
}

export function useUMAPData() {
  return useQuery({
    queryKey: ['umap'],
    queryFn: async () => {
      const { data } = await api.get(endpoints.umapData());
      return (data.data ?? []).map((d: any) => ({
        id:        d.id,
        x:         d.x         ?? d.umap_x ?? 0,
        y:         d.y         ?? d.umap_y ?? 0,
        cluster:   d.cluster   ?? d.cluster_id ?? -1,
        severity:  d.severity  ?? d.severity_label ?? 'Unknown',
        fatalities:d.fatalities ?? 0,
        year:      d.year      ?? 0,
        operator:  d.operator  ?? 'Unknown',
      }));
    },
  });
}

export function useClusters() {
  return useQuery({
    queryKey: ['clusters', RUN_ID],
    queryFn: async () => {
      const { data } = await api.get(endpoints.clusters(RUN_ID));
   
      return (data.data ?? []).map((c: any) => ({
        clusterId:             c.id                      ?? c.cluster_id ?? 0,
        clusterLabel:          c.cluster_label != null
                                 ? `Cluster ${c.cluster_label}`
                                 : 'Unknown Cluster',
        incidentCount:         c.incident_count          ?? 0,
        avgFatalityRate:       c.avg_fatality_rate        ?? 0,
        avgFatalities:         c.avg_fatalities           ?? 0,
        dominantSeverity:      c.dominant_severity        ?? 'Unknown',
        topOperators:          c.top_operators            ?? [],
        topAircraftTypes:      c.top_aircraft_types       ?? [],
        yearRangeStart:        c.year_range_start         ?? c.year_min ?? '?',
        yearRangeEnd:          c.year_range_end           ?? c.year_max ?? '?',
        rootCauseSummary:      c.root_cause_summary       ?? 'LLM summary not yet available.',
        keyContributingFactors:Array.isArray(c.key_contributing_factors)
                                 ? c.key_contributing_factors
                                 : [],
        recommendations:       c.recommendations          ?? 'No recommendations yet.',
        confidenceScore:       c.confidence_score         ?? 0.75,
      }));
    },
  });
}

export function useModelMetrics() {
  return useQuery({
    queryKey: ['model-metrics', RUN_ID],
    queryFn: async () => {
      const { data } = await api.get(endpoints.modelMetricsSummary(RUN_ID));
      const d = data.data;

      return {
        accuracy:          d.accuracy           ?? 0,
        f1Weighted:        d.f1_weighted         ?? 0,
        precisionWeighted: d.precision_weighted  ?? 0,
        recallWeighted:    d.recall_weighted      ?? 0,
        nEstimators:       d.n_estimators         ?? 200,
        trainingSamples:   d.training_samples     ?? 0,
        testSamples:       d.test_samples         ?? 0,
        modelType:         d.model_type           ?? 'RandomForestClassifier',
        modelPath:         d.model_path           ?? '',
      };
    },
  });
}

export function useModelMetricsFull() {
  return useQuery({
    queryKey: ['model-metrics-full', RUN_ID],
    queryFn: async () => {
      const { data } = await api.get(endpoints.modelMetricsFull(RUN_ID));
      const d = data.data;
      const classificationReport = d.classification_report ?? {};
      return {
        ...d,
        classificationReport,  
      };
    },
  });
}

export function useConfusionMatrix() {
  return useQuery({
    queryKey: ['confusion-matrix', RUN_ID],
    queryFn: async () => {
      const { data } = await api.get(endpoints.confusionMatrix(RUN_ID));
      return data.data;
    },
  });
}

export function useFeatureImportances() {
  return useQuery({
    queryKey: ['feature-importances', RUN_ID],
    queryFn: async () => {
      const { data } = await api.get(endpoints.featureImportances(RUN_ID));
      return data.data;
    },
  });
}

export function useIncidents(params: {
  page: number;
  pageSize: number;
  severity: string;
  decade: string;
  search: string;
  sortKey: string;
  sortDir: string;
}) {
  return useQuery({
    queryKey: ['incidents', RUN_ID, params],
    queryFn: async () => {
      const { data } = await api.get(
        endpoints.incidents({ runId: RUN_ID, ...params })
      );

      const raw = data; 

      const items: any[] = raw?.data ?? [];
      const incidents = items.map((r: any) => ({
        id:                    r.id,
        date:                  r.date                     ?? '',
        operator:              r.operator                  ?? 'Unknown',
        aircraft:              r.aircraft_type             ?? r.aircraft ?? 'Unknown',
        location:              r.location                  ?? 'Unknown',
        fatalities:            r.fatalities                ?? 0,
        aboard:                r.aboard                    ?? 0,
        severity:              r.severity_label            ?? r.severity ?? 'Unknown',
        summary:               r.summary                   ?? '',
        cluster:               r.cluster_id                ?? -1,
        predictedSeverity:     r.predicted_severity        ?? '',
        predictionConfidence:  r.prediction_confidence     ?? 0,
        extractedCauseCategory:r.extracted_cause_category  ?? '',
        extractedPhaseOfFlight:r.extracted_phase_of_flight ?? '',
      }));

      return {
        incidents,
        total:      raw?.total       ?? 0,
        page:       raw?.page        ?? params.page,
        pageSize:   raw?.page_size   ?? params.pageSize,
        totalPages: raw?.total_pages ?? 1,
      };
    },
    placeholderData: (previousData: any) => previousData,
  });
}

