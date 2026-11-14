import type { Level } from '../types'
import {
  curriculumLevelById,
  curriculumLevelByOrder,
  isPlaceholderLevel,
  type CatalogLevel,
} from '../data/fullCurriculum'
import { getLevelById } from '../mock/levels'
import { bonusForOrder } from '../data/bonusChallenges'
import { drillForOrder } from '../data/drillChunks'

function orderOf(levelId: string): number | null {
  const matched = /^L(\d+)$/i.exec(levelId.trim())
  if (!matched) return null
  const order = Number(matched[1])
  return Number.isInteger(order) && order >= 1 ? order : null
}

function metaOf(levelId: string): CatalogLevel | undefined {
  return curriculumLevelById(levelId) ?? curriculumLevelByOrder(orderOf(levelId) ?? 0)
}

/** 把目录里的一节收成课时页能跑的课文。前 12 节用现成课文，第 16–20 节用补上的课文。 */
export function buildPlayableLevel(levelId: string): Level | undefined {
  const meta = metaOf(levelId)
  if (!meta) return undefined
  const level = playableBody(meta)
  if (!level) return undefined
  const bonus = bonusForOrder(meta.order)
  const drill = drillForOrder(meta.order)
  return {
    ...level,
    ...(bonus ? { bonus_challenge: bonus } : {}),
    ...(drill ? { drill_chunk: drill } : {}),
    is_placeholder: isPlaceholderLevel(meta),
  }
}

function playableBody(meta: CatalogLevel): Level | undefined {
  const authored = meta.legacyLevelId ? getLevelById(meta.legacyLevelId) : undefined
  if (authored) {
    return { ...authored, level_id: meta.levelId, order: meta.order, title: meta.title, goal: meta.goal }
  }
  if (meta.order === 13) return printLesson(meta, '你好')
  if (meta.order === 14) return squareLesson(meta)
  if (meta.order === 15) return loopLesson(meta)
  if (meta.order === 16) return greetingSquare(meta)
  if (meta.order === 17) return greetingVariable(meta)
  if (meta.order === 18) return changeGreeting(meta)
  if (meta.order === 19) return typingReview(meta)
  if (meta.order === 20) return projectGreeting(meta)
  return placeholderLevel(meta)
}

function placeholderLevel(meta: CatalogLevel): Level {
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: 'n = 1\nprint(n)',
    expected_output: '1',
    preview_kind: 'text',
    teach_code_lines: ['n = 1', 'print(n)'],
    keywords: ['print', 'print()', 'n = 1'],
    challenge_params: [
      {
        name: 'n',
        label: '把数字改一改',
        type: 'number',
        min: 1,
        max: 9,
        step: 1,
        default: 1,
        apply: { kind: 'assign', variable: 'n' },
        hint: '改大一点，打印出来的数字会跟着变。',
      },
    ],
    error_mappings: [],
    quiz: {
      question: 'print(n) 会把什么显示出来？',
      options: ['变量 n 里的数字', '一只海龟', '什么都不显示'],
      answerIndex: 0,
      explain: 'print 会把括号里的结果打印到屏幕上。',
    },
    estimated_minutes: 15,
  }
}

function typingReview(meta: CatalogLevel): Level {
  const lines = ['print("你好")', 't.forward(80)', 't.right(90)']
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: lines.join('\n'),
    expected_output: '你好\n一条横线',
    preview_kind: 'turtle',
    teach_code_lines: lines,
    keywords: ['print("你好")', 't.forward(80)', 't.right(90)'],
    challenge_params: [
      {
        name: 'word',
        label: '问候换一句',
        type: 'select',
        default: '你好',
        options: [
          { value: '你好', label: '你好' },
          { value: '加油', label: '加油' },
        ],
        apply: { kind: 'arg', func: 'print', argIndex: 0 },
        hint: '引号里的字会打印出来。',
      },
    ],
    error_mappings: [],
    quiz: {
      question: '这一节主要在练什么？',
      options: ['把学过的词再打准确', '新学一个排序算法', '什么都不用做'],
      answerIndex: 0,
      explain: '打字关是把已经见过的 print、forward、right 再敲一遍。',
    },
    estimated_minutes: 15,
  }
}

function projectGreeting(meta: CatalogLevel): Level {
  const lines = ['print("送给你")', 'for i in range(4):', '    t.forward(80)', '    t.right(90)']
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: lines.join('\n'),
    expected_output: '送给你\n一个正方形',
    preview_kind: 'turtle',
    teach_code_lines: lines,
    keywords: ['print("送给你")', 'for', 'range(4)', 't.forward(80)', 't.right(90)'],
    challenge_params: [
      {
        name: 'side',
        label: '正方形的边长',
        type: 'number',
        min: 40,
        max: 140,
        step: 20,
        default: 80,
        apply: { kind: 'arg', func: 'forward', argIndex: 0 },
        hint: '数字越大，正方形越大。',
      },
    ],
    error_mappings: [],
    quiz: {
      question: '这个作品里，正方形是怎么画出来的？',
      options: ['用 for 把「向前、转弯」重复 4 次', '只写了一句 print', '海龟自己会画'],
      answerIndex: 0,
      explain: 'range(4) 让向前和转弯各做 4 次，围成一个正方形。',
    },
    estimated_minutes: 20,
  }
}

function greetingSquare(meta: CatalogLevel): Level {
  const lines = ['print("你好")', 'for i in range(4):', '    t.forward(80)', '    t.right(90)']
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: lines.join('\n'),
    expected_output: '你好\n一个正方形',
    preview_kind: 'turtle',
    teach_code_lines: lines,
    line_notes: ['先打印一句问候', '把画一条边重复 4 次', '每条边向前走 80', '走完向右转 90 度'],
    keywords: ['print("你好")', 'for', 'range(4)', 't.forward(80)'],
    challenge_params: [
      {
        name: 'word',
        label: '问候换一句',
        type: 'select',
        default: '你好',
        options: [
          { value: '你好', label: '你好' },
          { value: '加油', label: '加油' },
        ],
        apply: { kind: 'arg', func: 'print', argIndex: 0 },
        hint: '引号里的字会先出现在屏幕上。',
      },
    ],
    error_mappings: [],
    quiz: {
      question: '这段代码先做什么，再做什么？',
      options: ['先打印问候，再画正方形', '只画正方形', '只打印一句话'],
      answerIndex: 0,
      explain: 'print 先把问候打出来，for 再把正方形的四条边画完。',
    },
    estimated_minutes: 15,
  }
}

function greetingVariable(meta: CatalogLevel): Level {
  const lines = ['name = "你好"', 'print(name)']
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: lines.join('\n'),
    expected_output: '你好',
    preview_kind: 'text',
    teach_code_lines: lines,
    line_notes: ['把问候装进变量 name', '打印变量里的那句话'],
    keywords: ['name', 'name = "你好"', 'print(name)'],
    challenge_params: [
      {
        name: 'name',
        label: '把问候换一句',
        type: 'select',
        default: '你好',
        options: [
          { value: '你好', label: '你好' },
          { value: '加油', label: '加油' },
          { value: '早上好', label: '早上好' },
        ],
        apply: { kind: 'assign', variable: 'name' },
        hint: '改的是变量里的话，print 会把新的一句打出来。',
      },
    ],
    error_mappings: [],
    quiz: {
      question: 'print(name) 打印出来的是什么？',
      options: ['变量 name 里装的那句话', '变量的名字 name', '一个正方形'],
      answerIndex: 0,
      explain: 'name = "你好" 把这句话装进变量，print(name) 再把它打印出来。',
    },
    estimated_minutes: 15,
  }
}

function changeGreeting(meta: CatalogLevel): Level {
  const lines = ['name = "你好"', 'side = 80', 'print(name)', 'for i in range(4):', '    t.forward(side)', '    t.right(90)']
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: lines.join('\n'),
    expected_output: '你好\n一个正方形',
    preview_kind: 'turtle',
    teach_code_lines: lines,
    line_notes: ['问候装进 name', '边长装进 side', '打印问候', '重复画 4 条边', '边长用 side', '转弯 90 度'],
    keywords: ['name', 'side', 'print(name)', 't.forward(side)'],
    challenge_params: [
      {
        name: 'name',
        label: '问候换一句',
        type: 'select',
        default: '你好',
        options: [
          { value: '你好', label: '你好' },
          { value: '加油', label: '加油' },
        ],
        apply: { kind: 'assign', variable: 'name' },
        hint: '改这一句，屏幕上的问候会跟着变。',
      },
      {
        name: 'side',
        label: '边长改一改',
        type: 'number',
        min: 40,
        max: 140,
        step: 20,
        default: 80,
        apply: { kind: 'assign', variable: 'side' },
        hint: '改这个数字，正方形的四条边一起变长。',
      },
    ],
    error_mappings: [],
    quiz: {
      question: '想让正方形变大，要改哪里？',
      options: ['改 side 里的数字', '改 name 里的问候', '把 range(4) 改成 range(40)'],
      answerIndex: 0,
      explain: 'side 装着边长，forward 用的就是这个数。',
    },
    estimated_minutes: 20,
  }
}

function printLesson(meta: CatalogLevel, word: string): Level {
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: `print("${word}")`,
    expected_output: word,
    preview_kind: 'text',
    teach_code_lines: [`print("${word}")`],
    keywords: ['print', 'print()', 'print("")'],
    challenge_params: [
      {
        name: 'word',
        label: '把这句话换一换',
        type: 'select',
        default: word,
        options: [
          { value: word, label: word },
          { value: 'Hello', label: 'Hello' },
        ],
        apply: { kind: 'arg', func: 'print', argIndex: 0 },
      },
    ],
    error_mappings: [],
    quiz: {
      question: 'print 这一行跑完，屏幕上会出现什么？',
      options: [word, '一个正方形', '什么都没有'],
      answerIndex: 0,
      explain: '引号里的字会原样打印出来。',
    },
    estimated_minutes: 15,
  }
}

function squareLesson(meta: CatalogLevel): Level {
  const lines = ['t.forward(80)', 't.right(90)', 't.forward(80)', 't.right(90)']
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: lines.join('\n'),
    expected_output: '一个正方形的一半',
    preview_kind: 'turtle',
    teach_code_lines: lines,
    keywords: ['t.forward', 't.right', 't.right(90)'],
    challenge_params: [
      {
        name: 'side',
        label: '边长改一改',
        type: 'number',
        min: 40,
        max: 140,
        step: 20,
        default: 80,
        apply: { kind: 'arg', func: 't.forward', argIndex: 0, occurrence: 'all' },
        hint: '两条边会一起变长。',
      },
    ],
    error_mappings: [],
    quiz: {
      question: 't.right(90) 是在做什么？',
      options: ['向右转 90 度', '向前走 90 步', '把颜色改成红色'],
      answerIndex: 0,
      explain: 'right 是转弯，括号里的数字是角度。',
    },
    estimated_minutes: 15,
  }
}

function loopLesson(meta: CatalogLevel): Level {
  const lines = ['for i in range(4):', '    t.forward(80)', '    t.right(90)']
  return {
    level_id: meta.levelId,
    order: meta.order,
    title: meta.title,
    goal: meta.goal,
    level_type: 'normal',
    demo_code: lines.join('\n'),
    expected_output: '一个正方形',
    preview_kind: 'turtle',
    teach_code_lines: lines,
    keywords: ['for', 'range(4)', 't.forward'],
    challenge_params: [
      {
        name: 'sides',
        label: '重复几次',
        type: 'number',
        min: 3,
        max: 8,
        step: 1,
        default: 4,
        apply: { kind: 'arg', func: 'range', argIndex: 0 },
        hint: '改这个数字，边数会跟着变。',
      },
    ],
    error_mappings: [],
    quiz: {
      question: 'range(4) 会让循环走几遍？',
      options: ['4 遍', '3 遍', '40 遍'],
      answerIndex: 0,
      explain: 'range(4) 就是重复 4 次。',
    },
    estimated_minutes: 15,
  }
}
