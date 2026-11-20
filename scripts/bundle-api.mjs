import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outfile = join(root, 'api/[name].js')

await build({
  entryPoints: [join(root, 'server/vercelHandler.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  legalComments: 'none',
  alias: { '@': join(root, 'src') },
  // pg 的 native 支持是可选依赖，本地不装；留着会被 esbuild 当成必解析依赖而报错。
  external: ['pg-native'],
  banner: { js: '/* Generated from server/vercelHandler.ts. Do not edit. */' },
})

const bundled = readFileSync(outfile, 'utf8')
if (/from\s+["'](?:\.\.?\/|server\/)/.test(bundled)) {
  throw new Error('API bundle still imports project files at runtime')
}
