import { BrainCircuit, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import GlassCard from '../components/ui/GlassCard'
import PageHeader from '../components/ui/PageHeader'
import { useModelMetrics, useConfusionMatrix, useModelMetricsFull } from '../hooks/useAnalysis'
import clsx from 'clsx'

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl
                    bg-white/[0.03] border border-white/[0.06]">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <span className={clsx('text-2xl font-bold tabular-nums', color)}>{value}</span>
    </div>
  )
}

function cellColor(val: number, rowMax: number, isCorrect: boolean) {
  const t = val / (rowMax || 1)
  if (isCorrect) return `rgba(6,182,212,${0.12 + t * 0.55})`
  return `rgba(239,68,68,${0.04 + t * 0.35})`
}


function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="h-80 rounded-xl bg-white/5 lg:col-span-3" />
        <div className="h-80 rounded-xl bg-white/5 lg:col-span-2" />
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="text-red-400" size={32} />
      <p className="text-slate-400 text-sm">
        Failed to load model metrics. Is the backend running on{' '}
        <code className="text-cyan-400">localhost:8000</code>?
      </p>
      <button
        onClick={() => window.location.reload()}
        className="text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg hover:bg-cyan-400/10 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

export default function Model() {
  const { data: metrics,     isLoading: metricsLoading, isError: metricsError } = useModelMetrics()
  const { data: confusion,   isLoading: confLoading,    isError: confError    } = useConfusionMatrix()
  const { data: fullMetrics, isLoading: fullLoading                            } = useModelMetricsFull()

  const isLoading = metricsLoading || confLoading || fullLoading
  const isError   = metricsError   || confError

  if (isLoading) return <LoadingSkeleton />
  if (isError)   return <ErrorState />


  const accuracy  = metrics?.accuracy          ?? 0
  const f1        = metrics?.f1Weighted        ?? 0
  const precision = metrics?.precisionWeighted ?? 0
  const recall    = metrics?.recallWeighted    ?? 0

  const classReport = fullMetrics?.classificationReport ?? {}
  const CLASS_NAMES: string[] =
    confusion?.classNames?.length
      ? confusion.classNames
      : Object.keys(classReport).filter(
          k => !['accuracy', 'macro avg', 'weighted avg'].includes(k)
        )
  const MATRIX: number[][]    = confusion?.matrix     ?? []
  const rowMaxes = MATRIX.map((row: number[]) => Math.max(...row, 1))
  
  const perClass = CLASS_NAMES
    .filter((name: string) =>
      classReport[name] && typeof classReport[name] === 'object'
    )
    .map((name: string) => {
      const row = classReport[name]
      return {
        label:     name,
        precision: row?.precision    ?? 0,
        recall:    row?.recall       ?? 0,
        f1:        row?.['f1-score'] ?? 0,  
        support:   row?.support      ?? 0,
      }
    })

  const nEstimators  = metrics?.nEstimators    ?? 200
  const trainSamples = metrics?.trainingSamples ?? 0
  const testSamples  = metrics?.testSamples     ?? 0

 
  return (
    <div>
      <PageHeader
        icon={BrainCircuit}
        title="Model Performance"
        subtitle="Random Forest severity classifier — Phase 5 evaluation metrics"
      />

      {/* Top metric pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricPill
          label="Accuracy"
          value={`${(accuracy  * 100).toFixed(1)}%`}
          color="text-cyan-400"
        />
        <MetricPill
          label="F1 Score"
          value={`${(f1        * 100).toFixed(1)}%`}
          color="text-teal-400"
        />
        <MetricPill
          label="Precision"
          value={`${(precision * 100).toFixed(1)}%`}
          color="text-violet-400"
        />
        <MetricPill
          label="Recall"
          value={`${(recall    * 100).toFixed(1)}%`}
          color="text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Confusion matrix — spans 3 cols */}
        <GlassCard delay={0.1} className="p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Confusion Matrix</h2>
          <p className="text-xs text-slate-500 mb-5">
            Actual classes → rows · Predicted classes → columns
          </p>

          {MATRIX.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              No confusion matrix data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" role="table" aria-label="Confusion matrix">
                <thead>
                  <tr>
                    <th className="text-left text-slate-600 font-medium pb-3 pr-3 w-20">
                      Act \ Pred
                    </th>
                    {CLASS_NAMES.map((n: string) => (
                      <th
                        key={n}
                        className="text-center text-slate-400 font-medium pb-3 px-2 min-w-[72px]"
                      >
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row: number[], ri: number) => (
                    <tr key={ri}>
                      <td className="text-slate-400 font-medium pr-3 py-1">
                        {CLASS_NAMES[ri]}
                      </td>
                      {row.map((val: number, ci: number) => (
                        <td key={ci} className="px-2 py-1 text-center">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: 0.1 + (ri * CLASS_NAMES.length + ci) * 0.02,
                            }}
                            className="rounded-lg py-2 font-semibold tabular-nums"
                            style={{
                              background: cellColor(val, rowMaxes[ri], ri === ci),
                              color:
                                ri === ci
                                  ? '#67e8f9'
                                  : val > rowMaxes[ri] * 0.3
                                  ? '#fca5a5'
                                  : '#94a3b8',
                            }}
                          >
                            {val}
                          </motion.div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(6,182,212,0.5)' }} />
              Correct prediction
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.35)' }} />
              Misclassification
            </span>
          </div>
        </GlassCard>

        {/* Per-class metrics — spans 2 cols */}
        <GlassCard delay={0.15} className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Per-Class Metrics</h2>
          <p className="text-xs text-slate-500 mb-4">Precision / Recall / F1</p>

          {perClass.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              No per-class data available.
            </div>
          ) : (
            <div className="space-y-4">
              {perClass.map((pc, i) => (
                <motion.div
                  key={pc.label}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-300">{pc.label}</span>
                    <span className="text-[10px] text-slate-500">
                      support: {pc.support.toLocaleString()}
                    </span>
                  </div>
                  {[
                    { key: 'precision', val: pc.precision, color: '#8b5cf6' },
                    { key: 'recall',    val: pc.recall,    color: '#f59e0b' },
                    { key: 'f1',        val: pc.f1,        color: '#06b6d4' },
                  ].map(({ key, val, color }) => (
                    <div key={key} className="flex items-center gap-2 mb-1">
                      <span className="w-14 text-[10px] text-slate-500 capitalize">{key}</span>
                      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val * 100}%` }}
                          transition={{
                            delay: 0.3 + i * 0.07,
                            duration: 0.6,
                            ease: 'easeOut',
                          }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                      <span className="w-8 text-right text-[10px] font-medium text-slate-300 tabular-nums">
                        {(val * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
          )}

          {/* Model info — live from API */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-1.5 text-[10px] text-slate-500">
            {([
              ['Algorithm',   `Random Forest (n=${nEstimators})`],
              ['Features',    '8 contextual features'],
              ['Train set',   `${trainSamples.toLocaleString()} incidents`],
              ['Test set',    `${testSamples.toLocaleString()} incidents`],
              ['aboard Δ F1', '+6.8% improvement'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}</span>
                <span className="text-slate-400 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
