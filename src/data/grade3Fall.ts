import type { CurriculumLevelKind } from '@/types/curriculum'

/** Level 1 的前三个单元。前 12 节是已经写好的课文。 */
export const GRADE3_FALL_SEMESTER = {
  semesterId: 'L1',
  stageTitle: 'Level 1',
  semesterTitle: 'Level 1',
  heading: 'Level 1',
}

export interface Grade3Unit {
  unitId: string
  semesterId: string
  title: string
  sortOrder: number
}

export interface Grade3Lesson {
  levelId: string
  order: number
  title: string
  goal: string
  unitId: string
  levelType: CurriculumLevelKind
  knowledgeTags: string[]
  milestoneBadge: string | null
  /** 16 节之后只占格子，不能进课时页。 */
  placeholder: boolean
}

export const GRADE3_FALL_UNITS: Grade3Unit[] = [
  { unitId: 'L1_U01', semesterId: 'L1', title: 'Level 1 · 单元 1', sortOrder: 1 },
  { unitId: 'L1_U02', semesterId: 'L1', title: 'Level 1 · 单元 2', sortOrder: 2 },
  { unitId: 'L1_U03', semesterId: 'L1', title: 'Level 1 · 单元 3', sortOrder: 3 },
]

export const BADGE_TITLES: Record<string, string> = {
  turtle_hello: '初识海龟',
  loop_magic: '循环的魔法',
  star_flower: '小星花',
  first_drawing: '开口与海龟',
  variable_box: '变量和判断',
  loop_picture: '循环画图',
}

const AUTHORED: Record<string, Pick<Grade3Lesson, 'title' | 'goal' | 'levelType' | 'knowledgeTags' | 'milestoneBadge'>> = {
  L01: { title: '让电脑开口说话', goal: '用 print 把一句话打印出来', levelType: 'new', knowledgeTags: ['print'], milestoneBadge: null },
  L02: { title: '海龟画第一条线', goal: '让海龟往前走、再拐个弯', levelType: 'new', knowledgeTags: ['forward', 'right'], milestoneBadge: null },
  L03: { title: '画一个正方形', goal: '重复「走一段、转个弯」把正方形画出来', levelType: 'practice', knowledgeTags: ['forward', 'right'], milestoneBadge: 'turtle_hello' },
  L04: { title: '用一个变量控制边长', goal: '把边长装进变量，改一处就全改', levelType: 'new', knowledgeTags: ['variable'], milestoneBadge: null },
  L05: { title: '综合：画一个可调三角形', goal: '变量 + 转角，拼出一个能改大小的三角形', levelType: 'practice', knowledgeTags: ['variable', 'angle'], milestoneBadge: null },
  L06: { title: '用 for 循环，8 行收成循环', goal: '看见重复的 8 行怎样收成 for', levelType: 'new', knowledgeTags: ['for_loop', 'range'], milestoneBadge: null },
  L07: { title: 'for + range 画多边形', goal: '改一个数字就能画三角形、五边形、八边形', levelType: 'practice', knowledgeTags: ['for_loop', 'range'], milestoneBadge: 'loop_magic' },
  L08: { title: 'if 判断，让海龟自己选颜色', goal: '用 if / else 让电脑做一个选择', levelType: 'new', knowledgeTags: ['if', 'else'], milestoneBadge: null },
  L09: { title: '综合：循环里的 if，画双色多边形', goal: '把循环和判断叠在一起，画出两种颜色', levelType: 'practice', knowledgeTags: ['if', 'for_loop'], milestoneBadge: null },
  L10: { title: '变量加一加，越画越大', goal: '每循环一次，把长度加上 20', levelType: 'new', knowledgeTags: ['variable', 'for_loop'], milestoneBadge: null },
  L11: { title: '变量组合，画一片花边', goal: '把长度和角度一起用起来', levelType: 'practice', knowledgeTags: ['variable'], milestoneBadge: null },
  L12: { title: '阶段收束：画一朵小星花', goal: '把学过的循环、颜色、变量拼成一件作品', levelType: 'project', knowledgeTags: ['for_loop', 'nested_loop', 'variable'], milestoneBadge: 'star_flower' },
  L13: { title: '把 print 打准确', goal: '把打印用过的关键词再打一遍', levelType: 'typing', knowledgeTags: ['print'], milestoneBadge: null },
  L14: { title: '再练一次正方形', goal: '用已经会的走和转，再画一个正方形', levelType: 'practice', knowledgeTags: ['forward', 'right'], milestoneBadge: null },
  L15: { title: '把重复收成循环', goal: '看到四条边，就知道可以收成 for', levelType: 'new', knowledgeTags: ['for_loop', 'range'], milestoneBadge: null },
}

function placeholderKind(order: number): CurriculumLevelKind {
  const index = (order - 1) % 20
  if (index === 19) return 'project'
  if (index === 12) return 'typing'
  if (index % 2 === 1) return 'practice'
  return 'new'
}

function placeholderBadge(order: number): string | null {
  if (order === 20) return 'first_drawing'
  if (order === 40) return 'variable_box'
  if (order === 60) return 'loop_picture'
  return null
}

function unitIdFor(order: number): string {
  return GRADE3_FALL_UNITS[Math.floor((order - 1) / 20)]?.unitId ?? GRADE3_FALL_UNITS[0].unitId
}

export const GRADE3_FALL_LESSONS: Grade3Lesson[] = Array.from({ length: 60 }, (_, index) => {
  const order = index + 1
  const levelId = `L${String(order).padStart(2, '0')}`
  const authored = AUTHORED[levelId]
  if (authored) {
    return { levelId, order, unitId: unitIdFor(order), placeholder: false, ...authored }
  }
  return {
    levelId,
    order,
    unitId: unitIdFor(order),
    title: '待补充项目实战',
    goal: '这一节的项目还在准备。',
    levelType: placeholderKind(order),
    knowledgeTags: ['project'],
    milestoneBadge: placeholderBadge(order),
    placeholder: true,
  }
})

export const LEVEL_KIND_LABEL: Record<CurriculumLevelKind, string> = {
  new: '新课',
  practice: '练习',
  project: '项目',
  typing: '打字',
}

export function formatUnitLabel(title: string): string {
  const matched = title.match(/^(第.+?单元)\s+(.+)$/)
  if (!matched) return title
  return `${matched[1]}（${matched[2]}）`
}

export function badgeTitle(id: string): string {
  return BADGE_TITLES[id] ?? id
}
