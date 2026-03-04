import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Network, BarChart3, BrainCircuit,
  Table2, ChevronLeft, ChevronRight, Plane,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Overview'  },
  { to: '/clusters', icon: Network,         label: 'Clusters'  },
  { to: '/analysis', icon: BarChart3,       label: 'Analysis'  },
  { to: '/model',    icon: BrainCircuit,    label: 'Model'     },
  { to: '/incidents',icon: Table2,          label: 'Incidents' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex-shrink-0 flex flex-col h-screen
                 bg-navy-900/80 backdrop-blur-xl
                 border-r border-white/[0.06] z-20"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/20
                        border border-cyan-500/30 flex items-center justify-center">
          <Plane size={15} className="text-cyan-400" strokeWidth={2} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <p className="text-xs font-bold text-slate-100 leading-tight whitespace-nowrap">
                AVIATION
              </p>
              <p className="text-[10px] text-cyan-500 font-medium tracking-widest whitespace-nowrap">
                INTELLIGENCE
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 p-2 mt-2" aria-label="Main navigation">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'transition-all duration-150 group relative',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
                active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent',
              )}
            >
              <Icon
                size={17}
                strokeWidth={active ? 2.2 : 1.8}
                className={clsx(
                  'flex-shrink-0 transition-colors',
                  active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300',
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute right-0 top-1/2 -translate-y-1/2
                             w-0.5 h-5 rounded-full bg-cyan-400"
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/[0.06]">
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center w-full p-2 rounded-lg
                     text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]
                     transition-colors duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          {collapsed
            ? <ChevronRight size={15} />
            : <ChevronLeft  size={15} />
          }
        </button>
      </div>
    </motion.aside>
  )
}
