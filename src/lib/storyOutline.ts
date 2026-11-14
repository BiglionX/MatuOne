import type { Level } from '@/types'
import { getLineNotes } from '@/lib/lineNotes'

export type StoryScene = 'goal' | 'print' | 'forward' | 'turn' | 'loop' | 'branch' | 'color' | 'variable' | 'done' | 'ready'

/** 绘本插图对应的场景名。大纲里用这几个名字，不导出图片文件。 */
export const STORY_SCENE_NAME: Record<StoryScene, string> = {
  goal: '目标',
  print: '打印',
  forward: '前进',
  turn: '转弯',
  loop: '循环',
  branch: '判断',
  color: '颜色',
  variable: '变量',
  done: '完成',
  ready: '准备开始',
}

export interface StoryPage {
  kind: StoryScene
  kicker: string
  title: string
  text: string
  code?: string
  speak: string
}

function kindOf(line: string): StoryScene {
  if (line.trimStart().startsWith('print')) return 'print'
  if (/color/.test(line)) return 'color'
  if (/\b(for|while)\b|range\(/.test(line)) return 'loop'
  if (/^\s*(if|else)\b/.test(line)) return 'branch'
  if (/forward|backward/.test(line)) return 'forward'
  if (/right|left/.test(line)) return 'turn'
  if (/done/.test(line)) return 'done'
  if (/=/.test(line)) return 'variable'
  return 'goal'
}

/** 和进关小绘本同一套分页：第一页是学习目标，接着最多四行课文说明，最后一页收束。 */
export function buildStoryPages(level: Level): StoryPage[] {
  const notes = getLineNotes(level)
  const picked: { line: string; note: string }[] = []
  level.teach_code_lines.forEach((line, i) => {
    if (picked.length >= 4) return
    if (picked.some((page) => page.line === line)) return
    picked.push({ line, note: notes[i] ?? '' })
  })

  const list: StoryPage[] = [
    {
      kind: 'goal',
      kicker: '这一关要做什么',
      title: level.title,
      text: level.goal,
      speak: `第${level.order}关，${level.title}。${level.goal}`,
    },
  ]

  for (const item of picked) {
    list.push({
      kind: kindOf(item.line),
      kicker: '这一行在做什么',
      title: item.note || '看看这一行',
      text: item.note || '',
      code: item.line,
      speak: item.note || item.line,
    })
  }

  list.push({
    kind: 'ready',
    kicker: '看完了',
    title: '接下来，先猜一猜',
    text:
      level.level_type === 'fill_blank'
        ? '猜完再运行，然后把空出来的词填上。'
        : level.unfolded_lines?.length
          ? '猜完再运行，然后看重复的代码怎么收成循环。'
          : '猜完再运行，然后一行一行把代码抄出来。',
    speak:
      level.level_type === 'fill_blank'
        ? '看完了。接下来先猜一猜结果，再把空出来的词填上。'
        : level.unfolded_lines?.length
          ? '看完了。接下来先猜一猜结果，再看重复的代码怎么收成循环。'
          : '看完了。接下来先猜一猜结果，再一行一行把代码抄出来。',
  })

  return list
}

/** 给教研离线审故事线和朗读词。场景名对应内联插图，不含图片。 */
export function storyOutlineMarkdown(level: Level, catalogId: string): string {
  const pages = buildStoryPages(level)
  const lines = [
    `# ${catalogId} ${level.title}`,
    '',
    '这份大纲按进关时的电子绘本逐页列出。插图由程序按场景名绘制，没有单独的图片文件。',
    '',
  ]
  pages.forEach((page, index) => {
    lines.push(`## 第 ${index + 1} 页 · ${page.kicker}`)
    lines.push('')
    lines.push(`- 场景：${STORY_SCENE_NAME[page.kind]}`)
    lines.push(`- 标题：${page.title}`)
    if (page.text) lines.push(`- 画面文字：${page.text}`)
    lines.push(`- 朗读：${page.speak}`)
    if (page.code) lines.push(`- 代码：\`${page.code}\``)
    lines.push('')
  })
  return lines.join('\n')
}
