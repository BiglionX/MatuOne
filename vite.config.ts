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
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: { ignored: ['**/_brand/**'] },
  },
})
