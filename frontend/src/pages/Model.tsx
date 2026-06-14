import { BrainCircuit, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import GlassCard  from '../components/ui/GlassCard'
import PageHeader from '../components/ui/PageHeader'
import ErrorState from '../components/ui/ErrorState'
import { useModelMetrics, useConfusionMatrix, useModelMetricsFull } from '../hooks/useAnalysis'
import { fmtRate, fmtCount } from '../utils/format'
import clsx from 'clsx'

// ─── Metric Pill ──────────────────────────────────────────────────────────────
function MetricPill({
  label, value, color, sub,
}: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="panel rounded-xl p-5">
      <p className="metric-label mb-3">{label}</p>
      <p className={clsx('text-3xl font-bold tabular-nums leading-none mb-1', color)}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-600">{sub}</p>}
    </div>
  )
}

// ─── Cell colour ──────────────────────────────────────────────────────────────
function cellBg(val: number, rowMax: number, isCorrect: boolean) {
  const t = val / (rowMax || 1)
  if (isCorrect) return `rgba(6,182,212,${0.10 + t * 0.50})`
  return `rgba(239,68,68,${0.03 + t * 0.30})`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl skeleton" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="h-80 rounded-xl skeleton lg:col-span-3" />
        <div className="h-80 rounded-xl skeleton lg:col-span-2" />
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Model() {
  const { data: metrics,     isLoading: ml, isError: me } = useModelMetrics()
  const { data: confusion,   isLoading: cl, isError: ce } = useConfusionMatrix()
  const { data: fullMetrics, isLoading: fl               } = useModelMetricsFull()

  const isLoading = ml || cl || fl
  const isError   = me || ce

  if (isLoading) return <LoadingSkeleton />
  if (isError)   return <ErrorState />

  const accuracy  = metrics?.accuracy          ?? 0
  const f1        = metrics?.f1Weighted        ?? 0
  const precision = metrics?.precisionWeighted ?? 0
  const recall    = metrics?.recallWeighted    ?? 0

  const classReport = fullMetrics?.classificationReport ?? {}
  const CLASS_NAMES: string[] = confusion?.classNames?.length
    ? confusion.classNames
    : Object.keys(classReport).filter(
        k => !['accuracy', 'macro avg', 'weighted avg'].includes(k),
      )
  const MATRIX: number[][] = confusion?.matrix ?? []
  const rowMaxes = MATRIX.map((row: number[]) => Math.max(...row, 1))

  const perClass = CLASS_NAMES
    .filter((n: string) => classReport[n] && typeof classReport[n] === 'object')
    .map((n: string) => {
      const row = classReport[n]
      return {
        label:     n,
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
        subtitle="XGBoost severity classifier — evaluation metrics and per-class analysis"
      >
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
          <CheckCircle size={12} />
          <span>Trained</span>
        </div>
      </PageHeader>

      {/* Metric Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <MetricPill
          label="Accuracy"
          value={fmtRate(accuracy)}
          color="text-cyan-400"
          sub="Overall correct predictions"
        />
        <MetricPill
          label="F1 Score"
          value={fmtRate(f1)}
          color="text-teal-400"
          sub="Weighted by class support"
        />
        <MetricPill
          label="Precision"
          value={fmtRate(precision)}
          color="text-violet-400"
          sub="True pos / predicted pos"
        />
        <MetricPill
          label="Recall"
          value={fmtRate(recall)}
          color="text-amber-400"
          sub="True pos / actual pos"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Confusion Matrix */}
        <GlassCard delay={0.1} className="p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Confusion Matrix</h2>
          <p className="text-xs text-slate-500 mb-5">
            Actual classes → rows · Predicted → columns · diagonal = correct
          </p>

          {MATRIX.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
              No confusion matrix data available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-xs"
                role="table"
                aria-label="Confusion matrix"
              >
                <thead>
                  <tr>
                    <th className="text-left text-slate-600 font-medium pb-3 pr-3 text-[11px]">
                      Act \ Pred
                    </th>
                    {CLASS_NAMES.map((n: string) => (
                      <th
                        key={n}
                        className="text-center text-slate-400 font-medium pb-3 px-2 min-w-[68px] text-[11px]"
                      >
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row: number[], ri: number) => (
                    <tr key={ri}>
                      <td className="text-slate-400 font-medium pr-3 py-1 text-[11px]">
                        {CLASS_NAMES[ri]}
                      </td>
                      {row.map((val: number, ci: number) => (
                        <td key={ci} className="px-2 py-1 text-center">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: 0.1 + (ri * CLASS_NAMES.length + ci) * 0.015,
                            }}
                            className="rounded-md py-2 text-xs font-semibold tabular-nums"
                            style={{
                              background: cellBg(val, rowMaxes[ri], ri === ci),
                              color:
                                ri === ci
                                  ? '#67e8f9'
                                  : val > rowMaxes[ri] * 0.3
                                  ? '#fca5a5'
                                  : '#64748b',
                            }}
                          >
                            {fmtCount(val)}
                          </motion.div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-4 mt-5 text-[10px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(6,182,212,0.45)' }} />
              Correct prediction
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.30)' }} />
              Misclassification
            </span>
          </div>
        </GlassCard>

        {/* Per-Class Metrics */}
        <GlassCard delay={0.15} className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Per-Class Metrics</h2>
          <p className="text-xs text-slate-500 mb-5">Precision / Recall / F1 per severity class</p>

          {perClass.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
              No per-class data.
            </div>
          ) : (
            <div className="space-y-5">
              {perClass.map((pc, i) => (
                <motion.div
                  key={pc.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-300">{pc.label}</span>
                    <span className="text-[10px] text-slate-600 tabular-nums">
                      n = {fmtCount(pc.support)}
                    </span>
                  </div>
                  {[
                    { key: 'Precision', val: pc.precision, color: '#8b5cf6' },
                    { key: 'Recall',    val: pc.recall,    color: '#f59e0b' },
                    { key: 'F1',        val: pc.f1,        color: '#06b6d4' },
                  ].map(({ key, val, color }) => (
                    <div key={key} className="flex items-center gap-2 mb-1">
                      <span className="w-14 text-[10px] text-slate-600">{key}</span>
                      <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val * 100}%` }}
                          transition={{
                            delay: 0.3 + i * 0.07,
                            duration: 0.55,
                            ease: 'easeOut',
                          }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                      <span className="w-9 text-right text-[10px] font-medium text-slate-400 tabular-nums">
                        {fmtRate(val, 0)}
                      </span>
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
          )}

          {/* Model info */}
          <div className="mt-5 pt-4 divider space-y-1.5">
            {([
              ['Algorithm',    `XGBoost (n_estimators=${nEstimators})`],
              ['Train set',    `${fmtCount(trainSamples)} incidents`],
              ['Test set',     `${fmtCount(testSamples)} incidents`],
              ['TF-IDF vocab', `${fmtCount(fullMetrics?.tfidfVocabSize ?? 600)} terms`],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[10px]">
                <span className="text-slate-600">{k}</span>
                <span className="text-slate-400 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  )
}
