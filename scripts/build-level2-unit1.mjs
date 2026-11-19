/**
 * 把 Level 2 第 1 单元（第 121–140 关）写成课程包，并做机检。
 * 用法：node scripts/build-level2-unit1.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'content', 'courses', 'level2')

const KINDS = [
  'new', 'new', 'new', 'practice',
  'new', 'new', 'new', 'typing',
  'new', 'new', 'new', 'practice',
  'new', 'new', 'new', 'typing',
  'practice', 'practice', 'practice', 'project',
]

const COLOR = { red: '红色', blue: '蓝色', green: '绿色', orange: '橙色', purple: '紫色' }

const ERRORS = [
  { pattern: 'colon', match: "expected ':'", friendlyMessage: "这行的最后是不是漏了一个英文冒号 ':'？" },
  { pattern: 'name', match: 'has no attribute', friendlyMessage: '海龟不认识这个动作，forward 或 right 是不是拼错了？' },
  { pattern: 'paren', match: 'was never closed', friendlyMessage: '这里的括号没有闭合哦' },
  { pattern: 'cjk', match: "invalid character '（'", friendlyMessage: '注意，要切到英文键盘，打半角括号哦。' },
  { pattern: 'indent', match: 'expected an indented block', friendlyMessage: '冒号下面要往右空四格，函数、循环或判断里的代码才算在里面。' },
  { pattern: 'defined', match: 'is not defined', friendlyMessage: '这个名字还没准备好。是不是函数名拼错了，或者还没写 def？' },
]

const BANNED = /\b(import|while|class|input|lambda|open|circle)\b/

function noteFor(line) {
  const text = line.trim()
  if (text.startsWith('def ')) {
    const name = text.slice(4).split('(')[0]
    if (text.includes(',')) return `给做法起名 ${name}，它要用两个数`
    if (text.includes('()')) return `给做法起名 ${name}，先不带数字`
    return `给做法起名 ${name}，它要用一个数`
  }
  if (text.startsWith('for ')) {
    const count = text.match(/range\((\d+)\)/)
    return count ? `重复 ${count[1]} 次，把下面这几行做完` : '重复做下面这几行'
  }
  const colorBox = text.match(/^([A-Za-z]+) = "([A-Za-z]+)"$/)
  if (colorBox) return `先记住颜色是${COLOR[colorBox[2]] || colorBox[2]}`
  const call = text.match(/^t\.([A-Za-z]+)\((.*)\)$/)
  if (call) {
    const [, name, argRaw] = call
    const arg = argRaw.replaceAll('"', '')
    const step = (unit) => (/^\d+$/.test(arg) ? `${arg} ${unit}` : `盒子 ${arg} 里的数`)
    if (name === 'forward') return `小海龟向前走 ${step('步')}`
    if (name === 'right') return `向右转 ${step('度')}`
    if (name === 'left') return `向左转 ${step('度')}`
    if (name === 'color') return COLOR[arg] ? `把画笔换成${COLOR[arg]}` : '把画笔换成盒子里的那种颜色'
    if (name === 'penup') return '把笔抬起来，接着走先不画线'
    if (name === 'pendown') return '把笔放下，接着走就会画出线'
    if (name === 'done') return '告诉小海龟，这一幅画完了'
  }
  const named = text.match(/^([A-Za-z_]+)\((.*)\)$/)
  if (named) {
    const [, name, args] = named
    if (!args) return `写下 ${name}()，才会真的去画`
    return `调用 ${name}，把 ${args.replaceAll(' ', '')} 传进去`
  }
  throw new Error(`写不出这行的说明：${line}`)
}

function applyParam(code, param, value) {
  const lines = code.split('\n')
  if (param.apply.kind === 'assign') {
    const variable = param.apply.variable
    let replaced = false
    return lines
      .map((line) => {
        if (replaced) return line
        const match = line.match(new RegExp(`^(\\s*)${variable}\\s*=.*$`))
        if (!match) return line
        replaced = true
        const quoted = /=\s*(['"]).*\1\s*$/.test(line)
        const literal = quoted ? `"${String(value)}"` : String(value)
        return `${match[1]}${variable} = ${literal}`
      })
      .join('\n')
  }
  const { func, argIndex } = param.apply
  const occurrence = param.apply.occurrence ?? 1
  const argText = String(value)
  let seen = 0
  const callPattern = new RegExp(`${func}\\(([^)]*)\\)`, 'g')
  return lines
    .map((line) => {
      if (occurrence !== 'all' && seen >= occurrence) return line
      return line.replace(callPattern, (whole, inner) => {
        seen += 1
        if (occurrence !== 'all' && seen !== occurrence) return whole
        const args = String(inner).split(',')
        args[argIndex] = argText
        return `${func}(${args.join(', ')})`
      })
    })
    .join('\n')
}

function arg(func, argIndex, occurrence) {
  return { kind: 'arg', func, argIndex, occurrence }
}

function num(name, label, value, alt, min, max, step, apply, hint) {
  return {
    param: {
      name,
      label,
      type: 'number',
      default: value,
      min,
      max,
      step,
      apply,
      hint,
    },
    alt,
  }
}

function pick(name, label, value, alt, options, hint) {
  return {
    param: {
      name,
      label,
      type: 'select',
      default: value,
      options,
      apply: { kind: 'assign', variable: name },
      hint,
    },
    alt,
  }
}

const COLORS = [
  { value: 'red', label: '红色' },
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'orange', label: '橙色' },
  { value: 'purple', label: '紫色' },
]

const square = (side) => [
  'def square(side):',
  '    for i in range(4):',
  '        t.forward(side)',
  '        t.right(90)',
]

/** 第 121–140 关。课型槽位和 Level 1 一个单元相同。 */
const ROWS = [
  {
    title: '给正方形起个名字',
    goal: '用 def 给画正方形的做法起名，写上名字才会去画',
    tags: ['function'],
    lines: ['def square():', '    for i in range(4):', '        t.forward(60)', '        t.right(90)', 'square()', 't.done()'],
    keys: ['def square():', 'square()', 't.forward(60)', 't.right(90)'],
    core: 'def square():',
    draws: '一个正方形',
    how: '正方形变大',
    tune: num('long', '把正方形改大', 60, 100, 40, 120, 20, arg('forward', 0, 1), '数字越大，正方形越大。'),
    quiz: ['哪一行才会把正方形画出来？', 'square()', 'def square():', 't.done()', 'def 只是给做法起名字，写 square() 才会去画。'],
  },
  {
    title: '叫一次就画出三角形',
    goal: '把画三角形的做法起名，调用一次就画出三条边',
    tags: ['function'],
    lines: ['def triangle():', '    for i in range(3):', '        t.forward(70)', '        t.right(120)', 'triangle()', 't.done()'],
    keys: ['def triangle():', 'triangle()', 't.forward(70)', 't.right(120)'],
    core: 'def triangle():',
    draws: '一个三角形',
    how: '三角形变大',
    tune: num('long', '把三角形改大', 70, 110, 50, 130, 20, arg('forward', 0, 1), '数字越大，三角形越大。'),
    quiz: ['triangle() 做了什么？', '把刚才起名的三角形画出来', '只是给做法起了个名字', '让海龟停下来', '括号里的调用才会真的去画。'],
  },
  {
    title: '函数可以带一个数',
    goal: '给函数一个边长，画的时候用传进去的那个数',
    tags: ['function', 'variable'],
    lines: [...square('side'), 'square(50)', 't.done()'],
    keys: ['def square(side):', 'square(50)', 't.forward(side)', 'side'],
    core: 'square(50)',
    draws: '一个正方形',
    how: '正方形变大',
    tune: num('side', '把传进去的边长改大', 50, 90, 30, 110, 20, arg('square', 0, 2), 'square 后面的数会传进 side。'),
    quiz: ['square(50) 里的 50 去了哪里？', '传进 side，四条边都走这么长', '只改了函数的名字', '让海龟转 50 度', '括号里的数会交给函数使用。'],
  },
  {
    title: '把边长换长',
    goal: '还是这个函数，只把传进去的边长换长',
    tags: ['function', 'variable'],
    lines: [...square('side'), 'square(40)', 't.done()'],
    keys: ['def square(side):', 'square(40)', 't.forward(side)', 't.right(90)'],
    core: 'square(40)',
    draws: '一个小正方形',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 40, 80, 20, 100, 20, arg('square', 0, 2), '只改调用时传的数，四条边一起变。'),
    quiz: ['想把正方形改大，改哪里？', '改 square 括号里的数', '把 def 删掉', '把 range(4) 改成 range(1)', '函数已经写好，改传进去的边长就行。'],
  },
  {
    title: '画完再空一截',
    goal: '调用两次同一个函数，中间抬笔空开',
    tags: ['function', 'penup'],
    lines: [...square('side'), 'square(36)', 't.penup()', 't.forward(80)', 't.pendown()', 'square(36)', 't.done()'],
    keys: ['square(36)', 't.penup()', 't.forward(80)', 't.pendown()'],
    core: 't.forward(80)',
    draws: '两个分开的正方形',
    how: '两个正方形离得更远',
    tune: num('gap', '把两块拉远', 80, 120, 40, 140, 20, arg('forward', 0, 2), '抬笔之后走得越远，两个正方形离得越开。'),
    quiz: ['两个正方形为什么没有连在一起？', '中间抬笔空走了一段', '函数被写了两遍', '海龟只画了一次', 'penup 到 pendown 之间不画线。'],
  },
  {
    title: '两个不一样大',
    goal: '同一个函数传不同的边长，画出一大一小',
    tags: ['function', 'variable'],
    lines: [...square('side'), 'square(28)', 't.penup()', 't.forward(70)', 't.pendown()', 'square(48)', 't.done()'],
    keys: ['square(28)', 'square(48)', 't.penup()', 't.forward(70)'],
    core: 'square(48)',
    draws: '一大一小两个正方形',
    how: '后一个方块变大',
    tune: num('side', '把后一个方块改大', 48, 68, 28, 88, 20, arg('square', 0, 3), '第二次调用传的数更大，后面的方块就更大。'),
    quiz: ['为什么两个正方形不一样大？', '两次调用传了不同的边长', 'def 写了两遍', '海龟自己变大了', '同一个函数，传进去的数可以不同。'],
  },
  {
    title: '函数里记住颜色',
    goal: '在函数里面先记住颜色，再把正方形涂上',
    tags: ['function', 'color'],
    lines: ['def square(side):', '    ink = "red"', '    t.color(ink)', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(50)', 't.done()'],
    keys: ['ink = "red"', 't.color(ink)', 'square(50)', 'def square(side):'],
    core: 'ink = "red"',
    draws: '一个红色正方形',
    how: '红正方形变成蓝色',
    tune: pick('ink', '换成蓝色', 'red', 'blue', [COLORS[0], COLORS[1]], '函数里的颜色一换，正方形就跟着变。'),
    quiz: ['正方形为什么是红色的？', '函数里 ink 记着 red', '没写颜色也会变红', 'square 这个名字是红色', 'color 使用盒子里记住的颜色。'],
  },
  {
    title: '把 def 打准确',
    goal: '打字课：把 def、函数名和 forward 再打一遍',
    tags: ['function'],
    typing: 'keywords',
    lines: [...square('side'), 'square(40)', 't.done()'],
    keys: ['def', 'square(side)', 't.forward(side)', 't.right(90)'],
    core: 'square(40)',
    draws: '一个正方形',
    how: '正方形变大',
    tune: num('side', '把边改长', 40, 80, 40, 120, 20, arg('square', 0, 2), '打完这一遍，改边长还能看到正方形变大。'),
    quiz: ['这一节主要在练什么？', '把 def 和函数名打准确', '新学一种转弯', '画出一个六边形', '打字课不讲新画法，只把刚学的词打熟。'],
  },
  {
    title: '先画方，再画三角',
    goal: '写两个函数，先调用正方形，再调用三角形',
    tags: ['function'],
    lines: [
      ...square('side'),
      'def triangle(side):',
      '    for i in range(3):',
      '        t.forward(side)',
      '        t.right(120)',
      'square(40)',
      'triangle(40)',
    ],
    keys: ['def square(side):', 'def triangle(side):', 'square(40)', 'triangle(40)'],
    core: 'triangle(40)',
    draws: '一个正方形叠着一个三角形',
    how: '三角形变大，正方形还在',
    tune: num('side', '把三角形改大', 40, 80, 20, 100, 20, arg('triangle', 0, 2), '只改三角形传的数，正方形保持原来的大小。'),
    quiz: ['画面上为什么有两种图形？', '调用了 square 和 triangle 两个函数', '一个函数会同时画两种', '三角形是正方形变的', '每个函数只负责一种图形。'],
  },
  {
    title: '转一下再画第二个',
    goal: '画完一个正方形，转一个角度，再调用一次',
    tags: ['function'],
    lines: [...square('side'), 'square(36)', 't.right(45)', 'square(36)', 't.done()'],
    keys: ['square(36)', 't.right(45)', 'def square(side):', 't.forward(side)'],
    core: 't.right(45)',
    draws: '两个错开的正方形',
    how: '第二个正方形转得更开',
    tune: num('turn', '把第二个方块转得更开', 45, 90, 15, 90, 15, arg('right', 0, 2), '两次调用之间的角度越大，第二个方块转得越开。'),
    quiz: ['第二个正方形为什么歪了？', '两次调用之间转了 45 度', '函数里写了两个正方形', '边长不一样', '调用之间的 right 会改变下一次的方向。'],
  },
  {
    title: '用函数画一扇小门',
    goal: '把三笔小门收成函数，调用时传入高度',
    tags: ['function'],
    lines: ['def door(side):', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'door(70)', 't.done()'],
    keys: ['def door(side):', 'door(70)', 't.forward(side)', 't.right(90)'],
    core: 'def door(side):',
    draws: '一扇开口的小门',
    how: '小门变高',
    tune: num('side', '把门改高', 70, 110, 50, 130, 20, arg('door', 0, 2), '传进去的数越大，门的三笔都越长。'),
    quiz: ['door(70) 画出几笔？', '三笔，围成一扇开口的门', '四笔，是个正方形', '只画一条线', '函数里向前走了三次。'],
  },
  {
    title: '小门再画一次',
    goal: '还是这扇门，把传进去的高度换一换',
    tags: ['function'],
    lines: ['def door(side):', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'door(50)', 't.done()'],
    keys: ['def door(side):', 'door(50)', 't.forward(side)', 't.right(90)'],
    core: 'door(50)',
    draws: '一扇小门',
    how: '小门变高',
    tune: num('side', '把门改高', 50, 90, 30, 110, 20, arg('door', 0, 2), '只改调用时的数，三笔一起变长。'),
    quiz: ['这节新学了什么命令？', '没有新命令，只是把高度换长', '新学了 circle', '新学了字典', '练习关用来把已经会的函数再用一次。'],
  },
  {
    title: '函数外面也能换色',
    goal: '先在函数外面选好颜色，再调用正方形',
    tags: ['function', 'color'],
    lines: [...square('side'), 'ink = "blue"', 't.color(ink)', 'square(48)', 't.done()'],
    keys: ['ink = "blue"', 't.color(ink)', 'square(48)', 'def square(side):'],
    core: 'ink = "blue"',
    draws: '一个蓝色正方形',
    how: '蓝正方形变成橙色',
    tune: pick('ink', '换成橙色', 'blue', 'orange', [COLORS[1], COLORS[3]], '调用之前换的颜色，会留到函数里面。'),
    quiz: ['颜色写在函数外面，正方形还是彩色的吗？', '是，调用之前已经换成这个颜色', '不是，函数会把颜色忘掉', '只有写在 def 里面才有颜色', '画笔的颜色会一直留到下一次更换。'],
  },
  {
    title: '大的在前，小的在后',
    goal: '先传一个大边长，空开后再传一个小边长',
    tags: ['function'],
    lines: [...square('side'), 'square(60)', 't.penup()', 't.forward(90)', 't.pendown()', 'square(24)', 't.done()'],
    keys: ['square(60)', 'square(24)', 't.penup()', 't.forward(90)'],
    core: 'square(24)',
    draws: '前大后小两个正方形',
    how: '后面的方块变大',
    tune: num('side', '把后面的小方块改大', 24, 44, 24, 64, 20, arg('square', 0, 3), '第二次传的数变大，后面的方块就变大。'),
    quiz: ['前面那个更大，是因为什么？', '第一次传了 60，第二次传了 24', 'def 会越画越小', '抬笔会把图形缩小', '每次调用用自己的那个数。'],
  },
  {
    title: '六条边也收成函数',
    goal: '函数带上边长和转角，调用一次画出六边形',
    tags: ['function', 'variable'],
    lines: ['def polygon(side, turn):', '    for i in range(6):', '        t.forward(side)', '        t.right(turn)', 'polygon(36, 60)', 't.done()'],
    keys: ['def polygon(side, turn):', 'polygon(36, 60)', 't.right(turn)', 'range(6)'],
    core: 'polygon(36, 60)',
    draws: '一个六边形',
    how: '角变了，不再是六边形',
    tune: num('turn', '把转角改成直角', 60, 90, 30, 120, 30, arg('polygon', 1, 2), '第二个数是每次转的角度。'),
    quiz: ['polygon(36, 60) 的两个数分别是什么？', '边长 36，每次转 60 度', '边长 60，转 36 度', '画 36 个，每个 60 边', '逗号前面是边长，后面是转角。'],
  },
  {
    title: '再打基准键',
    goal: '打字课：练习基准键位，手指回原位',
    tags: ['function'],
    typing: 'baseline_keys',
    lines: [...square('side'), 'square(40)', 't.done()'],
    keys: ['asdf', 'jkl;', 'ffjj', 'fjfj'],
    core: 'square(40)',
    draws: '一个小正方形',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 40, 80, 20, 100, 20, arg('square', 0, 2), '基准键打完，正方形还能改大。'),
    quiz: ['这一节在练哪一档打字？', '基准键位', '编程关键词', '一种新的画法', '打字只有基准键位和编程关键词两档。'],
  },
  {
    title: '连画三个方块',
    goal: '用循环把同一个函数调用三次',
    tags: ['function', 'for_loop'],
    lines: [...square('side'), 'for i in range(3):', '    square(24)', '    t.penup()', '    t.forward(56)', '    t.pendown()', 't.done()'],
    keys: ['for i in range(3):', 'square(24)', 't.penup()', 't.forward(56)'],
    core: 'square(24)',
    draws: '三个分开的小正方形',
    how: '三个方块一起变大',
    tune: num('side', '把三个方块改大', 24, 44, 24, 64, 20, arg('square', 0, 2), '循环里的边长一改，三个方块一起变。'),
    quiz: ['三个方块为什么不用写三遍函数？', '循环把同一次调用做了三遍', 'def 会自动画三个', '海龟会复制图形', 'range(3) 让里面的调用重复三次。'],
  },
  {
    title: '红方块套蓝方块',
    goal: '两次调用之间换颜色，画出一大一小两层',
    tags: ['function', 'color'],
    lines: [...square('side'), 't.color("red")', 'square(50)', 't.color("blue")', 'square(30)', 't.done()'],
    keys: ['t.color("red")', 't.color("blue")', 'square(50)', 'square(30)'],
    core: 't.color("red")',
    draws: '红方块里面一个蓝方块',
    how: '蓝色方块变大',
    tune: num('side', '把蓝色方块改大', 30, 50, 30, 70, 20, arg('square', 0, 3), '第二次调用的边长变大，蓝方块就变大。'),
    quiz: ['蓝方块为什么在红方块里面？', '后一次传的边长更小，画在同一个起点', '蓝色会自动缩小', '函数只能画在里面', '两次都从同一个点开始，短的那次落在里面。'],
  },
  {
    title: '六边形再画一次',
    goal: '把六边形收成只带边长的函数，再画大一点',
    tags: ['function'],
    lines: ['def hexagon(side):', '    for i in range(6):', '        t.forward(side)', '        t.right(60)', 'hexagon(28)', 't.done()'],
    keys: ['def hexagon(side):', 'hexagon(28)', 't.right(60)', 'range(6)'],
    core: 'hexagon(28)',
    draws: '一个六边形',
    how: '六边形变大',
    tune: num('side', '把六边形改大', 28, 48, 28, 68, 20, arg('hexagon', 0, 2), '传进去的边长越大，六边形越大。'),
    quiz: ['hexagon(28) 会转几次？', '6 次，每次 60 度', '28 次', '4 次，因为看起来像方的', 'range(6) 把走和转做 6 遍。'],
  },
  {
    title: '两扇小窗',
    goal: '用函数画两扇并排的小窗',
    tags: ['function', 'penup'],
    lines: ['def window(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'window(40)', 't.penup()', 't.forward(80)', 't.pendown()', 'window(40)', 't.done()'],
    keys: ['def window(side):', 'window(40)', 't.penup()', 't.forward(80)'],
    core: 'window(40)',
    draws: '两扇并排的小窗',
    how: '第一扇窗变大',
    tune: num('side', '把第一扇窗改大', 40, 60, 20, 80, 20, arg('window', 0, 2), '第一扇用的边长变大，第二扇先不动。'),
    quiz: ['这两扇窗是怎么来的？', 'window 被调用了两次', '海龟自己会画窗', '只写了 def，没有调用', '一次调用画一扇，两扇就要调用两次。'],
    badge: { id: 'two_windows', title: '两扇小窗' },
  },
]

if (ROWS.length !== 20) {
  console.error(`单元应有 20 关，实际 ${ROWS.length}`)
  process.exit(1)
}

const problems = []
const lessons = ROWS.map((row, index) => {
  const order = 121 + index
  const kind = KINDS[index]
  const lines = row.lines
  if (lines.some((line) => !line.trim())) problems.push(`L${order} 有空行`)
  if (lines.length > 10) problems.push(`L${order} 有 ${lines.length} 行`)
  if (lines.length < 1) problems.push(`L${order} 没有正文`)
  if (row.core.length > 15) problems.push(`L${order} 核心行 ${row.core.length} 字：${row.core}`)
  if (!lines.some((line) => line.trim() === row.core || line.includes(row.core))) problems.push(`L${order} 核心行不在正文里`)
  if (row.keys.length < 3 || row.keys.length > 5) problems.push(`L${order} 关键词数量 ${row.keys.length}`)
  if (kind === 'typing' && !row.typing) problems.push(`L${order} 打字课没有档位`)
  if (kind !== 'typing' && row.typing) problems.push(`L${order} 不是打字课却写了档位`)
  if (row.typing === 'keywords' && row.keys.some((key) => key === 'asdf' || key.includes('jkl'))) {
    problems.push(`L${order} 编程关键词里混进了基准键`)
  }
  if (row.typing === 'baseline_keys' && !row.keys.every((key) => ['asdf', 'jkl;', 'ffjj', 'fjfj'].includes(key))) {
    problems.push(`L${order} 基准键位超出两档约定`)
  }
  const code = lines.join('\n')
  if (BANNED.test(code) || /[（）]/.test(code)) problems.push(`L${order} 用了这一单元不该出现的写法`)
  if (![...code.matchAll(/"([A-Za-z]+)"/g)].every((item) => COLOR[item[1]])) problems.push(`L${order} 用了画布不认识的颜色`)
  let notes = []
  try {
    notes = lines.map(noteFor)
  } catch (error) {
    problems.push(`L${order} ${error instanceof Error ? error.message : error}`)
  }
  const param = row.tune.param
  const alt = row.tune.alt
  if (param.type === 'number') {
    const step = param.step
    if ((param.default - param.min) % step !== 0 || (alt - param.min) % step !== 0) problems.push(`L${order} 参数不在滑杆刻度上`)
    if (alt < param.min || alt > param.max || param.default < param.min || param.default > param.max) problems.push(`L${order} 参数超出范围`)
  } else if (!param.options.some((option) => option.value === alt && option.value !== param.default)) {
    problems.push(`L${order} 对比值不在选项里`)
  }
  const variant = applyParam(code, param, alt)
  if (variant === code) problems.push(`L${order} 改参数后代码没变`)
  const defBroken = variant.split('\n').some((line) => {
    const header = line.match(/^\s*def [A-Za-z_]+\(([^)]*)\)/)
    if (!header) return false
    const params = header[1].trim()
    if (!params) return false
    return params.split(',').some((part) => !/^[A-Za-z_]\w*$/.test(part.trim()))
  })
  if (defBroken) problems.push(`L${order} 参数改到了 def 那一行`)
  return { ...row, order, kind, code, variant, notes }
})

let streak = 0
for (const lesson of lessons) {
  if (lesson.kind === 'new') {
    streak += 1
    if (streak >= 5) problems.push(`第 ${lesson.order} 关起连续新知识达到 ${streak}`)
  } else streak = 0
}

const stat = { new: 0, practice: 0, typing: 0, project: 0 }
for (const lesson of lessons) stat[lesson.kind] += 1
if (stat.new !== 12 || stat.practice !== 5 || stat.typing !== 2 || stat.project !== 1) {
  problems.push(`课型配比不是 12/5/2/1：${JSON.stringify(stat)}`)
}

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

const draw = spawnSync('python', [join(root, 'scripts', 'level1_draw_check.py')], {
  input: JSON.stringify(lessons.map((lesson) => ({ order: lesson.order, code: lesson.code, variant: lesson.variant }))),
  encoding: 'utf8',
})
if (draw.status !== 0) {
  console.error(draw.stdout)
  console.error(draw.stderr)
  process.exit(draw.status || 1)
}

const levels = lessons.map((lesson, index) => {
  const drill = index === 0 ? lesson.core : lessons[index - 1].core
  if (drill.length > 20) problems.push(`L${lesson.order} drill 超过 20：${drill}`)
  const bonus = lesson.typing
    ? {
        type: 'typing',
        instruction: lesson.typing === 'baseline_keys' ? '还有力气的话，把基准键再打一遍。' : '还有力气的话，把这节的词再打一遍。',
        expected_output: lesson.typing === 'baseline_keys' ? '基准键位' : '编程关键词',
        bonus_reward: '皇冠',
      }
    : {
        type: 'param_edit',
        instruction: `把「${lesson.tune.param.label}」改一下。你猜它会变成什么样？`,
        target_param_name: lesson.tune.param.name,
        target_value: String(lesson.tune.alt),
        expected_output: lesson.how,
        bonus_reward: '皇冠',
      }
  return {
    level_id: `L${String(lesson.order).padStart(4, '0')}`,
    order: lesson.order,
    title: lesson.title,
    goal: lesson.goal,
    knowledge_tags: lesson.tags,
    level_type: lesson.kind,
    exercise: 'normal',
    milestone_badge: lesson.badge?.id ?? null,
    badge_title: lesson.badge?.title ?? null,
    typing_tier: lesson.typing ?? null,
    preview_kind: 'turtle',
    demo_code: lesson.code,
    expected_output: lesson.draws,
    teach_code_lines: lesson.lines,
    line_notes: lesson.notes,
    keywords: lesson.keys,
    drill_chunk: drill,
    challenge_params: [lesson.tune.param],
    error_mappings: ERRORS,
    quiz: {
      question: lesson.quiz[0],
      options: [lesson.quiz[1], lesson.quiz[2], lesson.quiz[3]],
      answerIndex: 0,
      explain: lesson.quiz[4],
    },
    bonus_challenge: bonus,
    estimated_minutes: lesson.kind === 'project' ? 20 : 15,
    is_review: lesson.kind === 'practice' || lesson.kind === 'typing',
    teaching_intent: lesson.goal,
    parent_brief: `孩子会画出${lesson.draws}。改一个数，${lesson.how}。`,
    teacher_guide: `先看${lesson.draws}，再只改「${lesson.tune.param.label}」，确认${lesson.how}。`,
  }
})

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

const body = {
  stage_level: 2,
  unit: { unit_id: 'L2_U01', title: 'Level 2 · 单元 1', sort_order: 1 },
  unit_tags: ['function', 'forward', 'for_loop'],
  levels,
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'L2_U01.json'), `${JSON.stringify(body, null, 2)}\n`)
console.log(draw.stdout.trim())
console.log(`wrote ${levels.length} levels, ${stat.new}/${stat.practice}/${stat.typing}/${stat.project}`)
