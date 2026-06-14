import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  accent?: 'cyan' | 'teal' | 'amber' | 'red' | 'emerald' | 'blue' | 'violet'
  delay?: number
}

const accentMap = {
  cyan:    { icon: 'text-cyan-400',    bar: 'bg-cyan-500'    },
  teal:    { icon: 'text-teal-400',    bar: 'bg-teal-500'    },
  amber:   { icon: 'text-amber-400',   bar: 'bg-amber-500'   },
  red:     { icon: 'text-red-400',     bar: 'bg-red-500'     },
  emerald: { icon: 'text-emerald-400', bar: 'bg-emerald-500' },
  blue:    { icon: 'text-blue-400',    bar: 'bg-blue-500'    },
  violet:  { icon: 'text-violet-400',  bar: 'bg-violet-500'  },
}

export default function StatCard({
  icon: Icon, label, value, sub, accent = 'cyan', delay = 0,
}: Props) {
  const a = accentMap[accent]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: 'easeOut' }}
      className="relative overflow-hidden panel rounded-xl p-5 panel-hover"
    >
      {/* Accent top strip */}
      <div className={clsx('absolute top-0 left-0 right-0 h-[2px]', a.bar)} />

      {/* Label row */}
      <div className="flex items-center justify-between mb-3 mt-0.5">
        <p className="metric-label">{label}</p>
        <Icon size={14} className={clsx(a.icon, 'opacity-40')} strokeWidth={2} />
      </div>

      {/* Value */}
      <p className="stat-value">{value}</p>

      {/* Sub */}
      {sub && (
        <p className="text-[11px] text-slate-600 mt-1.5 leading-none">{sub}</p>
      )}
    </motion.div>
  )
}
