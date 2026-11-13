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
import { checkTypedLine } from '../src/lib/lineCheck'
import { frameForLevel } from '../src/lib/canvasFrame'

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

console.log('\n[4] 第 5 关填空、第 6 关折叠、第 4–12 关报错映射')
{
  const l05 = LEVELS.find((level) => level.level_id === 'L05')
  if (!l05 || l05.level_type !== 'fill_blank' || !l05.blank_lines?.length) {
    bad('L05 应该是 fill_blank，并且带 blank_lines')
  } else {
    const rebuilt = l05.teach_code_lines.map((line, index) => {
      const group = l05.blank_lines?.find((item) => item.line === index)
      if (!group) return line
      let out = ''
      let cursor = 0
      for (const blank of group.blanks) {
        if (line.slice(blank.start, blank.end) !== blank.answer) {
          bad(`L05 第 ${index + 1} 行挖空「${line.slice(blank.start, blank.end)}」和答案「${blank.answer}」不一致`)
        }
        out += line.slice(cursor, blank.start) + blank.answer
        cursor = blank.end
      }
      return out + line.slice(cursor)
    })
    if (rebuilt.join('\n') === l05.teach_code_lines.join('\n')) ok('L05 填空拼回去就是标准代码')
    else bad('L05 填空拼不回标准代码')
  }

  const l06 = LEVELS.find((level) => level.level_id === 'L06')
  if (!l06 || l06.unfolded_lines?.length !== 8) bad('L06 应该有 8 行折叠前代码')
  else {
    const longArt = simulate(l06.unfolded_lines.join('\n'))
    const shortArt = simulate(l06.teach_code_lines.join('\n'))
    const span = (art: { bounds: { minX: number; maxX: number; minY: number; maxY: number } }) =>
      `${art.bounds.maxX - art.bounds.minX}x${art.bounds.maxY - art.bounds.minY}`
    if (span(longArt) === span(shortArt) && shortArt.strokes.length > 0) ok(`L06 8 行和 for 画出同样大小：${span(shortArt)}`)
    else bad(`L06 折叠前后图形不一致：${span(longArt)} vs ${span(shortArt)}`)
    const twice = applyParam(l06.teach_code_lines.join('\n'), l06.challenge_params[0], '2')
    const twiceArt = simulate(twice)
    const points = (art: { strokes: { points: unknown[] }[] }) => art.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0)
    if (points(twiceArt) < points(shortArt)) ok('L06 循环 2 次比 4 次少画一段')
    else bad('L06 改循环次数后笔迹没有变短')
  }

  for (const level of LEVELS.filter((item) => item.order >= 4)) {
    const patterns = level.error_mappings.map((item) => item.pattern)
    for (const name of ['IndentationError', "expected ':'", '= vs ==']) {
      if (!patterns.includes(name)) bad(`${level.level_id} 缺少报错映射 ${name}`)
    }
  }
  const sample = LEVELS.find((level) => level.level_id === 'L08')
  if (sample) {
    const indent = checkTypedLine('t.forward(80)', '    t.forward(80)', sample.error_mappings)
    const colon = checkTypedLine('if sides > 5', 'if sides > 5:', sample.error_mappings)
    const compare = checkTypedLine('if sides = 5:', 'if sides > 5:', sample.error_mappings)
    if (indent.message.includes('缩进') && indent.pattern === 'indent') ok('缩进错误走到 IndentationError 人话')
    else bad(`缩进提示不对：${indent.message}`)
    if (colon.message.includes('冒号')) ok('漏写冒号有人话')
    else bad(`冒号提示不对：${colon.message}`)
    if (compare.message.includes('==')) ok('等号混用有人话')
    else bad(`等号提示不对：${compare.message}`)
  }

  const framed = LEVELS.find((level) => level.level_id === 'L04')
  if (framed) {
    const frame = frameForLevel(framed)
    const small = simulate(applyParam(framed.teach_code_lines.join('\n'), framed.challenge_params[0], 50))
    const large = simulate(applyParam(framed.teach_code_lines.join('\n'), framed.challenge_params[0], 200))
    const width = (art: { bounds: { minX: number; maxX: number } }) => art.bounds.maxX - art.bounds.minX
    if (frame && width(large) > width(small) * 2 && frame.maxX - frame.minX >= width(large)) {
      ok('L04 画布框按最大边长锁死，50 和 200 差一倍以上')
    } else bad('L04 画布框没有罩住变大的正方形')
  }
}

console.log(failed === 0 ? '\n全部通过\n' : `\n${failed} 项未通过\n`)
process.exitCode = failed === 0 ? 0 : 1
