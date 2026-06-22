import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/scan': 'http://localhost:3000',
      '/threats': 'http://localhost:3000',
      '/reports': 'http://localhost:3000',
      '/dashboard': 'http://localhost:3000',
      '/clear': 'http://localhost:3000',
      '/virustotal': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/alerts': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    }
  }
})
