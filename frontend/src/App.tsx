import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import Layout    from './components/layout/Layout'
import Overview  from './pages/Overview'
import Clusters  from './pages/Clusters'
import Analysis  from './pages/Analysis'
import Model     from './pages/Model'
import Incidents from './pages/Incidents'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 3,           
      retryDelay: 5000,   
    },
  },
})

export default function App() {
 
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/`)
      .catch(() => {})
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index            element={<Overview  />} />
            <Route path="clusters"  element={<Clusters  />} />
            <Route path="analysis"  element={<Analysis  />} />
            <Route path="model"     element={<Model     />} />
            <Route path="incidents" element={<Incidents />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
