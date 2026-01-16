import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../dist/app'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://10.0.0.15',
        changeOrigin: true,
      },
    },
  },
})
