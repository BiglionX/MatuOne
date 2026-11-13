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
  banner: { js: '/* Generated from server/vercelHandler.ts. Do not edit. */' },
})

const bundled = readFileSync(outfile, 'utf8')
if (/from\s+["'](?:\.\.?\/|server\/)/.test(bundled)) {
  throw new Error('API bundle still imports project files at runtime')
}
