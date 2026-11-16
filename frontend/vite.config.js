import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        // Increase timeout for heavy NLP analysis requests (Render free tier can
        // take 60+ seconds for the first request after a cold start).
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
