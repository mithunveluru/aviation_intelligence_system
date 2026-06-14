import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  subtitle: string
  children?: React.ReactNode
}

export default function PageHeader({ icon: Icon, title, subtitle, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-8 flex items-start justify-between"
    >
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <Icon size={17} className="text-cyan-400 flex-shrink-0" strokeWidth={2} />
          <h1 className="text-2xl font-semibold text-white tracking-tight leading-none">
            {title}
          </h1>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>
      </div>
      {children && (
        <div className="flex items-center gap-2 ml-6 mt-0.5 flex-shrink-0">
          {children}
        </div>
      )}
    </motion.div>
  )
}
