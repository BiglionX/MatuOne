/**
 * 把 Level 2 第 2–6 单元（第 141–240 关）写成课程包，并做机检。
 * 用法：node scripts/build-level2-rest.mjs
 * 不改第 121–140 关。
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
  { pattern: 'concat', match: 'can only concatenate', friendlyMessage: '句子和数字不能直接加在一起。数字要先用 str 变成文字。' },
  { pattern: 'key', match: 'KeyError', friendlyMessage: '字典里没有这个键，看一看引号里的名字。' },
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
    if (count) return `重复 ${count[1]} 次，把下面这几行做完`
    const named = text.match(/range\(([A-Za-z_]+)\)/)
    if (named) return `重复盒子 ${named[1]} 里的次数`
    const walk = text.match(/^for ([A-Za-z_]+) in (.+):$/)
    if (walk) return `从 ${walk[2]} 里一个一个取出，交给 ${walk[1]}`
    return '重复做下面这几行'
  }
  if (text === 'else:') return '对不上的时候，走这边'
  if (text.startsWith('if ')) {
    if (text.includes('==')) return '两边一样，才做下面这几行'
    if (text.includes('>')) return '左边更大，才做下面这几行'
    return '判断成立，才做下面这几行'
  }
  if (text.startsWith('print(')) {
    const inner = text.slice(6, -1)
    return inner ? `把 ${inner} 打印到屏幕上` : '打印一行字'
  }
  const list = text.match(/^([A-Za-z_]+) = \[(.*)\]$/)
  if (list) return list[2] ? `按顺序把 ${list[2]} 放进 ${list[1]}` : `${list[1]} 先放成一个空列表`
  const dict = text.match(/^([A-Za-z_]+) = \{(.+)\}$/)
  if (dict) return `用键记住值，放进 ${dict[1]}`
  const assigned = text.match(/^([A-Za-z_]+) = (.+)$/)
  if (assigned) {
    const [, name, raw] = assigned
    if (raw.startsWith('"') && raw.endsWith('"')) {
      const word = raw.slice(1, -1)
      if (!word) return `${name} 先空着`
      if (COLOR[word]) return `先记住${name}是${COLOR[word]}`
      return `先记住${name}是「${word}」`
    }
    if (raw.includes('str(')) return `把数字变成文字，放进 ${name}`
    if (raw.includes('+')) return `把两段接起来，放进 ${name}`
    if (raw.includes('[')) return `按键取出一个值，放进 ${name}`
    if (/^\d+$/.test(raw)) return `先记住${name}是 ${raw}`
    return `先记住${name}是 ${raw}`
  }
  const call = text.match(/^t\.([A-Za-z]+)\((.*)\)$/)
  if (call) {
    const [, name, argRaw] = call
    const arg = argRaw.replaceAll('"', '')
    const step = (unit) => {
      if (/^\d+$/.test(arg)) return `${arg} ${unit}`
      if (arg.includes('[')) return '取出来的数'
      return `盒子 ${arg} 里的数`
    }
    if (name === 'forward') return `小海龟向前走 ${step('步')}`
    if (name === 'backward') return `小海龟退回 ${step('步')}`
    if (name === 'right') return `向右转 ${step('度')}`
    if (name === 'left') return `向左转 ${step('度')}`
    if (name === 'color') return COLOR[arg] ? `把画笔换成${COLOR[arg]}` : '把画笔换成取出来的颜色'
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

function box(variable) {
  return { kind: 'assign', variable }
}

function num(name, label, value, alt, min, max, step, apply, hint) {
  return {
    param: { name, label, type: 'number', default: value, min, max, step, apply, hint },
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
      apply: box(name),
      hint,
    },
    alt,
  }
}

function choice(name, label, value, alt, pairs, hint) {
  return pick(
    name,
    label,
    value,
    alt,
    pairs.map(([item, itemLabel]) => ({ value: item, label: itemLabel })),
    hint,
  )
}

const COLORS = [
  { value: 'red', label: '红色' },
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'orange', label: '橙色' },
  { value: 'purple', label: '紫色' },
]

const inkOf = (value, alt, label) => choice('ink', label, value, alt, [[value, COLOR[value]], [alt, COLOR[alt]]], '这个词会变成画笔的颜色。')

/** 第 141–160 关。函数里的判断。 */
const UNIT2 = [
  {
    title: '函数一上来就涂红',
    goal: '一进函数就选定颜色，正方形整幅都是这个颜色',
    tags: ['function', 'color'],
    lines: ['def square(side):', '    ink = "red"', '    t.color(ink)', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(50)', 't.done()'],
    keys: ['ink = "red"', 't.color(ink)', 'def square(side):', 'square(50)'],
    core: 'ink = "red"',
    draws: '一个红色正方形',
    how: '红正方形变成蓝色',
    tune: inkOf('red', 'blue', '换成蓝色'),
    quiz: ['颜色写在函数的哪一行？', '刚进函数就写进 ink', '写在 square(50) 后面', '写在 t.done() 里', '函数一开头换的颜色，四条边都会用。'],
  },
  {
    title: '调用前先选颜色',
    goal: '调用之前先涂色，这个颜色会留进函数里',
    tags: ['function', 'color'],
    lines: ['ink = "green"', 't.color(ink)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(30)', 'square(50)'],
    keys: ['ink = "green"', 't.color(ink)', 'square(30)', 'square(50)'],
    core: 'ink = "green"',
    draws: '一大一小两个绿色正方形',
    how: '两个正方形一起变成紫色',
    tune: inkOf('green', 'purple', '换成紫色'),
    quiz: ['颜色写在函数外面，里面还看得到吗？', '看得到，画笔的颜色会留着', '看不到，函数会重新变黑', '只有写在 def 里面才有用', '调用之前换好的颜色，会一直留到下一次更换。'],
  },
  {
    title: '边长大于 60 才涂蓝',
    goal: '边长比分界大，才把正方形涂成蓝色',
    tags: ['function', 'if'],
    lines: ['def square(side):', '    if side > n:', '        t.color("blue")', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'n = 60', 'square(80)'],
    keys: ['if side > n:', 'n = 60', 't.color("blue")', 'square(80)'],
    core: 'n = 60',
    draws: '一个蓝色正方形',
    how: '分界变大后，正方形不再涂蓝',
    tune: num('n', '把分界改大', 60, 100, 20, 100, 20, box('n'), '分界比边长还大时，蓝色那一行不会走。'),
    quiz: ['80 比 60 大，会怎样？', '走进 if，涂成蓝色', '什么都不画', '涂成红色', '左边更大，if 下面那一行才会做。'],
  },
  {
    title: '把分界改成 80',
    goal: '还是用边长和分界比，这一次分界从 40 看起',
    tags: ['function', 'if'],
    lines: ['def door(side):', '    if side > n:', '        t.color("orange")', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'n = 40', 'door(70)'],
    keys: ['if side > n:', 'n = 40', 'door(70)', 't.color("orange")'],
    core: 'n = 40',
    draws: '一扇橙色小门',
    how: '分界改成 80 后，小门不再涂橙',
    tune: num('n', '把分界改成 80', 40, 80, 40, 100, 20, box('n'), '70 不再比分界大时，橙色那一行会跳过。'),
    quiz: ['这一节主要改哪里？', '改判断里的分界', '把 def 删掉', '新学一个圆形', '练习关把已经会的判断再用一次。'],
  },
  {
    title: '第一笔涂红，其余涂蓝',
    goal: '循环里看是不是第一笔，第一笔涂红，后面涂蓝',
    tags: ['function', 'if', 'for_loop'],
    lines: ['def square(side):', '    for i in range(4):', '        if i == 0:', '            t.color("red")', '        else:', '            t.color("blue")', '        t.forward(side)', '        t.right(90)', 'square(60)'],
    keys: ['if i == 0:', 't.color("red")', 't.color("blue")', 'square(60)'],
    core: 'square(60)',
    draws: '第一笔红色、其余蓝色的正方形',
    how: '四条边一起变长',
    tune: num('side', '把正方形改大', 60, 80, 40, 100, 20, arg('square', 0, 2), '传进去的边长一变，四条边一起变。'),
    quiz: ['哪一笔是红色？', 'i 等于 0 的第一笔', '四笔都是红色', '只有最后一笔', '电脑从 0 开始数，0 就是第一笔。'],
  },
  {
    title: '小的涂绿，大的涂橙',
    goal: '边长不超过分界就涂绿，超过就涂橙',
    tags: ['function', 'if', 'color'],
    lines: ['def square(side):', '    if side > n:', '        t.color("orange")', '    else:', '        t.color("green")', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'n = 50', 'square(40)'],
    keys: ['if side > n:', 't.color("green")', 't.color("orange")', 'square(40)'],
    core: 'square(40)',
    draws: '一个绿色小正方形',
    how: '方块变大，并且换成橙色',
    tune: num('side', '把边长改到 80', 40, 80, 20, 100, 20, arg('square', 0, 2), '边长超过 50 就走橙色那一支。'),
    quiz: ['40 没有超过 50，涂什么颜色？', '绿色', '橙色', '不涂色', '不超过分界，就走 else。'],
  },
  {
    title: '转角太大就改回 90',
    goal: '转角比分界大时，先改回 90 再画',
    tags: ['function', 'if'],
    lines: ['def poly(side, turn):', '    if turn > n:', '        turn = 90', '    for i in range(4):', '        t.forward(side)', '        t.right(turn)', 'n = 100', 'poly(40, 120)'],
    keys: ['if turn > n:', 'turn = 90', 'poly(40, 120)', 't.right(turn)'],
    core: 'poly(40, 120)',
    draws: '一个正方形',
    how: '分界变大后，转角留在 120，图形变了',
    tune: num('n', '把分界放到 140', 100, 140, 60, 140, 20, box('n'), '120 不再比分界大时，就不会改回 90。'),
    quiz: ['120 比 100 大时，实际转多少？', '改回 90 度', '还是转 120 度', '转 100 度', 'if 里面把 turn 换成了 90。'],
  },
  {
    title: '把 def 和 if 打准确',
    goal: '打字课：把 def、if 和 color 再打一遍',
    tags: ['function', 'if'],
    typing: 'keywords',
    lines: ['def square(side):', '    if side > n:', '        t.color("red")', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'n = 30', 'square(50)', 't.done()'],
    keys: ['def square(side):', 'if side > n:', 't.color("red")', 'square(50)'],
    core: 'n = 30',
    draws: '一个红色正方形',
    how: '分界变大后不再涂红',
    tune: num('n', '把分界改大', 30, 70, 30, 90, 20, box('n'), '打完这些词，还能看到判断会不会涂红。'),
    quiz: ['这一节主要在练什么？', '把 def 和 if 打准确', '新学一种转弯', '把列表背下来', '打字课不讲新画法，只把刚学的词打熟。'],
  },
  {
    title: '先判断要不要再画一个',
    goal: '第一个正方形总是画，第二个要等判断成立',
    tags: ['function', 'if'],
    lines: ['n = 50', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(36)', 'if n > 40:', '    t.right(45)', '    square(36)'],
    keys: ['if n > 40:', 'square(36)', 'n = 50', 't.right(45)'],
    core: 'if n > 40:',
    draws: '两个错开的正方形',
    how: '分界不成立时，第二个正方形不画',
    tune: num('n', '把分界降到 20', 50, 20, 20, 80, 10, box('n'), '20 并不大于 40，第二个正方形会被跳过。'),
    quiz: ['第二个正方形什么时候才画？', 'n 比 40 大的时候', '每次都会画', '只有删除 if 才画', 'if 写在函数外面，也能决定要不要再调用。'],
  },
  {
    title: '一次红，一次蓝',
    goal: '两次调用之间换颜色，再转一个角度',
    tags: ['function', 'color'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 't.color("red")', 'square(36)', 't.right(30)', 't.color("blue")', 'square(36)'],
    keys: ['t.color("red")', 't.color("blue")', 't.right(30)', 'square(36)'],
    core: 't.right(30)',
    draws: '一红一蓝两个错开的正方形',
    how: '两个正方形错得更开',
    tune: num('turn', '把转角改大', 30, 60, 15, 90, 15, arg('right', 0, 2), '函数里的 right(90) 不动，只改两次调用之间的角度。'),
    quiz: ['蓝色是在哪里换上的？', '第二次调用之前', '函数自己会变蓝', '红色用完就自动变蓝', '颜色会留着，所以要在下一次调用前再换。'],
  },
  {
    title: '边长装进盒子再传进去',
    goal: '先用盒子记住边长，再把盒子传进函数',
    tags: ['function', 'variable'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'side = 44', 'square(side)', 't.done()'],
    keys: ['side = 44', 'square(side)', 'def square(side):', 't.forward(side)'],
    core: 'square(side)',
    draws: '一个正方形',
    how: '正方形变大',
    tune: num('side', '把盒子里的边长改大', 44, 84, 24, 104, 20, box('side'), '盒子里的数变大，传进函数的边长也变大。'),
    quiz: ['square(side) 传进去的是什么？', '盒子 side 里的那个数', '单词 side 本身', '固定的 4', '括号里写变量名，用的是它现在记住的数。'],
  },
  {
    title: '把红的换成紫',
    goal: '函数里的颜色从红色换成紫色',
    tags: ['function', 'color'],
    lines: ['def square(side):', '    ink = "red"', '    t.color(ink)', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(48)', 't.done()'],
    keys: ['ink = "red"', 't.color(ink)', 'square(48)', 'def square(side):'],
    core: 'ink = "red"',
    draws: '一个红色正方形',
    how: '正方形变成紫色',
    tune: inkOf('red', 'purple', '换成紫色'),
    quiz: ['想换颜色，改哪一个词？', '改 ink 记住的颜色名', '把 def 改成 if', '把 range(4) 删掉', 'color 用的是盒子里的那个词。'],
  },
  {
    title: '三扇门里只有第一扇涂红',
    goal: '循环画三截小门，只有第一截涂红',
    tags: ['function', 'if', 'for_loop'],
    lines: ['def door(side):', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'for i in range(3):', '    if i == 0:', '        t.color("red")', '    else:', '        t.color("blue")', '    door(24)'],
    keys: ['if i == 0:', 't.color("red")', 'door(24)', 'range(3)'],
    core: 'door(24)',
    draws: '三截小门，第一截是红色',
    how: '三截小门一起变长',
    tune: num('side', '把门改高', 24, 44, 24, 64, 20, arg('door', 0, 2), '循环里的高度一改，三截一起变。'),
    quiz: ['为什么只有第一截是红色？', '只有 i 等于 0 时才涂红', '红色会自动只用一次', '循环只会做一次', '后面几次走进 else，涂的是蓝色。'],
  },
  {
    title: '函数里抬笔再空开',
    goal: '函数里面先画、再抬笔空一截、再画',
    tags: ['function', 'penup'],
    lines: ['def gap(side):', '    t.forward(side)', '    t.right(90)', '    t.penup()', '    t.forward(side)', '    t.pendown()', '    t.forward(side)', 'gap(40)', 't.done()'],
    keys: ['t.penup()', 't.pendown()', 'def gap(side):', 'gap(40)'],
    core: 'gap(40)',
    draws: '中间空开的一条折线',
    how: '画的和空的一起变长',
    tune: num('side', '把这段改长', 40, 80, 20, 100, 20, arg('gap', 0, 2), '传进去的数会用在画的地方，也会用在抬笔空开的地方。'),
    quiz: ['中间那段为什么没有线？', 'penup 和 pendown 中间不画', '函数画不了两条线', 'right 会把线擦掉', '抬笔之后再 forward，只是挪位置。'],
  },
  {
    title: '决定画方还是画三角',
    goal: '用一个词决定画正方形还是三角形',
    tags: ['if'],
    lines: ['kind = "方"', 'if kind == "方":', '    for i in range(4):', '        t.forward(40)', '        t.right(90)', 'else:', '    for i in range(3):', '        t.forward(50)', '        t.right(120)', 't.done()'],
    keys: ['kind = "方"', 'if kind == "方":', 'range(4)', 'range(3)'],
    core: 'kind = "方"',
    draws: '一个正方形',
    how: '改成三角后，画出三角形',
    tune: choice('kind', '改成三角形', '方', '角', [['方', '正方形'], ['角', '三角形']], '词对上「方」才画四条边。'),
    quiz: ['kind 是「角」时画什么？', '三角形', '还是正方形', '什么都不画', '对不上「方」，就走 else 里的三条边。'],
  },
  {
    title: '选择之前再打基准键',
    goal: '打字课：练习基准键位，手指回原位',
    tags: ['function'],
    typing: 'baseline_keys',
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(40)', 't.done()'],
    keys: ['asdf', 'jkl;', 'ffjj', 'fjfj'],
    core: 'square(40)',
    draws: '一个正方形',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 40, 80, 20, 100, 20, arg('square', 0, 2), '基准键打完，正方形还能改大。'),
    quiz: ['这一节在练哪一档打字？', '基准键位', '编程关键词', '一种新的判断', '打字只有基准键位和编程关键词两档。'],
  },
  {
    title: '把分界再改一次',
    goal: '三角形也用分界决定要不要涂绿',
    tags: ['function', 'if'],
    lines: ['def triangle(side):', '    if side > n:', '        t.color("green")', '    for i in range(3):', '        t.forward(side)', '        t.right(120)', 'n = 30', 'triangle(50)', 't.done()'],
    keys: ['if side > n:', 'n = 30', 'triangle(50)', 't.color("green")'],
    core: 'n = 30',
    draws: '一个绿色三角形',
    how: '分界变大后，三角形不再涂绿',
    tune: num('n', '把分界改到 70', 30, 70, 30, 90, 20, box('n'), '50 不再比分界大时，绿色那一行会跳过。'),
    quiz: ['50 比 30 大，会涂色吗？', '会，涂成绿色', '不会', '会涂成红色', '判断成立，才去做涂色那一行。'],
  },
  {
    title: '两色方块再画一次',
    goal: '先画紫色方块，转开后再画橙色方块',
    tags: ['function', 'color'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 't.color("purple")', 'square(28)', 't.right(20)', 't.color("orange")', 'square(22)'],
    keys: ['t.color("purple")', 't.color("orange")', 'square(28)', 'square(22)'],
    core: 'square(22)',
    draws: '一个紫方块和一个较小的橙方块',
    how: '橙色方块变大',
    tune: num('side', '把橙色方块改大', 22, 42, 22, 62, 20, arg('square', 0, 3), '只改第二次调用的边长。'),
    quiz: ['橙色用在哪一次调用？', '第二次 square', '两次都是橙色', '函数里写死了橙色', '调用之前换的颜色，会留给这一次。'],
  },
  {
    title: '小门太大就换颜色',
    goal: '小门比分界高，才涂成紫色',
    tags: ['function', 'if'],
    lines: ['def door(side):', '    if side > n:', '        t.color("purple")', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'n = 60', 'door(80)', 't.right(90)', 't.forward(20)'],
    keys: ['if side > n:', 'door(80)', 't.color("purple")', 'n = 60'],
    core: 'n = 60',
    draws: '一扇紫色小门，门边还有一笔',
    how: '分界变大后，小门不再涂紫',
    tune: num('n', '把分界改成 100', 60, 100, 40, 100, 20, box('n'), '80 不再比分界大时，紫色会跳过。'),
    quiz: ['80 比 60 大，小门是什么颜色？', '紫色', '不涂色', '绿色', '判断成立，函数里才会涂紫。'],
  },
  {
    title: '双色小窗',
    goal: '小窗不超过分界就保持原色，超过就涂红',
    tags: ['function', 'if', 'color'],
    lines: ['def window(side):', '    if side > n:', '        t.color("red")', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'n = 40', 'window(24)', 'window(56)', 't.done()'],
    keys: ['if side > n:', 'window(24)', 'window(56)', 't.color("red")'],
    core: 'window(24)',
    draws: '两扇连着的小窗，大的那扇是红色',
    how: '分界变小后，第一扇也涂成红色',
    tune: num('n', '把分界降到 20', 40, 20, 20, 60, 20, box('n'), '24 也超过分界时，第一扇会涂红。'),
    quiz: ['哪一扇会涂红？', '边长超过分界的那一扇', '两扇都不会', '只有写了 def 的那一行', '每次调用都用自己的边长去比。'],
    badge: { id: 'two_color_windows', title: '双色小窗' },
  },
]

/** 第 161–180 关。列表入门。 */
const UNIT3 = [
  {
    title: '把三个边长放进列表',
    goal: '把三个边长按顺序放进一个列表，再逐段画出来',
    tags: ['list'],
    lines: ['first = 30', 'sides = [first, 50, 70]', 't.forward(sides[0])', 't.right(90)', 't.forward(sides[1])', 't.right(90)', 't.forward(sides[2])', 't.done()'],
    keys: ['sides = [first, 50, 70]', 'sides[0]', 'sides[1]', 'first = 30'],
    core: 'first = 30',
    draws: '三段越来越长的折线',
    how: '第一段变长',
    tune: num('first', '把第一段改长', 30, 70, 30, 90, 20, box('first'), '列表第一格用的是这个盒子。'),
    quiz: ['三个数放在什么里面？', '方括号围成的列表', '三个互不相干的函数', '字典的键', '列表用方括号，按写下去的顺序排好。'],
  },
  {
    title: '取出第一段边长',
    goal: '用下标 0 取出列表的第一格，画成正方形',
    tags: ['list'],
    lines: ['side = 36', 'sides = [side, 72, 48]', 'for i in range(4):', '    t.forward(sides[0])', '    t.right(90)', 't.done()'],
    keys: ['sides[0]', 'sides = [side, 72, 48]', 'range(4)', 'side = 36'],
    core: 'side = 36',
    draws: '一个正方形',
    how: '正方形变大',
    tune: num('side', '把第一格改大', 36, 76, 16, 96, 20, box('side'), '下标 0 就是第一格，改的是它。'),
    quiz: ['sides[0] 取出的是哪一格？', '第一格', '最后一格', '第 0 个不存在', '列表从 0 开始数。'],
  },
  {
    title: '用 for 走完列表',
    goal: '用 for 把列表里的数一个一个拿出来画',
    tags: ['list', 'for_loop'],
    lines: ['last = 48', 'sides = [24, 36, last]', 'for side in sides:', '    t.forward(side)', '    t.right(120)', 't.done()'],
    keys: ['for side in sides:', 'sides = [24, 36, last]', 't.forward(side)', 'last = 48'],
    core: 'last = 48',
    draws: '一个三条边不一样长的三角形',
    how: '最后一条边变长',
    tune: num('last', '把最后一条改长', 48, 88, 28, 108, 20, box('last'), '列表最后一格变大，第三条边就变长。'),
    quiz: ['for side in sides 会做几次？', '列表里有几个数就做几次', '只会做一次', '永远做 4 次', '这种 for 是把列表走完，不是先写死次数。'],
  },
  {
    title: '再加一个边长',
    goal: '列表里放四个数，多出来的那格也能画上去',
    tags: ['list'],
    lines: ['extra = 20', 'sides = [30, 40, 50, extra]', 'for side in sides:', '    t.forward(side)', '    t.right(90)', 't.done()'],
    keys: ['sides = [30, 40, 50, extra]', 'extra = 20', 'for side in sides:', 't.forward(side)'],
    core: 'extra = 20',
    draws: '四段长短不同的折线',
    how: '最后一段变长',
    tune: num('extra', '把多出来的那段改长', 20, 60, 20, 80, 20, box('extra'), '第四格变大，最后一段就变长。'),
    quiz: ['列表里现在有几个数？', '四个', '三个', '一个', '方括号里用逗号隔开的都算一格。'],
  },
  {
    title: '列表里的数当正方形边长',
    goal: '把列表里的两个数，分别传给正方形函数',
    tags: ['list', 'function'],
    lines: ['side = 28', 'sides = [side, 44]', 'def square(n):', '    for i in range(4):', '        t.forward(n)', '        t.right(90)', 'square(sides[0])', 'square(sides[1])'],
    keys: ['sides = [side, 44]', 'square(sides[0])', 'square(sides[1])', 'side = 28'],
    core: 'side = 28',
    draws: '一大一小两个叠在一起的正方形',
    how: '里面的正方形变大',
    tune: num('side', '把第一格改大', 28, 48, 28, 68, 20, box('side'), '第一格变大，先画的那个正方形就变大。'),
    quiz: ['square(sides[1]) 用的是哪一格？', '第二格，也就是 44', '第一格', '两个数加起来', '下标 1 是第二格。'],
  },
  {
    title: '一串颜色',
    goal: '把颜色名放进列表，走一圈就换一种颜色',
    tags: ['list', 'color'],
    lines: ['ink = "red"', 'colors = [ink, "blue", "green"]', 'for name in colors:', '    t.color(name)', '    t.forward(40)', '    t.right(120)', 't.done()'],
    keys: ['colors = [ink, "blue", "green"]', 'for name in colors:', 't.color(name)', 'ink = "red"'],
    core: 'ink = "red"',
    draws: '红、蓝、绿三条边的三角形',
    how: '第一条边从红色换成紫色',
    tune: inkOf('red', 'purple', '把第一种颜色换成紫'),
    quiz: ['颜色也可以放进列表吗？', '可以，颜色名也是一格', '不可以，列表只能放数字', '只有字典可以', '列表的每一格放什么，取出来就用什么。'],
  },
  {
    title: '第几个数就涂第几个颜色',
    goal: '边长列表和颜色列表用同一个下标对齐',
    tags: ['list', 'color'],
    lines: ['n = 30', 'sides = [n, 50, 70]', 'colors = ["red", "blue", "green"]', 'for i in range(3):', '    t.color(colors[i])', '    t.forward(sides[i])', '    t.right(120)'],
    keys: ['colors[i]', 'sides[i]', 'range(3)', 'n = 30'],
    core: 'n = 30',
    draws: '三条边各一种颜色的三角形',
    how: '第一条边变长',
    tune: num('n', '把第一条边改长', 30, 70, 30, 90, 20, box('n'), '下标 0 的边长和红色是一对。'),
    quiz: ['i 是 1 时，用的是哪一组？', '第二格的颜色和第二格的边长', '第一格的颜色配最后一条边', '三次都用红色', '同一个下标，把两个列表的同一格配在一起。'],
  },
  {
    title: '把方括号和 for 打准确',
    goal: '打字课：把方括号和 for 再打一遍',
    tags: ['list', 'for_loop'],
    typing: 'keywords',
    lines: ['mid = 40', 'sides = [20, mid, 60]', 'for side in sides:', '    t.forward(side)', '    t.right(90)', 't.done()'],
    keys: ['sides = [20, mid, 60]', 'for side in sides:', 't.forward(side)', 'mid = 40'],
    core: 'mid = 40',
    draws: '三段折线',
    how: '中间那段变长',
    tune: num('mid', '把中间那段改长', 40, 80, 20, 100, 20, box('mid'), '打完方括号，还能看到中间那格变长。'),
    quiz: ['这一节主要在练什么？', '把方括号和 for 打准确', '新学字典', '把基准键再打一遍', '编程关键词只打这一单元刚用过的写法。'],
  },
  {
    title: '先放进一个数',
    goal: '列表可以先只放一个数，再拿出来画',
    tags: ['list', 'function'],
    lines: ['only = 50', 'sides = [only]', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(sides[0])', 't.done()'],
    keys: ['sides = [only]', 'square(sides[0])', 'only = 50', 'def square(side):'],
    core: 'sides = [only]',
    draws: '一个正方形',
    how: '正方形变大',
    tune: num('only', '把这一格改大', 50, 90, 30, 110, 20, box('only'), '列表里只有一格，改它，正方形就变大。'),
    quiz: ['只有一个数的列表，下标是多少？', '还是 0', '是 1', '不能取', '哪怕只有一格，第一格的下标也是 0。'],
  },
  {
    title: '边长一个比一个大',
    goal: '列表里的数越来越大，每格画两条边',
    tags: ['list'],
    lines: ['step = 16', 'sides = [step, 32, 48]', 'for side in sides:', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', '    t.right(90)'],
    keys: ['sides = [step, 32, 48]', 'for side in sides:', 'step = 16', 't.forward(side)'],
    core: 'step = 16',
    draws: '三段越来越长的拐角',
    how: '第一段变长',
    tune: num('step', '把第一段改长', 16, 36, 16, 56, 20, box('step'), '第一格变大，开头的两条边一起变长。'),
    quiz: ['列表的顺序有用吗？', '有用，先写的先画', '没有用，会打乱', '只会用最后一个', 'for 按从左到右的顺序取。'],
  },
  {
    title: '走到下一个再画',
    goal: '每画完一段，就空开一点再拿下一个数',
    tags: ['list', 'penup'],
    lines: ['gap = 20', 'sides = [24, 36, 48]', 'for side in sides:', '    t.forward(side)', '    t.right(90)', '    t.penup()', '    t.forward(gap)', '    t.pendown()'],
    keys: ['t.penup()', 't.forward(gap)', 'for side in sides:', 'gap = 20'],
    core: 'gap = 20',
    draws: '三段分开的短线',
    how: '三段之间离得更远',
    tune: num('gap', '把空隙拉大', 20, 60, 20, 80, 20, box('gap'), '抬笔走得越远，下一段就离得越开。'),
    quiz: ['下一段为什么没有粘在上一段上？', '中间抬笔空走了一段', '列表会自动隔开', 'right 会把线擦掉', 'penup 到 pendown 之间不画线。'],
  },
  {
    title: '把中间那个数改大',
    goal: '只改列表中间那一格，看第三条边里的第二段',
    tags: ['list'],
    lines: ['mid = 30', 'sides = [20, mid, 50]', 'for side in sides:', '    t.forward(side)', '    t.right(120)', 't.done()'],
    keys: ['sides = [20, mid, 50]', 'mid = 30', 'for side in sides:', 't.forward(side)'],
    core: 'mid = 30',
    draws: '一个三角形，中间那条边较短',
    how: '中间那条边变长',
    tune: num('mid', '把中间那格改大', 30, 70, 10, 90, 20, box('mid'), '只改列表中间的数，另外两格不动。'),
    quiz: ['改 mid，哪一条边会变？', '第二格画出的那条边', '三条边一起变', '一条都不变', 'for 走到第二格时，用的就是 mid。'],
  },
  {
    title: '列表和函数一起用',
    goal: '从列表取出边长，再调用正方形',
    tags: ['list', 'function'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'size = 24', 'sides = [size, 40]', 'for side in sides:', '    square(side)', '    t.right(30)'],
    keys: ['for side in sides:', 'square(side)', 'sides = [size, 40]', 'size = 24'],
    core: 'size = 24',
    draws: '两个错开的正方形',
    how: '先画的那个正方形变大',
    tune: num('size', '把第一格改大', 24, 44, 24, 64, 20, box('size'), '第一格变大，第一次调用就画出更大的正方形。'),
    quiz: ['列表和函数怎么配合？', '取出一个数，再传给函数', '函数会自己读心', '列表只能打印，不能画', '括号里可以放刚取出来的那个数。'],
  },
  {
    title: '两种颜色轮流',
    goal: '颜色列表里红蓝交替，四条边轮流涂',
    tags: ['list', 'color'],
    lines: ['ink = "red"', 'colors = [ink, "blue", ink, "blue"]', 'for name in colors:', '    t.color(name)', '    t.forward(36)', '    t.right(90)', 't.done()'],
    keys: ['colors = [ink, "blue", ink, "blue"]', 'for name in colors:', 't.color(name)', 'ink = "red"'],
    core: 'ink = "red"',
    draws: '红蓝相间的正方形',
    how: '红色的两条边变成绿色',
    tune: inkOf('red', 'green', '把红色换成绿色'),
    quiz: ['四种颜色里，红色出现几次？', '两次，第 1 格和第 3 格', '一次', '四次', '列表里写了几次，循环就会用到几次。'],
  },
  {
    title: '画完一个看下一个',
    goal: '每从列表取出一个数，就画一级台阶',
    tags: ['list', 'function'],
    lines: ['def tooth(side):', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', '    t.left(90)', 'last = 20', 'sides = [20, 30, last]', 'for side in sides:', '    tooth(side)'],
    keys: ['def tooth(side):', 'for side in sides:', 'sides = [20, 30, last]', 'last = 20'],
    core: 'last = 20',
    draws: '三级越来越高的台阶',
    how: '最后一级变长',
    tune: num('last', '把最后一级改长', 20, 40, 20, 60, 20, box('last'), '最后一格变大，最后一级台阶就变长。'),
    quiz: ['台阶为什么有三级？', '列表里有三个数，函数被调用三次', '函数自己会变多', 'range 写了 10', 'for 走完列表，一格调用一次。'],
  },
  {
    title: '列表之前再打基准键',
    goal: '打字课：练习基准键位，手指回原位',
    tags: ['list'],
    typing: 'baseline_keys',
    lines: ['side = 30', 'sides = [side, 50]', 'for item in sides:', '    t.forward(item)', '    t.right(90)', 't.done()'],
    keys: ['asdf', 'jkl;', 'ffjj', 'fjfj'],
    core: 'side = 30',
    draws: '一个直角，两条边不一样长',
    how: '第一条边变长',
    tune: num('side', '把第一条边改长', 30, 70, 10, 90, 20, box('side'), '基准键打完，列表的第一格还能改。'),
    quiz: ['这一节在练哪一档打字？', '基准键位', '编程关键词', '下标运算', '打字只有基准键位和编程关键词两档。'],
  },
  {
    title: '换成另一串边长',
    goal: '换一串边长，并且改成向左转',
    tags: ['list'],
    lines: ['low = 16', 'sides = [low, 32, 48, 64]', 'for side in sides:', '    t.forward(side)', '    t.left(90)', 't.done()'],
    keys: ['sides = [low, 32, 48, 64]', 't.left(90)', 'low = 16', 'for side in sides:'],
    core: 'low = 16',
    draws: '四段向左拐的折线',
    how: '第一段变长',
    tune: num('low', '把第一段改长', 16, 36, 16, 56, 20, box('low'), '只改第一格，后面三格还是原来的数。'),
    quiz: ['这一串和前面有什么不同？', '四个数，而且向左转', '还是向右转', '只剩一个数', '列表里的数和转弯方向都可以换。'],
  },
  {
    title: '换成另一串颜色',
    goal: '换成橙、紫、绿三种颜色再画一圈',
    tags: ['list', 'color'],
    lines: ['ink = "orange"', 'colors = [ink, "purple", "green"]', 'for name in colors:', '    t.color(name)', '    t.forward(50)', '    t.right(120)', 't.done()'],
    keys: ['colors = [ink, "purple", "green"]', 't.color(name)', 'ink = "orange"', 'for name in colors:'],
    core: 'ink = "orange"',
    draws: '橙、紫、绿三条边的三角形',
    how: '第一条边从橙色换成蓝色',
    tune: choice('ink', '把橙色换成蓝色', 'orange', 'blue', [['orange', '橙色'], ['blue', '蓝色']], '第一格的颜色名一换，第一条边就变。'),
    quiz: ['第一条边的颜色从哪里来？', '列表第一格', '海龟自己选', '最后一格', 'for 先拿到第一格，就先涂它。'],
  },
  {
    title: '三个方块来自一个列表',
    goal: '一个列表提供三次调用的边长',
    tags: ['list', 'function'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'size = 18', 'for side in [size, 28, 18]:', '    square(side)', '    t.right(15)'],
    keys: ['for side in [size, 28, 18]:', 'square(side)', 'size = 18', 'def square(side):'],
    core: 'size = 18',
    draws: '三个略微错开的正方形',
    how: '第一和第三个正方形变大',
    tune: num('size', '把 18 那两格改大', 18, 38, 18, 58, 20, box('size'), '列表里两格都写着 size，会一起变。'),
    quiz: ['三次边长从哪里来？', '方括号里的三格', '函数画一次就会复制三次', 'range(15)', 'for 走到一格，就调用一次。'],
  },
  {
    title: '一串小旗',
    goal: '用列表里的三个边长，画出一排小旗',
    tags: ['list', 'function', 'penup'],
    lines: ['def flag(side):', '    t.pendown()', '    for i in range(3):', '        t.forward(side)', '        t.right(120)', '    t.penup()', 'gap = 28', 'for side in [16, 22, 16]:', '    flag(side)', '    t.forward(gap)'],
    keys: ['def flag(side):', 'for side in [16, 22, 16]:', 't.penup()', 'gap = 28'],
    core: 'gap = 28',
    draws: '三面排成一排的小旗',
    how: '三面小旗离得更远',
    tune: num('gap', '把旗与旗拉开', 28, 48, 8, 68, 20, box('gap'), '抬笔之后走得越远，下一面旗就离得越开。'),
    quiz: ['三面旗的边长谁说了算？', '列表里的三个数', 'gap 那个数', '函数名字', '每走一格，就把那个数传给 flag。'],
    badge: { id: 'flag_row', title: '一串小旗' },
  },
]

/** 第 181–200 关。函数套进循环。 */
const UNIT4 = [
  {
    title: '外层转一下再调用',
    goal: '每调用一次正方形，就在外面转一个角度',
    tags: ['function', 'for_loop'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'turn = 30', 'for i in range(4):', '    square(24)', '    t.right(turn)'],
    keys: ['for i in range(4):', 'square(24)', 't.right(turn)', 'turn = 30'],
    core: 'turn = 30',
    draws: '四个转开的正方形',
    how: '四个正方形转得更开',
    tune: num('turn', '把外层转角改大', 30, 60, 15, 90, 15, box('turn'), '函数里面的 90 度不动，只改外面这一转。'),
    quiz: ['转角写在函数里面还是外面？', '调用之后，写在循环里面', '写在 def 那一行', '海龟自己会转', '函数只负责一个正方形，外面的循环负责往下转。'],
  },
  {
    title: '收成两层',
    goal: '里层多次调用函数，外层再转一个大角',
    tags: ['function', 'for_loop'],
    lines: ['def petal(side):', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'times = 3', 'for i in range(4):', '    for j in range(times):', '        petal(16)', '    t.right(90)'],
    keys: ['for j in range(times):', 'for i in range(4):', 'petal(16)', 'times = 3'],
    core: 'times = 3',
    draws: '四组花瓣',
    how: '每一组的花瓣变多',
    tune: num('times', '每组多画两片', 3, 5, 1, 5, 2, box('times'), '里层的次数变多，每一组就多调用几次。'),
    quiz: ['两层循环各管什么？', '里层调用函数，外层负责转向', '两层做同一件事', '只有里层有用', '外层转一次，里层先把这一组画完。'],
  },
  {
    title: '六次调用转出花瓣',
    goal: '把一片花瓣收成函数，调用六次转开来',
    tags: ['function', 'for_loop'],
    lines: ['def petal(side):', '    t.forward(side)', '    t.right(120)', '    t.forward(side)', '    t.right(30)', 'n = 6', 'for i in range(n):', '    petal(28)'],
    keys: ['def petal(side):', 'for i in range(n):', 'n = 6', 'petal(28)'],
    core: 'n = 6',
    draws: '六片花瓣',
    how: '花瓣变成八片',
    tune: num('n', '改成八片', 6, 8, 4, 8, 2, box('n'), '循环次数变多，函数就被多调用几次。'),
    quiz: ['六片花瓣是怎么来的？', '函数被调用了六次', '函数里面写了六条边', '海龟会复制', 'range(n) 决定调用几次。'],
  },
  {
    title: '把花瓣转得更密',
    goal: '调用之间的转角变小，花瓣就排得更密',
    tags: ['function', 'for_loop'],
    lines: ['def petal(side):', '    t.forward(side)', '    t.right(40)', 'turn = 45', 'for i in range(8):', '    petal(30)', '    t.right(turn)'],
    keys: ['t.right(turn)', 'turn = 45', 'petal(30)', 'range(8)'],
    core: 'turn = 45',
    draws: '八片转开的花瓣',
    how: '花瓣之间的角度变小',
    tune: num('turn', '把转角收到 15 度', 45, 15, 15, 75, 15, box('turn'), '外层转得越少，下一片就离得越近。'),
    quiz: ['想让花瓣更密，改什么？', '把外层转角改小', '把函数删掉', '把次数改成 1', '次数不变时，转角越小排得越密。'],
  },
  {
    title: '花瓣用函数里的边长',
    goal: '花瓣的长短由传进函数的数决定',
    tags: ['function', 'variable'],
    lines: ['def petal(side):', '    for i in range(2):', '        t.forward(side)', '        t.right(60)', 'for i in range(6):', '    petal(20)', '    t.right(60)'],
    keys: ['def petal(side):', 'petal(20)', 't.forward(side)', 'range(6)'],
    core: 'petal(20)',
    draws: '六片较短的花瓣',
    how: '六片花瓣一起变长',
    tune: num('side', '把花瓣改长', 20, 40, 20, 60, 20, arg('petal', 0, 2), '传进函数的数一变，每一片都变长。'),
    quiz: ['20 这个数去了哪里？', '传进 side，花瓣的边用它', '只决定画几片', '让海龟转 20 度', '函数里的 forward 用的是传进来的 side。'],
  },
  {
    title: '第一片涂红',
    goal: '六片花瓣里，只有第一片涂红',
    tags: ['function', 'if', 'for_loop'],
    lines: ['def petal(side):', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'for i in range(6):', '    if i == 0:', '        t.color("red")', '    else:', '        t.color("blue")', '    petal(24)'],
    keys: ['if i == 0:', 't.color("red")', 'petal(24)', 'range(6)'],
    core: 'petal(24)',
    draws: '第一片红色、其余蓝色的花瓣',
    how: '六片花瓣一起变长',
    tune: num('side', '把花瓣改长', 24, 44, 24, 64, 20, arg('petal', 0, 2), '颜色不变，六片一起变长。'),
    quiz: ['红色出现在第几片？', 'i 等于 0 的第一片', '每一片', '最后一片', '其余次数走进 else，涂的是蓝色。'],
  },
  {
    title: '三角花瓣',
    goal: '把三角形函数放进循环，转出六片',
    tags: ['function', 'for_loop'],
    lines: ['def triangle(side):', '    for i in range(3):', '        t.forward(side)', '        t.right(120)', 'turn = 60', 'for i in range(6):', '    triangle(22)', '    t.right(turn)'],
    keys: ['def triangle(side):', 'triangle(22)', 't.right(turn)', 'turn = 60'],
    core: 'turn = 60',
    draws: '六片三角形花瓣',
    how: '花瓣之间的角度变小',
    tune: num('turn', '把转角收到 30 度', 60, 30, 30, 90, 30, box('turn'), '外层转角变小，下一片三角就离得更近。'),
    quiz: ['三角形是谁画的？', 'triangle 函数', '外层循环自己会画三角', 'right 会画三角', '循环只负责调用和转向。'],
  },
  {
    title: '把 for 和 def 打准确',
    goal: '打字课：把 for 和 def 再打一遍',
    tags: ['function', 'for_loop'],
    typing: 'keywords',
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'n = 4', 'for i in range(n):', '    square(20)', '    t.right(90)'],
    keys: ['def square(side):', 'for i in range(n):', 'square(20)', 'n = 4'],
    core: 'n = 4',
    draws: '四个转开的正方形',
    how: '正方形变成六个',
    tune: num('n', '改成六次', 4, 6, 2, 8, 2, box('n'), '打完 for 和 def，还能把调用次数加多。'),
    quiz: ['这一节主要在练什么？', '把 for 和 def 打准确', '新学字典', '基准键位', '编程关键词只打这一单元刚用过的词。'],
  },
  {
    title: '四片方瓣',
    goal: '四个正方形各挪一点再转 90 度',
    tags: ['function', 'for_loop', 'penup'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'for i in range(4):', '    square(30)', '    t.penup()', '    t.forward(10)', '    t.pendown()', '    t.right(90)'],
    keys: ['square(30)', 't.penup()', 'range(4)', 't.right(90)'],
    core: 'square(30)',
    draws: '四个挪开的正方形',
    how: '四个方瓣一起变大',
    tune: num('side', '把方瓣改大', 30, 50, 10, 70, 20, arg('square', 0, 2), '四次调用用的是同一个边长。'),
    quiz: ['四个方块为什么不叠在同一个点？', '每次调用后抬笔挪了一点', '函数会自动躲开', 'range 会换位置', 'penup 之后的 forward 把下一幅的起点挪开了。'],
  },
  {
    title: '函数外面再转一个大角',
    goal: '前三个小转，画完再在函数外面转一个大角',
    tags: ['function', 'for_loop'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'for i in range(3):', '    square(24)', '    t.right(20)', 't.right(80)', 'square(24)'],
    keys: ['t.right(80)', 't.right(20)', 'square(24)', 'range(3)'],
    core: 't.right(80)',
    draws: '三个小转后再来一个正方形',
    how: '最后那一次大转变小',
    tune: num('turn', '把大转角改小', 80, 40, 20, 100, 20, arg('right', 0, 3), '只改循环外面的那一次转弯。'),
    quiz: ['80 度写在哪里？', '循环结束之后', '函数里面', '每一次调用之前', '函数外面的转弯，会留给下一次调用。'],
  },
  {
    title: '八片小瓣',
    goal: '一片花瓣是走出去再退回来，转八次',
    tags: ['function', 'for_loop'],
    lines: ['def petal(side):', '    t.forward(side)', '    t.backward(side)', 'n = 8', 'for i in range(n):', '    petal(36)', '    t.right(45)'],
    keys: ['t.backward(side)', 'n = 8', 'petal(36)', 't.right(45)'],
    core: 'n = 8',
    draws: '八片从中心伸出的小瓣',
    how: '小瓣变成四片',
    tune: num('n', '改成四片', 8, 4, 4, 12, 4, box('n'), '次数少了，转出来的片数就少。'),
    quiz: ['为什么花瓣的尽头没有停在外面？', 'forward 之后又 backward 退了回来', 'right 会把线擦掉', '函数只能画一半', '退回来，下一片才能从中心再出发。'],
  },
  {
    title: '把片数改少',
    goal: '还是转着调用，这一次把片数从八片改少',
    tags: ['function', 'for_loop'],
    lines: ['def petal(side):', '    t.forward(side)', '    t.right(100)', '    t.forward(side)', 'n = 8', 'for i in range(n):', '    petal(18)', '    t.left(45)'],
    keys: ['n = 8', 'petal(18)', 't.left(45)', 'range(n)'],
    core: 'n = 8',
    draws: '八片向左排开的花瓣',
    how: '花瓣变成四片',
    tune: num('n', '改成四片', 8, 4, 4, 12, 4, box('n'), '只改次数，花瓣的形状先不动。'),
    quiz: ['片数写在哪里？', '盒子 n，再交给 range', '写在函数名字里', '由 left 决定', 'range(n) 用盒子里的次数。'],
  },
  {
    title: '内层函数，外层换色',
    goal: '每换一种颜色，就调用一次正方形',
    tags: ['function', 'color', 'for_loop'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'colors = ["red", "blue", "green", "orange"]', 'for name in colors:', '    t.color(name)', '    square(22)', '    t.right(90)'],
    keys: ['for name in colors:', 't.color(name)', 'square(22)', 'colors = ["red", "blue", "green", "orange"]'],
    core: 'square(22)',
    draws: '四个不同颜色的正方形',
    how: '四个正方形一起变大',
    tune: num('side', '把正方形改大', 22, 42, 22, 62, 20, arg('square', 0, 2), '颜色还是那四种，边长一起变。'),
    quiz: ['颜色是在函数里面换的吗？', '不是，调用之前就换好了', '是，函数会自己轮换', '正方形不能上色', '外层负责换色和转向，函数负责画。'],
  },
  {
    title: '两层都用盒子里的数',
    goal: '外层的次数和花瓣的边长都先放进盒子',
    tags: ['function', 'variable', 'for_loop'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'outer = 4', 'inner = 24', 'for i in range(outer):', '    square(inner)', '    t.right(90)'],
    keys: ['outer = 4', 'inner = 24', 'square(inner)', 'range(outer)'],
    core: 'inner = 24',
    draws: '四个正方形',
    how: '四个正方形一起变大',
    tune: num('inner', '把边长改大', 24, 44, 24, 64, 20, box('inner'), '次数先不动，只把传进函数的边长改大。'),
    quiz: ['outer 和 inner 各管什么？', 'outer 是次数，inner 是边长', '两个都是颜色', 'outer 是边长', '一个盒子交给 range，一个盒子交给函数。'],
  },
  {
    title: '花心再画一个小方块',
    goal: '花瓣转完以后，再在中心调用一次小正方形',
    tags: ['function', 'for_loop'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'for i in range(6):', '    square(20)', '    t.right(60)', 'square(12)', 't.done()'],
    keys: ['square(20)', 'square(12)', 'range(6)', 't.right(60)'],
    core: 'square(12)',
    draws: '六片方瓣，中心还有一个小方块',
    how: '中心的小方块变大',
    tune: num('side', '把花心改大', 12, 28, 12, 36, 8, arg('square', 0, 3), '循环里的 20 不动，只改最后一次调用。'),
    quiz: ['中心的小方块是哪一次调用？', '循环结束之后的 square(12)', '六次里面的每一次', 'def 自己画的', '循环负责花瓣，循环后再调用一次才是花心。'],
  },
  {
    title: '花瓣之前再打基准键',
    goal: '打字课：练习基准键位，手指回原位',
    tags: ['function'],
    typing: 'baseline_keys',
    lines: ['def triangle(side):', '    for i in range(3):', '        t.forward(side)', '        t.right(120)', 'n = 4', 'for i in range(n):', '    triangle(20)', '    t.right(90)'],
    keys: ['asdf', 'jkl;', 'ffjj', 'fjfj'],
    core: 'n = 4',
    draws: '四个转开的三角形',
    how: '三角形变成八个',
    tune: num('n', '改成八次', 4, 8, 4, 8, 4, box('n'), '基准键打完，调用次数还能加。'),
    quiz: ['这一节在练哪一档打字？', '基准键位', '编程关键词', '两层循环的新写法', '打字只有基准键位和编程关键词两档。'],
  },
  {
    title: '六片再开一次',
    goal: '再转出六片从中心伸出的花瓣',
    tags: ['function', 'for_loop'],
    lines: ['def petal(side):', '    t.forward(side)', '    t.backward(side)', 'turn = 60', 'for i in range(6):', '    petal(32)', '    t.right(turn)'],
    keys: ['turn = 60', 'petal(32)', 't.backward(side)', 'range(6)'],
    core: 'turn = 60',
    draws: '六片从中心伸出的花瓣',
    how: '花瓣之间的角度变小',
    tune: num('turn', '把转角收到 30 度', 60, 30, 30, 90, 30, box('turn'), '片数不变，只把每片之间的角度改小。'),
    quiz: ['这一节新加了哪种图形？', '没有新图形，还是走出去再退回', '新学了圆形', '新学了字典', '练习关把已经会的花瓣再转一次。'],
  },
  {
    title: '三角花瓣再练',
    goal: '五个三角形转成一圈',
    tags: ['function', 'for_loop'],
    lines: ['def triangle(side):', '    for i in range(3):', '        t.forward(side)', '        t.right(120)', 'for i in range(5):', '    triangle(18)', '    t.right(72)', 't.done()'],
    keys: ['triangle(18)', 'range(5)', 't.right(72)', 'def triangle(side):'],
    core: 'triangle(18)',
    draws: '五个三角形花瓣',
    how: '五个三角形一起变大',
    tune: num('side', '把三角改大', 18, 38, 18, 58, 20, arg('triangle', 0, 2), '五次调用用的是同一个边长。'),
    quiz: ['五个三角形要调用几次？', '五次', '一次', '三次', 'range(5) 让调用做五遍。'],
  },
  {
    title: '把第一片的红色换掉',
    goal: '第一片的颜色放在盒子里，其余仍是蓝色',
    tags: ['function', 'if', 'color'],
    lines: ['ink = "red"', 'def petal(side):', '    t.color(ink)', '    t.forward(side)', '    t.backward(side)', '    t.right(60)', 'for i in range(6):', '    petal(22)', '    ink = "blue"'],
    keys: ['ink = "red"', 'ink = "blue"', 't.color(ink)', 'petal(22)'],
    core: 'ink = "red"',
    draws: '第一片红色、其余蓝色的六片花瓣',
    how: '第一片从红色换成紫色',
    tune: inkOf('red', 'purple', '把第一片换成紫色'),
    quiz: ['换成紫色以后，其他五片呢？', '还是蓝色', '也变成紫色', '变成红色', '第一片用盒子里的颜色，调用之后盒子被换成蓝色。'],
  },
  {
    title: '方瓣花环',
    goal: '把正方形套进循环，转成一圈花环',
    tags: ['function', 'for_loop'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'n = 8', 'for i in range(n):', '    square(18)', '    t.right(45)', 't.done()'],
    keys: ['def square(side):', 'for i in range(n):', 'square(18)', 'n = 8'],
    core: 'n = 8',
    draws: '八个转开的方瓣',
    how: '方瓣变成四个',
    tune: num('n', '改成四个方瓣', 8, 4, 4, 12, 4, box('n'), '次数少一半，花环就疏一些。'),
    quiz: ['花环上的每一瓣是什么？', '一次 square 调用', '一条直线', '字典里的一个键', '循环每走一圈，就画一个正方形再转向。'],
    badge: { id: 'square_wreath', title: '方瓣花环' },
  },
]

/** 第 201–220 关。字符串和打印。每一关仍要画出线。 */
const UNIT5 = [
  {
    title: '先打印作品名字',
    goal: '先把作品名字打印出来，再画正方形',
    tags: ['print', 'function'],
    lines: ['print("小窗")', 'def square():', '    for i in range(4):', '        t.forward(40)', '        t.right(90)', 'square()', 't.done()'],
    keys: ['print("小窗")', 'def square():', 'square()', 't.forward(40)'],
    core: 'print("小窗")',
    draws: '一个正方形，屏幕上有一行「小窗」',
    how: '正方形变大，名字还在',
    tune: num('side', '把正方形改大', 40, 80, 20, 100, 20, arg('forward', 0, 1), '打印的那一行不动，只把边长改大。'),
    quiz: ['print 会画出线吗？', '不会，它把字送到屏幕上', '会画出 print 的形状', '会代替 forward', '字和海龟是两件事，这一关两件都做。'],
  },
  {
    title: '名字装进盒子',
    goal: '先把名字放进盒子，再打印盒子',
    tags: ['print', 'variable'],
    lines: ['title = "小旗"', 'print(title)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(36)', 't.done()'],
    keys: ['title = "小旗"', 'print(title)', 'square(36)', 'def square(side):'],
    core: 'title = "小旗"',
    draws: '一个正方形，屏幕上有一行「小旗」',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 36, 76, 16, 96, 20, arg('square', 0, 2), '名字还在盒子里，边长可以单独改。'),
    quiz: ['print(title) 打出什么？', '盒子里的「小旗」', '单词 title', '正方形', '打印变量，打的是它记住的那串字。'],
  },
  {
    title: '用加号接上一句',
    goal: '用加号把两段字接成一个标题',
    tags: ['string', 'print'],
    lines: ['title = "我的" + "小窗"', 'print(title)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(40)', 't.done()'],
    keys: ['"我的" + "小窗"', 'print(title)', 'square(40)', 'def square(side):'],
    core: 'print(title)',
    draws: '一个正方形，标题是「我的小窗」',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 40, 80, 20, 100, 20, arg('square', 0, 2), '标题已经接好，这一次只把边长改大。'),
    quiz: ['加号接两段字，中间会多一个空格吗？', '不会，两段紧挨着', '会自动空一格', '会变成数字', '加号只把两段按写出的样子接上。'],
  },
  {
    title: '把标题换成自己的',
    goal: '标题用的是颜色的名字，正方形也涂成这个颜色',
    tags: ['string', 'color'],
    lines: ['title = "red"', 'print(title)', 't.color(title)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(40)', 't.done()'],
    keys: ['title = "red"', 'print(title)', 't.color(title)', 'square(40)'],
    core: 'title = "red"',
    draws: '一个红色正方形，屏幕上有一行 red',
    how: '标题和正方形一起变成紫色',
    tune: choice('title', '换成紫色', 'red', 'purple', [['red', '红色'], ['purple', '紫色']], '这一个词既打印出来，也拿去涂色。'),
    quiz: ['同一个词为什么能又打印又涂色？', '它是颜色的名字，print 和 color 都能用', 'print 会自动涂色', '正方形的名字就是颜色', '颜色名本身也是一串字。'],
  },
  {
    title: '打印完再画正方形',
    goal: '字先出现，然后才调用正方形',
    tags: ['print', 'function'],
    lines: ['print("先说再画")', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(48)', 't.done()'],
    keys: ['print("先说再画")', 'square(48)', 'def square(side):', 't.forward(side)'],
    core: 'print("先说再画")',
    draws: '一个正方形，屏幕上先有一行字',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 48, 88, 28, 108, 20, arg('square', 0, 2), '字还是那一句，只把边长改大。'),
    quiz: ['这一关先做什么？', '先 print，再调用函数', '先画完再打印', '只画不说', '写在前面的行先做。'],
  },
  {
    title: '空着就用默认名字',
    goal: '标题还空着的时候，换上默认名字，并把边长加长',
    tags: ['string', 'if'],
    lines: ['title = ""', 'side = 30', 'if title == "":', '    title = "小房子"', '    side = 60', 'print(title)', 'for i in range(4):', '    t.forward(side)', '    t.right(90)'],
    keys: ['title = ""', 'if title == "":', 'title = "小房子"', 'print(title)'],
    core: 'title = ""',
    draws: '一个较大的正方形，标题是「小房子」',
    how: '写上自己的标题后，正方形变小',
    tune: choice('title', '写上小旗', '', '小旗', [['', '先空着'], ['小旗', '小旗']], '不再是空的，就不会换上默认名字和较长的边。'),
    quiz: ['标题是空的时，会打印什么？', '小房子', '什么都不打印', '两个引号', 'if 成立时，会先把默认名字装进去。'],
  },
  {
    title: '标题和边长各记一个',
    goal: '标题用一个盒子，边长用另一个盒子',
    tags: ['string', 'variable'],
    lines: ['title = "方块"', 'side = 36', 'print(title)', 'def square(n):', '    for i in range(4):', '        t.forward(n)', '        t.right(90)', 'square(side)', 't.done()'],
    keys: ['title = "方块"', 'side = 36', 'print(title)', 'square(side)'],
    core: 'side = 36',
    draws: '一个正方形，标题是「方块」',
    how: '正方形变大，标题不变',
    tune: num('side', '把边长改大', 36, 76, 16, 96, 20, box('side'), '标题那个盒子不动。'),
    quiz: ['两个盒子可以各记各的吗？', '可以，一个记字，一个记数', '不可以，只能有一个盒子', '字会把数字冲掉', '变量名不同，里面的东西就互不影响。'],
  },
  {
    title: '把 print 和加号打准确',
    goal: '打字课：把 print 和加号再打一遍',
    tags: ['print', 'string'],
    typing: 'keywords',
    lines: ['title = "画" + "完了"', 'print(title)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(32)', 't.done()'],
    keys: ['print(title)', 'title = "画" + "完了"', 'square(32)', 'def square(side):'],
    core: 'print(title)',
    draws: '一个正方形，标题是「画完了」',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 32, 72, 12, 92, 20, arg('square', 0, 2), '加号和 print 先打熟，边长还能改。'),
    quiz: ['这一节主要在练什么？', '把 print 和加号打准确', '新学一种循环', '基准键位', '编程关键词只打这一单元刚用过的写法。'],
  },
  {
    title: '画完再打印画好了',
    goal: '正方形画完，再打印一句画好了',
    tags: ['print', 'function'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(44)', 'print("画好了")', 't.done()'],
    keys: ['square(44)', 'print("画好了")', 'def square(side):', 't.done()'],
    core: 'print("画好了")',
    draws: '一个正方形，画完后有一行「画好了」',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 44, 84, 24, 104, 20, arg('square', 0, 2), '结束语不动，只把边长改大。'),
    quiz: ['「画好了」什么时候出现？', '正方形调用之后', '什么都没画的时候', '写在 def 里面才会出现', 'print 写在调用后面，就后做。'],
  },
  {
    title: '两行字各占一行',
    goal: '两次 print，就是上下两行字',
    tags: ['print'],
    lines: ['print("第一行")', 'print("第二行")', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(28)', 't.done()'],
    keys: ['print("第一行")', 'print("第二行")', 'square(28)', 'def square(side):'],
    core: 'print("第一行")',
    draws: '一个正方形，屏幕上有两行字',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 28, 68, 28, 88, 20, arg('square', 0, 2), '两行字不动，只把边长改大。'),
    quiz: ['两次 print 会怎样？', '各占一行', '接在同一行', '只留下最后一句', '每写一次 print，就换一行。'],
  },
  {
    title: '颜色的名字也是文字',
    goal: '盒子里的颜色名先打印，再拿去涂色',
    tags: ['string', 'color'],
    lines: ['ink = "green"', 'print(ink)', 't.color(ink)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(42)', 't.done()'],
    keys: ['ink = "green"', 'print(ink)', 't.color(ink)', 'square(42)'],
    core: 'ink = "green"',
    draws: '一个绿色正方形，屏幕上有一行 green',
    how: '标题和正方形一起变成橙色',
    tune: choice('ink', '换成橙色', 'green', 'orange', [['green', '绿色'], ['orange', '橙色']], '打印出来的词和画笔用的是同一个盒子。'),
    quiz: ['ink 里面放的是什么？', '颜色的名字，一串字', '已经画好的线', '一个列表', 'color 认识的红蓝绿，写出来也是文字。'],
  },
  {
    title: '把第二行换一句',
    goal: '第二行打印颜色名，正方形也涂成这个颜色',
    tags: ['string', 'color'],
    lines: ['line = "purple"', 'print("颜色是")', 'print(line)', 't.color(line)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(34)'],
    keys: ['print("颜色是")', 'print(line)', 'line = "purple"', 't.color(line)'],
    core: 'line = "purple"',
    draws: '一个紫色正方形，下面还有一行颜色名',
    how: '第二行和正方形一起变成红色',
    tune: choice('line', '把第二行换成红色', 'purple', 'red', [['purple', '紫色'], ['red', '红色']], '第二行打印什么，画笔就涂什么。'),
    quiz: ['第一行会跟着变吗？', '不会，第一行还是「颜色是」', '两行都会变成红色', '第一行会被删掉', '只有盒子 line 那一行换了。'],
  },
  {
    title: '数字不能直接接在句子后面',
    goal: '句子和数字分开打印，边长仍拿去画正方形',
    tags: ['print', 'variable'],
    lines: ['side = 40', 'print("边长")', 'print(side)', 'def square(n):', '    for i in range(4):', '        t.forward(n)', '        t.right(90)', 'square(side)'],
    keys: ['print("边长")', 'print(side)', 'side = 40', 'square(side)'],
    core: 'print(side)',
    draws: '一个正方形，字和数字分成两行',
    how: '打印出的数字和正方形一起变大',
    tune: num('side', '把边长改成 80', 40, 80, 20, 100, 20, box('side'), '这一关先不把数字接到句子上。'),
    quiz: ['为什么这一关写成两次 print？', '句子和数字分开，就不会加在一起', 'print 只能写一次', '数字不能打印', '直接把句子加数字会合并不了，下一节再用 str。'],
  },
  {
    title: '用 str 把数字变成文字',
    goal: '用 str 把边长变成文字，再接到句子后面',
    tags: ['string', 'print'],
    lines: ['side = 40', 'title = "边长" + str(side)', 'print(title)', 'def square(n):', '    for i in range(4):', '        t.forward(n)', '        t.right(90)', 'square(side)', 't.done()'],
    keys: ['str(side)', 'title = "边长" + str(side)', 'print(title)', 'side = 40'],
    core: 'side = 40',
    draws: '一个正方形，标题里带上边长',
    how: '标题里的数字和正方形一起变大',
    tune: num('side', '把边长改成 80', 40, 80, 20, 100, 20, box('side'), 'str 会把新的数字变成文字，再接到「边长」后面。'),
    quiz: ['str 做了什么？', '把数字变成可以接上的文字', '把文字变成海龟', '把正方形涂色', '加号的两边都得是文字，所以数字要先变过去。'],
  },
  {
    title: '拼好标题再画',
    goal: '名字和「的小窗」拼成标题，再画一扇窗',
    tags: ['string', 'function'],
    lines: ['name = "小满"', 'title = name + "的小窗"', 'print(title)', 'def window(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'window(38)', 't.done()'],
    keys: ['name + "的小窗"', 'print(title)', 'window(38)', 'name = "小满"'],
    core: 'window(38)',
    draws: '一扇小窗，标题是「小满的小窗」',
    how: '小窗变大',
    tune: num('side', '把小窗改大', 38, 78, 18, 98, 20, arg('window', 0, 2), '标题先拼好，这一次只改窗的边长。'),
    quiz: ['标题是哪两段拼的？', '「小满」和「的小窗」', '只有「小满」', '窗的边长', '加号左边是盒子，右边是一段字。'],
  },
  {
    title: '写标题之前再打基准键',
    goal: '打字课：练习基准键位，手指回原位',
    tags: ['print'],
    typing: 'baseline_keys',
    lines: ['print("基准")', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(30)', 't.done()'],
    keys: ['asdf', 'jkl;', 'ffjj', 'fjfj'],
    core: 'square(30)',
    draws: '一个正方形，屏幕上有一行「基准」',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 30, 70, 10, 90, 20, arg('square', 0, 2), '基准键打完，正方形还能改大。'),
    quiz: ['这一节在练哪一档打字？', '基准键位', '编程关键词', '字符串加法', '打字只有基准键位和编程关键词两档。'],
  },
  {
    title: '换一个默认名字',
    goal: '空标题换成另一个默认名字，边长也不同',
    tags: ['string', 'if'],
    lines: ['title = ""', 'side = 28', 'if title == "":', '    title = "未命名"', '    side = 48', 'print(title)', 'for i in range(4):', '    t.forward(side)', '    t.right(90)'],
    keys: ['title = ""', 'title = "未命名"', 'if title == "":', 'print(title)'],
    core: 'title = ""',
    draws: '一个正方形，标题是「未命名」',
    how: '写上小花园后，正方形用较短的边',
    tune: choice('title', '写上小花园', '', '小花园', [['', '先空着'], ['小花园', '小花园']], '有了自己的标题，就不再换成「未命名」。'),
    quiz: ['这一次的默认名字是什么？', '未命名', '小房子', '小花园', 'if 里面装进去的那一句，就是默认名字。'],
  },
  {
    title: '把画好了换成完成',
    goal: '结束语放进盒子，画完正方形再打印',
    tags: ['string', 'print'],
    lines: ['word = "画好了"', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(46)', 'print(word)', 't.done()'],
    keys: ['word = "画好了"', 'print(word)', 'square(46)', 'def square(side):'],
    core: 'square(46)',
    draws: '一个正方形，结束语是「画好了」',
    how: '正方形变大，结束语还在',
    tune: num('side', '把正方形改大', 46, 86, 26, 106, 20, arg('square', 0, 2), '结束语还是盒子里的那一句。'),
    quiz: ['结束语从哪里打印出来？', '盒子 word', '函数的名字', '正方形的边长', 'print 打印的是盒子现在记住的字。'],
  },
  {
    title: '标题、正方形、结束语',
    goal: '先打印标题，再画正方形，最后打印结束语',
    tags: ['string', 'function', 'print'],
    lines: ['title = "我的方块"', 'print(title)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(26)', 'print("结束")', 't.done()'],
    keys: ['title = "我的方块"', 'print(title)', 'square(26)', 'print("结束")'],
    core: 'square(26)',
    draws: '一个正方形，前后各有一行字',
    how: '正方形变大',
    tune: num('side', '把正方形改大', 26, 66, 26, 86, 20, arg('square', 0, 2), '两行字不动，只把边长改大。'),
    quiz: ['这三件事的顺序是什么？', '标题，正方形，结束语', '先画再起名', '只打印不画', '代码从上往下做。'],
  },
  {
    title: '我的作品签名',
    goal: '拼出一行签名，再画两扇窗',
    tags: ['string', 'function', 'print'],
    lines: ['title = "小满" + "的作品"', 'print(title)', 'def window(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'window(48)', 'window(24)', 't.done()'],
    keys: ['"小满" + "的作品"', 'print(title)', 'window(48)', 'window(24)'],
    core: 'window(48)',
    draws: '两扇叠着的小窗，上面有一行签名',
    how: '外面那扇窗变大',
    tune: num('side', '把外层窗改大', 48, 68, 28, 88, 20, arg('window', 0, 2), '里面那扇还是 24，签名也不变。'),
    quiz: ['签名是怎么来的？', '两段字用加号接上，再 print', '窗会自己写字', '函数名就是签名', '打印负责字，函数负责两扇窗。'],
    badge: { id: 'signed_work', title: '我的作品签名' },
  },
]

/** 第 221–240 关。字典入门。键用中文，值里的颜色仍是画布认识的词。 */
const UNIT6 = [
  {
    title: '字典里记住红色',
    goal: '用「窗」这个键记住红色，再取出来画',
    tags: ['dict', 'color'],
    lines: ['ink = "red"', 'box = {"窗": ink}', 'print(box["窗"])', 't.color(box["窗"])', 't.forward(60)', 't.right(90)', 't.forward(60)', 't.done()'],
    keys: ['box = {"窗": ink}', 'box["窗"]', 'ink = "red"', 't.color(box["窗"])'],
    core: 'ink = "red"',
    draws: '一个红色直角，屏幕上有一行 red',
    how: '直角从红色变成蓝色',
    tune: inkOf('red', 'blue', '把窗的颜色换成蓝'),
    quiz: ['字典用什么把名字和值配成一对？', '键和值，写在花括号里', '只用方括号', '只用 def', '键是用来查的名字，值是查到的东西。'],
  },
  {
    title: '用键把颜色取出来',
    goal: '先用键取出颜色，放进另一个盒子再涂',
    tags: ['dict', 'color'],
    lines: ['ink = "blue"', 'box = {"门": ink}', 'got = box["门"]', 't.color(got)', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(40)'],
    keys: ['got = box["门"]', 'box = {"门": ink}', 't.color(got)', 'ink = "blue"'],
    core: 'ink = "blue"',
    draws: '一个蓝色正方形',
    how: '正方形变成绿色',
    tune: inkOf('blue', 'green', '把门的颜色换成绿'),
    quiz: ['box["门"] 得到的是什么？', '这个键配着的颜色', '键的名字本身', '一个正方形', '方括号里写键，取到的是它的值。'],
  },
  {
    title: '再放一个蓝色',
    goal: '字典里同时记住门和窗两种颜色',
    tags: ['dict', 'color'],
    lines: ['door = "red"', 'window = "blue"', 'box = {"门": door, "窗": window}', 't.color(box["门"])', 't.forward(50)', 't.right(90)', 't.color(box["窗"])', 't.forward(50)', 't.done()'],
    keys: ['box = {"门": door, "窗": window}', 'box["门"]', 'box["窗"]', 'window = "blue"'],
    core: 'window = "blue"',
    draws: '先红后蓝的一个直角',
    how: '第二笔从蓝色变成紫色',
    tune: choice('window', '把窗换成紫色', 'blue', 'purple', [['blue', '蓝色'], ['purple', '紫色']], '只改「窗」这个键配的颜色。'),
    quiz: ['一个字典可以有几对？', '可以有多对，这一关有两对', '只能有一对', '只能有颜色，不能有两个键', '花括号里用逗号再写一对。'],
  },
  {
    title: '把窗的颜色换成绿色',
    goal: '窗的颜色放在盒子里，再放进字典',
    tags: ['dict', 'color'],
    lines: ['window = "red"', 'box = {"窗": window}', 't.color(box["窗"])', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(36)', 't.done()'],
    keys: ['window = "red"', 'box = {"窗": window}', 't.color(box["窗"])', 'square(36)'],
    core: 'window = "red"',
    draws: '一个红色正方形',
    how: '正方形变成绿色',
    tune: choice('window', '把窗换成绿色', 'red', 'green', [['red', '红色'], ['green', '绿色']], '字典里的值跟着这个盒子走。'),
    quiz: ['想换窗的颜色，改哪里？', '改 window 记住的颜色名', '把花括号删掉', '把键改成数字', '键还是「窗」，值换成新的颜色名。'],
  },
  {
    title: '取出颜色再涂',
    goal: '从字典取出旗的颜色，再画三角形',
    tags: ['dict', 'color', 'function'],
    lines: ['ink = "orange"', 'box = {"旗": ink}', 't.color(box["旗"])', 'def triangle(side):', '    for i in range(3):', '        t.forward(side)', '        t.right(120)', 'triangle(40)', 't.done()'],
    keys: ['box = {"旗": ink}', 't.color(box["旗"])', 'triangle(40)', 'ink = "orange"'],
    core: 'ink = "orange"',
    draws: '一面橙色三角旗',
    how: '旗子变成紫色',
    tune: inkOf('orange', 'purple', '把旗换成紫色'),
    quiz: ['涂色用的是键还是值？', '用值，也就是颜色名', '用键「旗」去涂', '函数名就是颜色', '键用来查找，找到的值才拿去 color。'],
  },
  {
    title: '窗和门各一种颜色',
    goal: '同一本字典里，门和窗各取一次颜色',
    tags: ['dict', 'color'],
    lines: ['door = "green"', 'window = "orange"', 'box = {"门": door, "窗": window}', 't.color(box["门"])', 't.forward(40)', 't.right(90)', 't.forward(24)', 't.color(box["窗"])', 't.forward(40)', 't.done()'],
    keys: ['box["门"]', 'box["窗"]', 'door = "green"', 'window = "orange"'],
    core: 'box["窗"]',
    draws: '门是绿色、窗是橙色的一条折线',
    how: '窗那一笔变成蓝色',
    tune: choice('window', '把窗换成蓝色', 'orange', 'blue', [['orange', '橙色'], ['blue', '蓝色']], '门的绿色不动。'),
    quiz: ['两次 color 为什么颜色不同？', '查了两个不同的键', '画笔会自己变', 'forward 会改颜色', '键不同，取到的值就可以不同。'],
  },
  {
    title: '键不对就用默认色',
    goal: '键对得上才用字典里的红色，否则涂蓝',
    tags: ['dict', 'if', 'color'],
    lines: ['key = "门"', 'box = {"窗": "red"}', 'if key == "窗":', '    t.color(box["窗"])', 'else:', '    t.color("blue")', 'for i in range(4):', '    t.forward(40)', '    t.right(90)'],
    keys: ['if key == "窗":', 'key = "门"', 'box = {"窗": "red"}', 't.color("blue")'],
    core: 'key = "门"',
    draws: '一个蓝色正方形',
    how: '键改成窗之后，正方形变成红色',
    tune: choice('key', '改成去查窗', '门', '窗', [['门', '门'], ['窗', '窗']], '只有键正好是「窗」，才用字典里的红色。'),
    quiz: ['现在的键是「门」，字典里有它吗？', '没有，所以走 else 涂蓝', '有，会涂红', '会报错然后停住', '对不上就用准备好的默认色。'],
  },
  {
    title: '把字典的括号打准确',
    goal: '打字课：把花括号和取值的方括号再打一遍',
    tags: ['dict'],
    typing: 'keywords',
    lines: ['ink = "red"', 'box = {"笔": ink}', 't.color(box["笔"])', 't.forward(40)', 't.right(90)', 't.forward(40)', 't.done()'],
    keys: ['box = {"笔": ink}', 'box["笔"]', 'ink = "red"', 't.color(box["笔"])'],
    core: 'ink = "red"',
    draws: '一个红色直角',
    how: '直角变成蓝色',
    tune: inkOf('red', 'blue', '把笔的颜色换成蓝'),
    quiz: ['这一节主要在练什么？', '把字典的花括号和方括号打准确', '新学一种循环', '基准键位', '编程关键词只打这一单元刚用过的括号。'],
  },
  {
    title: '字典里的颜色传给函数',
    goal: '先从字典取出颜色，再调用正方形',
    tags: ['dict', 'function', 'color'],
    lines: ['def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'ink = "purple"', 'box = {"边": ink}', 't.color(box["边"])', 'square(32)', 't.done()'],
    keys: ['box = {"边": ink}', 't.color(box["边"])', 'square(32)', 'ink = "purple"'],
    core: 'ink = "purple"',
    draws: '一个紫色正方形',
    how: '正方形变成绿色',
    tune: inkOf('purple', 'green', '把边的颜色换成绿'),
    quiz: ['函数知道字典的事吗？', '不知道，颜色在调用前就涂好了', '函数会自己查字典', 'def 会读取花括号', '这一关是外面先查好，再让函数去画。'],
  },
  {
    title: '边长也可以放进字典',
    goal: '字典里不只能放颜色，也能放边长',
    tags: ['dict', 'function'],
    lines: ['long = 30', 'box = {"边": long}', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(box["边"])', 't.done()'],
    keys: ['box = {"边": long}', 'square(box["边"])', 'long = 30', 'def square(side):'],
    core: 'long = 30',
    draws: '一个正方形',
    how: '正方形变大',
    tune: num('long', '把边长改大', 30, 70, 10, 90, 20, box('long'), '字典里的数变大，传给函数的边长就变大。'),
    quiz: ['box["边"] 传进函数的是什么？', '一个数，用来当边长', '一段颜色名', '键的名字', '值是数字时，就可以拿去 forward。'],
  },
  {
    title: '先查字典再画',
    goal: '先查出两个边长，再分两次去画',
    tags: ['dict', 'function'],
    lines: ['door = 24', 'box = {"门": door, "窗": 40}', 'def door_shape(side):', '    t.forward(side)', '    t.right(90)', '    t.forward(side)', 'door_shape(box["门"])', 't.right(90)', 'door_shape(box["窗"])'],
    keys: ['door_shape(box["门"])', 'door_shape(box["窗"])', 'box = {"门": door, "窗": 40}', 'door = 24'],
    core: 'door = 24',
    draws: '门较短、窗较长的两截折线',
    how: '门那一截变长',
    tune: num('door', '把门改长', 24, 44, 24, 64, 20, box('door'), '只改「门」这个键配的数。'),
    quiz: ['两次调用的边长一样吗？', '不一样，查到的两个值不同', '一样', '第二次没有边长', '先查再画，每次用自己查到的那个数。'],
  },
  {
    title: '多写一个键',
    goal: '字典里再多写一个键，第二条边用它',
    tags: ['dict', 'color'],
    lines: ['extra = "green"', 'box = {"门": "red", "窗": extra}', 't.color(box["门"])', 't.forward(36)', 't.right(90)', 't.color(box["窗"])', 't.forward(36)', 't.done()'],
    keys: ['box = {"门": "red", "窗": extra}', 'extra = "green"', 'box["窗"]', 'box["门"]'],
    core: 'extra = "green"',
    draws: '先红后绿的一个直角',
    how: '第二笔从绿色变成紫色',
    tune: choice('extra', '把多出来的键换成紫色', 'green', 'purple', [['green', '绿色'], ['purple', '紫色']], '「门」还是红色。'),
    quiz: ['多写一个键要加什么？', '逗号，再写一对键和值', '再写一个 def', '把花括号换成方括号', '字典里的每一对都用逗号隔开。'],
  },
  {
    title: '列表里装键，字典里装颜色',
    goal: '列表负责顺序，字典负责每个键的颜色',
    tags: ['dict', 'list', 'color'],
    lines: ['ink = "red"', 'box = {"甲": ink, "乙": "blue", "丙": "green"}', 'keys = ["甲", "乙", "丙"]', 'for key in keys:', '    t.color(box[key])', '    t.forward(40)', '    t.right(120)', 't.done()'],
    keys: ['keys = ["甲", "乙", "丙"]', 'box[key]', 'for key in keys:', 'ink = "red"'],
    core: 'ink = "red"',
    draws: '红、蓝、绿三条边的三角形',
    how: '第一条边从红色换成橙色',
    tune: inkOf('red', 'orange', '把甲换成橙色'),
    quiz: ['列表和字典怎么分工？', '列表记下先画谁，字典记下那种颜色', '两个做一样的事', '列表里直接放线条', '走到一个键，就去字典里查它的颜色。'],
  },
  {
    title: '走到一个键就涂一种色',
    goal: '按键的顺序轮流涂色，边长单独放在盒子里',
    tags: ['dict', 'for_loop', 'color'],
    lines: ['step = 28', 'box = {"甲": "orange", "乙": "purple"}', 'keys = ["甲", "乙", "甲", "乙"]', 'for key in keys:', '    t.color(box[key])', '    t.forward(step)', '    t.right(90)'],
    keys: ['keys = ["甲", "乙", "甲", "乙"]', 'box[key]', 'step = 28', 'for key in keys:'],
    core: 'step = 28',
    draws: '橙紫相间的正方形',
    how: '四条边一起变长',
    tune: num('step', '把边长改大', 28, 48, 28, 68, 20, box('step'), '颜色的顺序不动，只把每一笔改长。'),
    quiz: ['「甲」在列表里出现几次？', '两次', '一次', '四次', '走到一次就涂一次，出现两次就涂两次。'],
  },
  {
    title: '函数里查字典',
    goal: '函数里面按键查颜色，再把正方形画出来',
    tags: ['dict', 'function', 'color'],
    lines: ['def paint(side):', '    t.color(box[key])', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'key = "窗"', 'box = {"窗": "blue", "门": "red"}', 'paint(36)', 't.done()'],
    keys: ['t.color(box[key])', 'key = "窗"', 'box = {"窗": "blue", "门": "red"}', 'paint(36)'],
    core: 'key = "窗"',
    draws: '一个蓝色正方形',
    how: '键改成门之后，正方形变成红色',
    tune: choice('key', '改成去查门', '窗', '门', [['窗', '窗'], ['门', '门']], '函数里查的是这个键。'),
    quiz: ['查字典的那一行写在哪里？', '写在函数里面', '只能写在函数外面', '写在 print 里', '函数也可以去读外面已经准备好的字典。'],
  },
  {
    title: '字典之前再打基准键',
    goal: '打字课：练习基准键位，手指回原位',
    tags: ['dict'],
    typing: 'baseline_keys',
    lines: ['ink = "red"', 'box = {"点": ink}', 't.color(box["点"])', 't.forward(30)', 't.right(120)', 't.forward(30)', 't.right(120)', 't.forward(30)', 't.done()'],
    keys: ['asdf', 'jkl;', 'ffjj', 'fjfj'],
    core: 'ink = "red"',
    draws: '一个红色三角形',
    how: '三角形变成蓝色',
    tune: inkOf('red', 'blue', '把这个点换成蓝色'),
    quiz: ['这一节在练哪一档打字？', '基准键位', '编程关键词', '一种新的键', '打字只有基准键位和编程关键词两档。'],
  },
  {
    title: '把门改成紫色',
    goal: '门外层用字典里的颜色，窗仍是橙色',
    tags: ['dict', 'function', 'color'],
    lines: ['door = "green"', 'box = {"门": door, "窗": "orange"}', 't.color(box["门"])', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 'square(44)', 't.color(box["窗"])', 'square(20)'],
    keys: ['door = "green"', 'box["门"]', 'box["窗"]', 'square(44)'],
    core: 'door = "green"',
    draws: '外面绿色、里面橙色的两个正方形',
    how: '外面的正方形变成紫色',
    tune: choice('door', '把门换成紫色', 'green', 'purple', [['green', '绿色'], ['purple', '紫色']], '里面的橙色还是「窗」那个键。'),
    quiz: ['里面的小正方形用哪个键？', '窗', '门', '两个都用', '第二次 color 查的是「窗」。'],
  },
  {
    title: '两个方块两种键',
    goal: '「大」和「小」两个键，各管一个正方形',
    tags: ['dict', 'function', 'color'],
    lines: ['b = "blue"', 'box = {"大": "red", "小": b}', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 't.color(box["大"])', 'square(40)', 't.color(box["小"])', 'square(22)'],
    keys: ['box = {"大": "red", "小": b}', 'box["大"]', 'box["小"]', 'b = "blue"'],
    core: 'b = "blue"',
    draws: '外面红色、里面蓝色的两个正方形',
    how: '里面的正方形变成绿色',
    tune: choice('b', '把小的换成绿色', 'blue', 'green', [['blue', '蓝色'], ['green', '绿色']], '「大」还是红色。'),
    quiz: ['小正方形的颜色存在哪个键？', '小', '大', 'square', '查「小」才取到里面的颜色。'],
  },
  {
    title: '查不到就涂蓝色',
    goal: '键不在字典里时，用蓝色作为默认',
    tags: ['dict', 'if', 'color'],
    lines: ['key = "路"', 'box = {"窗": "red"}', 'if key == "窗":', '    t.color(box["窗"])', 'else:', '    t.color("blue")', 't.forward(50)', 't.right(90)', 't.forward(50)', 't.done()'],
    keys: ['key = "路"', 'if key == "窗":', 't.color("blue")', 'box = {"窗": "red"}'],
    core: 'key = "路"',
    draws: '一个蓝色直角',
    how: '键改成窗之后，直角变成红色',
    tune: choice('key', '改成去查窗', '路', '窗', [['路', '路'], ['窗', '窗']], '「路」对不上，就用蓝色。'),
    quiz: ['「路」这个键现在能查到吗？', '不能，所以涂默认的蓝色', '能，会涂红', '会把字典清空', '对不上准备好的键，就走 else。'],
  },
  {
    title: '我的小花园',
    goal: '用字典选出叶子和花朵的颜色，再画出两层方块',
    tags: ['dict', 'function', 'color'],
    lines: ['bloom = "red"', 'box = {"叶": "green", "花": bloom}', 'def square(side):', '    for i in range(4):', '        t.forward(side)', '        t.right(90)', 't.color(box["叶"])', 'square(20)', 't.color(box["花"])', 'square(36)'],
    keys: ['box = {"叶": "green", "花": bloom}', 'box["叶"]', 'box["花"]', 'bloom = "red"'],
    core: 'bloom = "red"',
    draws: '绿叶方块套在红色花朵方块里面',
    how: '花朵从红色变成紫色',
    tune: choice('bloom', '把花朵换成紫色', 'red', 'purple', [['red', '红色'], ['purple', '紫色']], '叶子还是绿色。'),
    quiz: ['叶子和花朵的颜色存在哪里？', '同一本字典的两个键', '写在函数名字里', '海龟自己配', '查不同的键，就得到不同的颜色。'],
    badge: { id: 'my_garden', title: '我的小花园' },
  },
]

const UNITS = [
  { id: 'L2_U02', title: 'Level 2 · 单元 2', sort: 2, tags: ['function', 'if', 'color'], start: 141, rows: UNIT2 },
  { id: 'L2_U03', title: 'Level 2 · 单元 3', sort: 3, tags: ['list', 'function', 'for_loop'], start: 161, rows: UNIT3 },
  { id: 'L2_U04', title: 'Level 2 · 单元 4', sort: 4, tags: ['function', 'for_loop', 'nested'], start: 181, rows: UNIT4 },
  { id: 'L2_U05', title: 'Level 2 · 单元 5', sort: 5, tags: ['string', 'print', 'function'], start: 201, rows: UNIT5 },
  { id: 'L2_U06', title: 'Level 2 · 单元 6', sort: 6, tags: ['dict', 'color', 'function'], start: 221, rows: UNIT6 },
]

const problems = []
const seenCode = new Map()
const drawItems = []
const packs = []

for (const unit of UNITS) {
  if (unit.rows.length !== 20) problems.push(`${unit.id} 应有 20 关，实际 ${unit.rows.length}`)
  const lessons = unit.rows.map((row, index) => {
    const order = unit.start + index
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
    if (kind === 'project' && !row.badge) problems.push(`L${order} 项目关没有徽章`)
    if (kind !== 'project' && row.badge) problems.push(`L${order} 不是项目关却写了徽章`)
    const code = lines.join('\n')
    if (seenCode.has(code)) problems.push(`L${order} 和 L${seenCode.get(code)} 正文完全一样`)
    else seenCode.set(code, order)
    if (BANNED.test(code) || /[（）]/.test(code)) problems.push(`L${order} 用了这一级不该出现的写法`)
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
    problems.push(`${unit.id} 课型配比不是 12/5/2/1：${JSON.stringify(stat)}`)
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
    drawItems.push({ order: lesson.order, code: lesson.code, variant: lesson.variant })
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
      parent_brief: `孩子会画出${lesson.draws}。这一处改完，${lesson.how}。`,
      teacher_guide: `先看${lesson.draws}，再只改「${lesson.tune.param.label}」，确认${lesson.how}。`,
    }
  })

  packs.push({
    file: `${unit.id}.json`,
    stat,
    body: {
      stage_level: 2,
      unit: { unit_id: unit.id, title: unit.title, sort_order: unit.sort },
      unit_tags: unit.tags,
      levels,
    },
  })
}

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}

const draw = spawnSync('python', [join(root, 'scripts', 'level1_draw_check.py')], {
  input: JSON.stringify(drawItems),
  encoding: 'utf8',
})
if (draw.status !== 0) {
  console.error(draw.stdout)
  console.error(draw.stderr)
  process.exit(draw.status || 1)
}

mkdirSync(outDir, { recursive: true })
for (const pack of packs) {
  writeFileSync(join(outDir, pack.file), `${JSON.stringify(pack.body, null, 2)}\n`)
  console.log(`${pack.file} ${pack.stat.new}/${pack.stat.practice}/${pack.stat.typing}/${pack.stat.project}`)
}
console.log(draw.stdout.trim())
console.log(`wrote ${drawItems.length} levels`)
