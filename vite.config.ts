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
      configurePreviewServer(server) {
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
          // 积木魔法模型数据约 500KB+，与首屏 BrickBuilder 拆开，打开弹窗再拉。
          if (/[\\/]brickMagicData\.[jt]sx?$/.test(id)) return 'brick-magic-data'
          if (/[\\/]brickMagicModels\.[jt]sx?$/.test(id)) return 'brick-magic-models'
          if (/[\\/]brickMagicParts\.[jt]sx?$/.test(id)) return 'brick-magic-parts'
          if (!id.includes('node_modules') || id.includes('pyodide')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react'
          }
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three'
          if (/[\\/]node_modules[\\/]@react-three[\\/]/.test(id)) return 'r3f'
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
    // 预转换 Blockly 首屏链路，避免 E2E 冷启动时首次 page.goto 卡在 Vite 依赖分析。
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/modules/blockly.tsx',
        './src/pages/blockly/BlocklyMap.tsx',
        './src/pages/blockly/BlocklyLesson.tsx',
        './src/pages/blockly/BlocklyWorkspace.tsx',
        './src/pages/blockly/StoryPlayer.tsx',
      ],
    },
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
