import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'  

import GlassCard from './GlassCard'
import clsx from 'clsx'

interface Props {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  accent?: 'cyan' | 'teal' | 'amber' | 'red' | 'emerald'
  delay?: number
}

const accentMap = {
  cyan:    { icon: 'text-cyan-400',    glow: 'shadow-cyan-500/20',   bg: 'bg-cyan-500/10'    },
  teal:    { icon: 'text-teal-400',    glow: 'shadow-teal-500/20',   bg: 'bg-teal-500/10'    },
  amber:   { icon: 'text-amber-400',   glow: 'shadow-amber-500/20',  bg: 'bg-amber-500/10'   },
  red:     { icon: 'text-red-400',     glow: 'shadow-red-500/20',    bg: 'bg-red-500/10'     },
  emerald: { icon: 'text-emerald-400', glow: 'shadow-emerald-500/20',bg: 'bg-emerald-500/10' },
}

export default function StatCard({ icon: Icon, label, value, sub, accent = 'cyan', delay = 0 }: Props) {
  const a = accentMap[accent]
  return (
    <GlassCard hover delay={delay} className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={clsx('p-2.5 rounded-lg', a.bg)}>
          <Icon size={18} className={a.icon} strokeWidth={1.8} />
        </div>
      </div>
    </GlassCard>
  )
}
