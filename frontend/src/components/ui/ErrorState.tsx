import { AlertTriangle } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:10000'

interface Props {
  message?: string
}

export default function ErrorState({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="text-red-400" size={32} />
      <p className="text-slate-400 text-sm text-center max-w-sm">
        {message ?? (
          <>
            Failed to load data. Is the backend reachable at{' '}
            <code className="text-cyan-400 break-all">{API_BASE}</code>?
          </>
        )}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="text-xs text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg
                   hover:bg-cyan-400/10 transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        Retry
      </button>
    </div>
  )
}
