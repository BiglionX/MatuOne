import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { attachApi } from './server/attach'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'neon-api',
      configureServer(server) {
        attachApi(server.middlewares)
      },
    },
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'chrome87',
    cssTarget: 'chrome87',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules') || id.includes('pyodide')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: { ignored: ['**/_brand/**', '**/tmp-ldraw/**'] },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
