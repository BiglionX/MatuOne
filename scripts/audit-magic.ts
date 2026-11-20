// 魔法模型体检：模型必须连成一块，而且每块积木都要有依托。
// 用法：npm run audit:magic
//
// 规则实现在 src/pages/matupix/brick/brickMagicModels.ts 的 auditMagicStructure，
// 这里只负责把结果打出来，方便在命令行里跑。
import { MAGIC_MODELS, auditMagicModels, auditMagicStructure } from '../src/pages/matupix/brick/brickMagicModels.ts'

const overall = auditMagicModels()
let total = overall.problems.length

for (const model of MAGIC_MODELS) {
  const details = auditMagicStructure(model.pieces)
  total += details.length
  const tag = details.length === 0 ? 'ok  ' : 'FAIL'
  console.log(`${tag} ${model.id.padEnd(14)} pieces=${String(model.pieces.length).padStart(3)} issues=${details.length}`)
  for (const detail of details) console.log(`       ${detail}`)
}

for (const problem of overall.problems) console.log(`  ${problem}`)

console.log('')
console.log(`models=${MAGIC_MODELS.length} issues=${total}`)
if (total) process.exitCode = 1
