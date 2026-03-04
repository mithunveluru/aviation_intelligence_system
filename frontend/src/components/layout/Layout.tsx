import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AviationBg from './AviationBg'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-navy-950">
      <AviationBg />
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto relative z-10"
        id="main-content"
        tabIndex={-1}
      >
        <div className="max-w-[1400px] mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
