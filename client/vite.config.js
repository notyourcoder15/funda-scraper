import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/scrape': 'http://localhost:3001'
    }
  },
  build: {
    proxyTimeout: 60000
  }
})
