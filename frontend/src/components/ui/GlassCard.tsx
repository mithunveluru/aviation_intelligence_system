import { motion } from 'framer-motion'
import clsx from 'clsx'

interface Props {
  children: React.ReactNode
  className?: string
  hover?: boolean
  delay?: number
  onClick?: () => void
  variant?: 'panel' | 'glass'
}

export default function GlassCard({
  children, className, hover, delay = 0, onClick, variant = 'panel',
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      whileHover={hover ? { y: -2 } : undefined}
      onClick={onClick}
      className={clsx(
        variant === 'glass' ? 'glass' : 'panel',
        'rounded-xl',
        hover && 'cursor-pointer panel-hover',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
