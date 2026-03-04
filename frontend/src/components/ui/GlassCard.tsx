import { motion } from 'framer-motion'
import clsx from 'clsx'

interface Props {
  children: React.ReactNode
  className?: string
  hover?: boolean
  delay?: number
  onClick?: () => void
}

export default function GlassCard({ children, className, hover, delay = 0, onClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      whileHover={hover ? { y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.55)' } : undefined}
      onClick={onClick}
      className={clsx(
        'glass rounded-xl',
        hover && 'cursor-pointer transition-shadow duration-150',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
