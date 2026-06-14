import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Network, BarChart3, BrainCircuit,
  Table2, ChevronLeft, ChevronRight, Plane,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Overview',  desc: 'Global statistics' },
  { to: '/clusters',  icon: Network,         label: 'Clusters',  desc: 'Failure patterns'  },
  { to: '/analysis',  icon: BarChart3,       label: 'Analysis',  desc: 'Pattern deep-dive' },
  { to: '/model',     icon: BrainCircuit,    label: 'Model',     desc: 'ML performance'    },
  { to: '/incidents', icon: Table2,          label: 'Incidents', desc: 'Raw data records'  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 216 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="relative flex-shrink-0 flex flex-col h-screen
                 bg-[#050c1a] border-r border-white/[0.06] z-20"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-3.5 h-14 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg
                        bg-gradient-to-br from-cyan-500 to-blue-600
                        flex items-center justify-center
                        shadow-lg shadow-cyan-500/15">
          <Plane size={13} className="text-white" strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden min-w-0"
            >
              <p className="text-[13px] font-semibold text-slate-100 leading-tight whitespace-nowrap">
                Aviation Intel
              </p>
              <p className="text-[10px] text-slate-600 leading-tight whitespace-nowrap">
                Incident Analysis Platform
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 flex flex-col gap-0.5 p-2 mt-1 overflow-y-auto"
        aria-label="Main navigation"
      >
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
                'relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg',
                'transition-all duration-150 group',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                active
                  ? 'bg-white/[0.07] text-slate-100'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]',
              )}
            >
              {/* Left active indicator */}
              {active && (
                <motion.div
                  layoutId="navActive"
                  className="absolute left-0 top-1/2 -translate-y-1/2
                             w-[3px] h-5 rounded-full bg-cyan-400"
                />
              )}
              <Icon
                size={16}
                strokeWidth={active ? 2.2 : 1.8}
                className={clsx(
                  'flex-shrink-0 transition-colors',
                  active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400',
                )}
              />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.13 }}
                    className="text-[13px] font-medium whitespace-nowrap leading-none"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06]">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="px-3.5 pt-3 pb-1"
            >
              <p className="text-[10px] text-slate-700 leading-relaxed">
                6,900+ incidents · 1908–2020
              </p>
              <p className="text-[10px] text-slate-700">
                HDBSCAN · XGBoost · Groq LLM
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center w-full p-2.5
                     text-slate-600 hover:text-slate-400
                     transition-colors duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
        >
          {collapsed
            ? <ChevronRight size={14} />
            : <ChevronLeft  size={14} />
          }
        </button>
      </div>
    </motion.aside>
  )
}
