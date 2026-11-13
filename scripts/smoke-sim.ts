/**
 * 冒烟测试（不依赖浏览器）：
 * 1. 12 关标准代码是否都能跑通、出图/出字
 * 2. 四类常见错误的提示是否命中正确类别
 * 3. 「改一改」参数改写后是否仍能运行
 *
 * 运行：npm run smoke
 */
import { LEVELS } from '../src/mock/levels'
import { SimError, simulate } from '../src/lib/python-sim'
import { applyParam } from '../src/lib/runner'

let failed = 0

const ok = (msg: string) => console.log(`  ✓ ${msg}`)
const bad = (msg: string) => {
  failed++
  console.log(`  ✗ ${msg}`)
}

console.log('\n[1] 12 关标准代码')
for (const level of LEVELS) {
  const code = level.teach_code_lines.join('\n')
  try {
    const result = simulate(code)
    const detail =
      level.preview_kind === 'text'
        ? `文字 ${JSON.stringify(result.text)}`
        : `笔迹 ${result.strokes.length} 段 · 宽 ${(result.bounds.maxX - result.bounds.minX).toFixed(0)} 高 ${(result.bounds.maxY - result.bounds.minY).toFixed(0)}`
    ok(`${level.level_id} ${level.title} → ${detail}`)
    if (level.preview_kind === 'turtle' && result.strokes.length === 0) {
      bad(`${level.level_id} 应该画出图形，但没有笔迹`)
    }
  } catch (err) {
    bad(`${level.level_id} 跑不通：${err instanceof Error ? err.message : String(err)}`)
  }
}

console.log('\n[2] 参数改写')
const variants: { id: string; code: string; label: string }[] = [
  { id: 'L07', code: 'sides = 8\nfor i in range(sides):\n    t.forward(80)\n    t.right(360 / sides)', label: 'sides=8' },
  { id: 'L08', code: 'sides = 3\nif sides > 5:\n    t.color("teal")\nelse:\n    t.color("orange")\nfor i in range(sides):\n    t.forward(80)\n    t.right(360 / sides)', label: 'sides=3 走 else' },
  {
    id: 'L12',
    code: 'petals = 8\nsize = 110\nfor i in range(petals):\n    t.color("teal")\n    for j in range(4):\n        t.forward(size)\n        t.right(90)\n    t.right(360 / petals)',
    label: 'petals=8 size=110',
  },
  { id: 'L04', code: 'size = 180\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)\nt.forward(size)\nt.right(90)', label: 'size=180' },
]
for (const variant of variants) {
  try {
    const result = simulate(variant.code)
    ok(`${variant.id} ${variant.label} → 笔迹 ${result.strokes.length} 段`)
  } catch (err) {
    bad(`${variant.id} ${variant.label} 失败：${err instanceof Error ? err.message : String(err)}`)
  }
}

console.log('\n[2b] 每个 challenge_param 单独改一次，仍能跑通')
for (const level of LEVELS) {
  const base = level.teach_code_lines.join('\n')
  for (const param of level.challenge_params) {
    const altValue = () => {
      if (param.type === 'select') {
        const other = (param.options ?? []).find((o) => String(o.value) !== String(param.default))
        return other?.value ?? param.default
      }
      const num = Number(param.default)
      const max = param.max ?? num
      const min = param.min ?? num
      return num === max ? min : max
    }
    let code = base
    for (const p of level.challenge_params) {
      code = applyParam(code, p, p.name === param.name ? altValue() : p.default)
    }
    try {
      const result = simulate(code)
      if (code === base) {
        bad(`${level.level_id}.${param.name} 改写后代码没有变化`)
        continue
      }
      ok(`${level.level_id}.${param.name}=${altValue()} → 笔迹 ${result.strokes.length} 段`)
    } catch (err) {
      bad(`${level.level_id}.${param.name} 失败：${err instanceof Error ? err.message : String(err)}`)
    }
  }
}

console.log('\n[2c] 正方形四边必须一起改，否则不成正方形')
{
  const level = LEVELS.find((l) => l.level_id === 'L03')
  if (!level) bad('找不到 L03')
  else {
    const edge = level.challenge_params.find((p) => p.name === 'edge')
    if (!edge) bad('L03 缺少边长参数')
    else {
      const code = applyParam(level.teach_code_lines.join('\n'), edge, 180)
      const forwards = code.split('\n').filter((l) => l.includes('forward'))
      if (forwards.every((l) => l === 't.forward(180)')) {
        ok(`四条边一起改成 180：${forwards.join(' / ')}`)
      } else {
        bad(`只有部分边被改：${forwards.join(' / ')}`)
      }
    }
  }
}

console.log('\n[3] 四类错误的归类')
const errorCases: { label: string; code: string; expect: SimError['pattern'] }[] = [
  { label: '中文括号', code: 'print("你好"）', expect: 'cjk' },
  { label: '括号没配对', code: 't.forward(100', expect: 'paren' },
  { label: '冒号后没缩进', code: 'for i in range(4):\nt.forward(100)', expect: 'indent' },
  { label: '缩进多了', code: 'size = 100\n        t.forward(size)', expect: 'indent' },
  { label: '动作名拼错', code: 't.forwart(100)', expect: 'name' },
]
for (const item of errorCases) {
  try {
    simulate(item.code)
    bad(`${item.label}：没有报错，应该报 ${item.expect}`)
  } catch (err) {
    if (err instanceof SimError && err.pattern === item.expect) {
      ok(`${item.label} → ${err.pattern} 第 ${err.line} 行`)
    } else {
      bad(`${item.label}：期望 ${item.expect}，实际 ${err instanceof SimError ? err.pattern : String(err)}`)
    }
  }
}

console.log(failed === 0 ? '\n全部通过\n' : `\n${failed} 项未通过\n`)
process.exitCode = failed === 0 ? 0 : 1
