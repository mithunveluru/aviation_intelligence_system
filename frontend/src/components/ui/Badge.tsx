import clsx from 'clsx'

interface Props { label: string; className?: string }

const map: Record<string, string> = {
  Fatal:    'bg-red-500/12 text-red-400 border-red-500/20 ring-red-500/10',
  Severe:   'bg-amber-500/12 text-amber-400 border-amber-500/20 ring-amber-500/10',
  Moderate: 'bg-blue-500/12 text-blue-400 border-blue-500/20 ring-blue-500/10',
  Minor:    'bg-emerald-500/12 text-emerald-400 border-emerald-500/20 ring-emerald-500/10',
  Unknown:  'bg-slate-500/10 text-slate-500 border-slate-500/15 ring-slate-500/10',
}

export default function Badge({ label, className }: Props) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border',
      map[label] ?? map.Unknown,
      className,
    )}>
      {label}
    </span>
  )
}
