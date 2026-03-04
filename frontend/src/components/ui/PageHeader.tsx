import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react' 


interface Props {
  icon: LucideIcon
  title: string
  subtitle: string
}

export default function PageHeader({ icon: Icon, title, subtitle }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Icon size={18} className="text-cyan-400" strokeWidth={1.8} />
        </div>
        <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      </div>
      <p className="text-sm text-slate-500 ml-12">{subtitle}</p>
    </motion.div>
  )
}
