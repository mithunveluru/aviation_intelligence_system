import clsx from 'clsx'

interface Props { label: string; className?: string }

const map: Record<string, string> = {
  Fatal:    'bg-red-500/15 text-red-400 border-red-500/20',
  Severe:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  Moderate: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Minor:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Unknown:  'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

export default function Badge({ label, className }: Props) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
      map[label] ?? map.Unknown,
      className,
    )}>
      {label}
    </span>
  )
}
