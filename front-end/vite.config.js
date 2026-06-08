import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '10.14.77.183',
    proxy: {
      // Every /api/* call is forwarded to the Express backend.
      '/api': {
        target: 'http://10.14.77.183:5000',
        changeOrigin: true,
      },
    },
  },
})
