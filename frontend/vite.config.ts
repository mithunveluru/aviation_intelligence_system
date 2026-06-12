import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':   ['react', 'react-dom', 'react-router-dom'],
          'motion':         ['framer-motion'],
          'charts':         ['recharts'],
          'query':          ['@tanstack/react-query'],
          'ui':             ['lucide-react', 'clsx', 'axios'],
        },
      },
    },
  },
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:10000', changeOrigin: true },
    },
  },
})
