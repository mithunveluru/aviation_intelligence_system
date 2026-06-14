import { AlertCircle, RefreshCw } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:10000'

interface Props {
  message?: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20
                      flex items-center justify-center">
        <AlertCircle className="text-red-400" size={18} />
      </div>
      <div className="text-center">
        <p className="text-slate-300 text-sm font-medium mb-1">
          Failed to load data
        </p>
        <p className="text-slate-600 text-xs max-w-xs leading-relaxed">
          {message ?? (
            <>
              Backend unreachable at{' '}
              <code className="text-cyan-500/70 font-mono">{API_BASE}</code>
            </>
          )}
        </p>
      </div>
      <button
        onClick={onRetry ?? (() => window.location.reload())}
        className="flex items-center gap-1.5 text-xs text-slate-500 border border-white/[0.08]
                   px-3 py-1.5 rounded-lg hover:text-slate-300 hover:border-white/[0.15]
                   transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  )
}
