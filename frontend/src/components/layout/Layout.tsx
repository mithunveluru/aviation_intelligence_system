import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AviationBg from './AviationBg'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <AviationBg />
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto relative z-10"
        id="main-content"
        tabIndex={-1}
      >
        <div className="max-w-[1440px] mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
