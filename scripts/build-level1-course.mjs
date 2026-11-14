/**
 * 把 Level 1 第 1–120 关写成课程包，并做机检。
 * 用法：node scripts/build-level1-course.mjs
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KINDS, UNITS } from './level1-lessons.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'content', 'courses', 'level1')

const COLOR = { red: '红色', blue: '蓝色', green: '绿色', orange: '橙色', purple: '紫色' }
const BOX = { side: '边长', turn: '转弯的度数', ink: '颜色', n: '要涂色的那一圈', gap: '空开的步数', long: '长边', short: '短边', step: '每次加长多少', a: '前半段的颜色', b: '后半段的颜色', pole: '旗杆有多高' }

const ERRORS = [
  { pattern: 'colon', match: "expected ':'", friendlyMessage: "这行的最后是不是漏了一个英文冒号 ':'？" },
  { pattern: 'name', match: 'has no attribute', friendlyMessage: '海龟不认识这个动作，forward 或 right 是不是拼错了？' },
  { pattern: 'paren', match: 'was never closed', friendlyMessage: '这里的括号没有闭合哦' },
  { pattern: 'cjk', match: "invalid character '（'", friendlyMessage: '注意，要切到英文键盘，打半角括号哦。' },
  { pattern: 'indent', match: 'expected an indented block', friendlyMessage: '冒号下面要往右空四格，循环或判断里的代码才算在里面。' },
]
const COMPARE = { pattern: 'compare', match: "Maybe you meant '=='", friendlyMessage: '判断要写两个等号 ==，一个等号是把数装进盒子。' }

const BANNED = /\b(circle|fillcolor|goto|speed|begin_fill|end_fill|hideturtle|showturtle|pencolor|import|while|def|class|elif|print|input|lambda|fd|bk|rt|lt|pu|pd)\s*\(/
const BANNED_WORD = /\b(import|while|def|class|elif|print|input|lambda)\b/

function noteFor(line) {
  const text = line.trim()
  if (text.startsWith('for i ')) return '外面这一圈要重复做，做完再来一圈'
  if (text.startsWith('for j ')) return '里面再重复，把一小块画完'
  if (text === 'if i == 0:') return '电脑从 0 开始数，0 就是第一笔'
  if (text === 'if j == 0:') return '每一小块的第一条边，走这里'
  if (text === 'if i == n:') return '这一圈的号如果和 n 一样，就做下面这行'
  if (text === 'else:') return '对不上的时候，走这边'
  if (/^[A-Za-z]+ = [A-Za-z]+ \+ /.test(text)) return '把这个数再加上一截，下一圈就更长'
  const assigned = text.match(/^([A-Za-z]+) = (.+)$/)
  if (assigned) {
    const what = BOX[assigned[1]] || assigned[1]
    const raw = assigned[2].replaceAll('"', '')
    return COLOR[raw] ? `先记住${what}是${COLOR[raw]}` : `先记住${what}是 ${raw}`
  }
  const call = text.match(/^t\.([A-Za-z]+)\((.*)\)$/)
  if (!call) throw new Error(`写不出这行的说明：${line}`)
  const [, name, argRaw] = call
  const arg = argRaw.replaceAll('"', '')
  const step = (unit) => (/^\d+$/.test(arg) ? `${arg} ${unit}` : `盒子 ${arg} 里的数`)
  if (name === 'forward') return `小海龟向前走 ${step('步')}`
  if (name === 'backward') return `小海龟退回 ${step('步')}`
  if (name === 'right') return `向右转 ${step('度')}`
  if (name === 'left') return `向左转 ${step('度')}`
  if (name === 'color') return COLOR[arg] ? `把画笔换成${COLOR[arg]}` : '把画笔换成盒子里的那种颜色'
  if (name === 'pensize') return `把线改成 ${step('')}那么粗`.replace('  ', ' ')
  if (name === 'penup') return '把笔抬起来，接着走先不画线'
  if (name === 'pendown') return '把笔放下，接着走就会画出线'
  if (name === 'done') return '告诉小海龟，这一幅画完了'
  throw new Error(`不认识的动作：${line}`)
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

function kindLabel(kind) {
  if (kind === 'new') return '新知识'
  if (kind === 'practice') return '练习'
  if (kind === 'typing') return '打字'
  return '项目'
}

const lessons = []
const problems = []

UNITS.forEach((pack, unitIndex) => {
  pack.lessons.forEach((row, index) => {
    const order = unitIndex * 20 + index + 1
    const kind = KINDS[index]
    const lines = row.lines
    const nonEmpty = lines.filter((line) => line.trim())
    if (nonEmpty.length !== lines.length) problems.push(`L${order} 有空行`)
    if (nonEmpty.length > 10) problems.push(`L${order} 有 ${nonEmpty.length} 行`)
    if (nonEmpty.length < 1) problems.push(`L${order} 没有正文`)
    if (row.core.length > 15) problems.push(`L${order} 核心行 ${row.core.length} 字：${row.core}`)
    if (!lines.some((line) => line.trim() === row.core || line.includes(row.core))) problems.push(`L${order} 核心行不在正文里`)
    if (row.keys.length < 3 || row.keys.length > 5) problems.push(`L${order} 关键词数量 ${row.keys.length}`)
    if (kind === 'typing' && !row.typing) problems.push(`L${order} 打字课没有档位`)
    if (kind !== 'typing' && row.typing) problems.push(`L${order} 不是打字课却写了档位`)
    if (row.typing === 'keywords') {
      const banned = row.keys.some((key) => key === 'asdf' || key.includes('jkl'))
      if (banned) problems.push(`L${order} 编程关键词里混进了基准键`)
    }
    if (row.typing === 'baseline_keys') {
      const ok = row.keys.every((key) => ['asdf', 'jkl;', 'ffjj', 'fjfj', 'asdf jkl;'].includes(key))
      if (!ok) problems.push(`L${order} 基准键位超出两档约定`)
    }
    const code = lines.join('\n')
    if (BANNED.test(code) || BANNED_WORD.test(code)) problems.push(`L${order} 用了禁止的写法`)
    if (/[（）]/.test(code)) problems.push(`L${order} 正文里有全角括号`)
    for (const line of lines) noteFor(line)
    const param = row.tune.param
    const alt = row.tune.alt
    if (param.type === 'number') {
      const step = param.step
      if ((param.default - param.min) % step !== 0 || (alt - param.min) % step !== 0) {
        problems.push(`L${order} 参数 ${param.default}/${alt} 不在滑杆刻度上`)
      }
      if (alt < param.min || alt > param.max || param.default < param.min || param.default > param.max) {
        problems.push(`L${order} 参数超出范围`)
      }
    } else if (!param.options.some((option) => option.value === String(alt) && option.value !== String(param.default))) {
      problems.push(`L${order} 对比值不在选项里`)
    }
    const variant = applyParam(code, param, alt)
    if (variant === code) problems.push(`L${order} 改参数后代码没变`)
    const drill = order === 1 ? row.core : lessons[order - 2].core
    if (drill.length > 20) problems.push(`L${order} drill 超过 20：${drill}`)
    lessons.push({
      ...row,
      order,
      kind,
      unitId: pack.id,
      code,
      variant,
      drill,
      notes: lines.map(noteFor),
    })
  })
})

let streak = 0
for (const lesson of lessons) {
  if (lesson.kind === 'new') {
    streak += 1
    if (streak >= 5) problems.push(`第 ${lesson.order} 关起连续新知识达到 ${streak}`)
  } else streak = 0
}
if (lessons.length !== 120) problems.push(`关数 ${lessons.length}`)

const counts = { new: 0, practice: 0, typing: 0, project: 0 }
const byUnit = UNITS.map((pack) => {
  const mine = lessons.filter((lesson) => lesson.unitId === pack.id)
  const stat = { new: 0, practice: 0, typing: 0, project: 0 }
  for (const lesson of mine) {
    stat[lesson.kind] += 1
    counts[lesson.kind] += 1
  }
  return { id: pack.id, aim: pack.aim, stat, typing: mine.filter((lesson) => lesson.kind === 'typing').map((lesson) => lesson.typing) }
})

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

function specialBonus(lesson) {
  if (lesson.order === 2) {
    return {
      type: 'reverse_draw',
      instruction: '把海龟掉头，往反方向画一条一样长的线。',
      target_value: '80',
      expected_output: '反方向又有一条一样长的线',
      bonus_reward: '皇冠',
    }
  }
  if (lesson.order === 10) {
    return {
      type: 'add_color',
      instruction: '给正方形的边框加上红色。',
      target_value: 'red',
      expected_output: '正方形的边变成红色',
      bonus_reward: '皇冠',
    }
  }
  if (lesson.order === 23) {
    return {
      type: 'add_color',
      instruction: '给六边形的边框加上蓝色。',
      target_value: 'blue',
      expected_output: '六边形的边变成蓝色',
      bonus_reward: '皇冠',
    }
  }
  if (lesson.order === 61) {
    return {
      type: 'code_fill',
      instruction: '长边的步数空着，填上原来的数。',
      prompt_line: 'long = ____',
      target_value: '90',
      expected_output: '长边还是 90',
      bonus_reward: '皇冠',
    }
  }
  if (lesson.order === 101) {
    return {
      type: 'code_fill',
      instruction: '台阶的步数空着，填上原来的数。',
      prompt_line: 'side = ____',
      target_value: '20',
      expected_output: '台阶的步数是 20',
      bonus_reward: '皇冠',
    }
  }
  return null
}

function levelJson(lesson) {
  const mappings = lesson.code.includes('if ') ? [...ERRORS, COMPARE] : ERRORS
  const bonus = specialBonus(lesson) ?? (lesson.typing
    ? {
        type: 'typing',
        instruction: lesson.typing === 'baseline_keys' ? '还有力气的话，把基准键再打一遍。' : '还有力气的话，把这节的词再打一遍。',
        expected_output: lesson.typing === 'baseline_keys' ? '基准键位' : '编程关键词',
        bonus_reward: '皇冠',
      }
    : {
        type: 'param_edit',
        instruction: `把「${lesson.tune.param.label}」改一下，看看${lesson.how}。`,
        target_param_name: lesson.tune.param.name,
        target_value: String(lesson.tune.alt),
        expected_output: lesson.how,
        bonus_reward: '皇冠',
      })
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
    drill_chunk: lesson.drill,
    challenge_params: [lesson.tune.param],
    error_mappings: mappings,
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
}

mkdirSync(outDir, { recursive: true })
for (const pack of UNITS) {
  const body = {
    stage_level: 1,
    unit: { unit_id: pack.id, title: pack.title, sort_order: pack.sort },
    unit_tags: pack.tags,
    levels: lessons.filter((lesson) => lesson.unitId === pack.id).map(levelJson),
  }
  writeFileSync(join(outDir, `${pack.id}.json`), `${JSON.stringify(body, null, 2)}\n`)
}

const catalogPath = join(root, 'src', 'data', 'generated', 'curriculum.json')
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))
for (const lesson of lessons) {
  const row = catalog.levels[lesson.order - 1]
  if (row.order !== lesson.order) throw new Error(`目录序号错位 ${lesson.order}`)
  row.title = lesson.title
  row.goal = lesson.goal
  row.levelType = lesson.kind
  row.knowledgeTags = lesson.tags
  row.milestoneBadge = lesson.badge?.id ?? null
  row.placeholder = false
  row.is_placeholder = false
  if (lesson.badge) catalog.badges[lesson.badge.id] = lesson.badge.title
}
for (const pack of UNITS) {
  const row = catalog.units.find((item) => item.unitId === pack.id)
  row.knowledgeTags = pack.tags
}
if (catalog.levels[120].order !== 121 || catalog.levels[120].is_placeholder !== true) {
  throw new Error('第 121 关骨架被改动了')
}
writeFileSync(catalogPath, `${JSON.stringify(catalog)}\n`)

const drillLines = lessons.map((lesson) => `  ${lesson.order}: ${JSON.stringify(lesson.drill)},`).join('\n')
writeFileSync(
  join(root, 'supabase', 'functions', '_shared', 'level1Drills.ts'),
  `/** Level 1 第 1–120 关的复习组块。由 scripts/build-level1-course.mjs 生成，不要手改。 */\nexport const LEVEL1_DRILLS: Record<number, string> = {\n${drillLines}\n}\n`,
)

const rows = lessons
  .map((lesson) => `| ${lesson.order} | ${lesson.title} | ${kindLabel(lesson.kind)}${lesson.typing === 'baseline_keys' ? '·基准键位' : lesson.typing === 'keywords' ? '·编程关键词' : ''} | ${lesson.draws} | \`${lesson.core}\` | ${lesson.tune.param.label} | ${lesson.how} |`)
  .join('\n')
const unitSummary = byUnit
  .map((item, index) => `- 单元 ${index + 1}：新知识 ${item.stat.new}，练习 ${item.stat.practice}，打字 ${item.stat.typing}，项目 ${item.stat.project}。打字档位：${item.typing.join('、')}。`)
  .join('\n')

const overview = `# Level 1 前 120 关教研总览

给皓。这是可上课的课文，不是提纲。课程包在 \`content/courses/level1/\`，一个单元一个文件，格式和后台导入器一致。第 121 关往后的骨架没有改。

计行：按 \`teach_code_lines\` 里的非空字符串计。这 120 关没有空行，所以条数就是行数。导入器仍在超过 15 行时给警告（产品 1.0 的上限）。本批机检按 10 行判失败。

颜色只用画布认识的 red、blue、green、orange、purple。画笔变量名是 \`t\`，说明里叫小海龟。\`t\` 由运行器准备好，课文里不再写创建海龟。

## 六个单元

1. **基础绘图（1–20）** ${UNITS[0].aim}
2. **边长和转角（21–40）** ${UNITS[1].aim}
3. **判断变色（41–60）** ${UNITS[2].aim}
4. **混着复习（61–80）** ${UNITS[3].aim}
5. **两层循环（81–100）** ${UNITS[4].aim}
6. **小作品（101–120）** ${UNITS[5].aim}

节奏是每 3 节新知识接 1 节练习或打字，单元最后三节练习再加一节作品。没有连续 5 节新知识。打字只有两档：基准键位、编程关键词。编程关键词只出本单元刚学过的词。

## 课型数量

一共新知识 ${counts.new}，练习 ${counts.practice}，打字 ${counts.typing}，项目 ${counts.project}。

${unitSummary}

## 每关一行

| 关 | 标题 | 课型 | 画什么 | 核心代码 | C 回合改什么 | 画面怎么变 |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

## 附录：本机实跑的 Traceback 后缀

运行环境：本机 Python 3.14.4，直接 exec 课程同一份 \`src/lib/pyodide/mini_turtle.py\`。产品里的 Pyodide 也是 3.14。后缀是 Traceback 的最后一行，写进 \`error_mappings.match\` 的是其中稳定的那一段。

| 试错 | 后缀 |
| --- | --- |
| 漏写冒号 \`for i in range(4)\` | \`SyntaxError: expected ':'\` |
| 拼错 forward：\`t.forwrd(80)\` | \`AttributeError: 'Turtle' object has no attribute 'forwrd'. Did you mean: 'forward'?\` |
| 少写右括号 \`t.forward(80\` | \`SyntaxError: '(' was never closed\` |
| 全角括号 \`t.forward（100）\` | \`SyntaxError: invalid character '（' (U+FF08)\` |
| for 下面没缩进 | \`IndentationError: expected an indented block after 'for' statement on line 1\` |
| if 里写成一个等号 | \`SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?\` |

全角括号给孩子看的句子固定是：「注意，要切到英文键盘，打半角括号哦。」

21–120 关复用上面这些实跑后缀，不另写英文报错。有 \`if\` 的关额外带上等号那一条。

## 机检

- 关数 120，第 121 关仍是占位骨架。
- 禁止 API：0。
- 超过 10 行：0。
- drill 超过 20 个字符：0。本批 drill 都是上一关的核心行，第 1 关用本关最短核心行，全部不超过 15 个字符。
- 连续 5 节新知识：0。
- 缺字段：0。每关都有正文、逐行说明、猜一猜、挑战参数、报错映射、drill、副本。
- 画布：${draw.stdout.trim()}。每一关正文能画出线，C 回合那个参数改完后线段坐标、颜色或粗细至少有一项不同。
`

writeFileSync(join(root, 'docs', 'level1-curriculum.md'), overview)
console.log(draw.stdout.trim())
console.log(`新知识 ${counts.new} 练习 ${counts.practice} 打字 ${counts.typing} 项目 ${counts.project}`)
console.log(`wrote ${outDir}`)
