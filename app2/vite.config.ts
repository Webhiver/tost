import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import path from 'path'
// @ts-ignore
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '')

  return {
    plugins: [
        react(),
        tailwindcss()
    ],
    build: {
      outDir: path.resolve(__dirname, '../dist/app'),
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost',
          changeOrigin: true,
        },
      },
    },
  }
})
