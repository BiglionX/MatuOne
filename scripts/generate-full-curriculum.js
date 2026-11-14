/**
 * 生成 960 节课骨架：Level 1–8，每个 Level 6 个单元、120 节。
 *
 * 学习序号从 Level 1 开始。若 content/courses/level1 里有 6 个单元包，
 * 第 1–120 节用那份课文盖住骨架；第 121 节仍是占位。
 * 占位课标题用「Level X · 单元 Y · 第 Z 关」。
 * 每个单元严格 12 new + 5 practice + 2 typing + 1 project。
 *
 * 用法：node scripts/generate-full-curriculum.js
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 单元内 20 个槽位。打字放在中段，项目放在最后一节。 */
const SLOT = [
  'new', 'new', 'new', 'new',
  'practice',
  'new', 'new', 'new',
  'typing',
  'new', 'new',
  'practice',
  'typing',
  'new', 'new', 'new',
  'practice', 'practice', 'practice',
  'project',
]

/** Level 1 第一单元：沿用现在的 20 节。已写好的课文不改标题和课型，占位课改用 Level 命名。 */
const FIRST_UNIT = [
  { title: '让电脑开口说话', goal: '用 print 把一句话打印出来', levelType: 'new', knowledgeTags: ['print'], milestoneBadge: null, placeholder: false },
  { title: '海龟画第一条线', goal: '让海龟往前走、再拐个弯', levelType: 'new', knowledgeTags: ['forward', 'right'], milestoneBadge: null, placeholder: false },
  { title: '画一个正方形', goal: '重复「走一段、转个弯」把正方形画出来', levelType: 'practice', knowledgeTags: ['forward', 'right'], milestoneBadge: 'turtle_hello', placeholder: false },
  { title: '用一个变量控制边长', goal: '把边长装进变量，改一处就全改', levelType: 'new', knowledgeTags: ['variable'], milestoneBadge: null, placeholder: false },
  { title: '综合：画一个可调三角形', goal: '变量 + 转角，拼出一个能改大小的三角形', levelType: 'practice', knowledgeTags: ['variable', 'angle'], milestoneBadge: null, placeholder: false },
  { title: '用 for 循环，8 行收成循环', goal: '看见重复的 8 行怎样收成 for', levelType: 'new', knowledgeTags: ['for_loop', 'range'], milestoneBadge: null, placeholder: false },
  { title: 'for + range 画多边形', goal: '改一个数字就能画三角形、五边形、八边形', levelType: 'practice', knowledgeTags: ['for_loop', 'range'], milestoneBadge: 'loop_magic', placeholder: false },
  { title: 'if 判断，让海龟自己选颜色', goal: '用 if / else 让电脑做一个选择', levelType: 'new', knowledgeTags: ['if', 'else'], milestoneBadge: null, placeholder: false },
  { title: '综合：循环里的 if，画双色多边形', goal: '把循环和判断叠在一起，画出两种颜色', levelType: 'practice', knowledgeTags: ['if', 'for_loop'], milestoneBadge: null, placeholder: false },
  { title: '变量加一加，越画越大', goal: '每循环一次，把长度加上 20', levelType: 'new', knowledgeTags: ['variable', 'for_loop'], milestoneBadge: null, placeholder: false },
  { title: '变量组合，画一片花边', goal: '把长度和角度一起用起来', levelType: 'practice', knowledgeTags: ['variable'], milestoneBadge: null, placeholder: false },
  { title: '阶段收束：画一朵小星花', goal: '把学过的循环、颜色、变量拼成一件作品', levelType: 'project', knowledgeTags: ['for_loop', 'nested_loop', 'variable'], milestoneBadge: 'star_flower', placeholder: false },
  { title: '把 print 打准确', goal: '把打印用过的关键词再打一遍', levelType: 'typing', knowledgeTags: ['print'], milestoneBadge: null, placeholder: false },
  { title: '再练一次正方形', goal: '用已经会的走和转，再画一个正方形', levelType: 'practice', knowledgeTags: ['forward', 'right'], milestoneBadge: null, placeholder: false },
  { title: '把重复收成循环', goal: '看到四条边，就知道可以收成 for', levelType: 'new', knowledgeTags: ['for_loop', 'range'], milestoneBadge: null, placeholder: false },
  { title: '问候和正方形放一起', goal: '先 print 一句问候，再画一个正方形', levelType: 'practice', knowledgeTags: ['print', 'forward', 'for_loop'], milestoneBadge: null, placeholder: false },
  { title: '把问候装进变量', goal: '写下 name = "你好"，再用 print(name) 打印出来', levelType: 'new', knowledgeTags: ['variable', 'print'], milestoneBadge: null, placeholder: false },
  { title: '改问候、改边长', goal: '把问候和边长两个变量都改一次，再跑一遍', levelType: 'practice', knowledgeTags: ['variable', 'print', 'forward'], milestoneBadge: null, placeholder: false },
  { title: '把学过的词再打一遍', goal: '把 print、forward、right 再打准确', levelType: 'typing', knowledgeTags: ['print', 'forward', 'right'], milestoneBadge: null, placeholder: false },
  { title: '单元作品：海龟问候', goal: '用一句问候和一条正方形，做成能送给同学的小作品', levelType: 'project', knowledgeTags: ['print', 'forward', 'for_loop'], milestoneBadge: 'first_drawing', placeholder: false },
]

function unit(tags) {
  return { tags }
}

const SUBTITLES = ['基础入门', '海龟绘图', '循环魔法', '条件判断', '数据进阶', '逻辑进阶', '综合项目', '算法初探']

/** 8 个 Level，沿用原来的学习顺序：前 120 节是 Level 1。 */
const LEVELS = [
  [
    unit(['print', 'forward']),
    unit(['variable', 'if']),
    unit(['for_loop', 'range']),
    unit(['color', 'angle']),
    unit(['variable', 'for_loop']),
    unit(['for_loop', 'nested_loop']),
  ],
  [
    unit(['forward', 'right']),
    unit(['if', 'else']),
    unit(['nested_loop', 'for_loop']),
    unit(['function']),
    unit(['angle', 'variable']),
    unit(['for_loop', 'variable']),
  ],
  [
    unit(['while']),
    unit(['list']),
    unit(['list', 'for_loop']),
    unit(['string']),
    unit(['dict']),
    unit(['list', 'dict']),
  ],
  [
    unit(['function']),
    unit(['function', 'variable']),
    unit(['string', 'list']),
    unit(['dict']),
    unit(['if', 'string']),
    unit(['function', 'list']),
  ],
  [
    unit(['nested_loop', 'if']),
    unit(['search', 'list']),
    unit(['sort', 'list']),
    unit(['class']),
    unit(['if', 'while']),
    unit(['while', 'if']),
  ],
  [
    unit(['while', 'if']),
    unit(['list', 'while']),
    unit(['function']),
    unit(['class']),
    unit(['if', 'function']),
    unit(['function', 'class']),
  ],
  [
    unit(['keyboard']),
    unit(['sequence']),
    unit(['print']),
    unit(['forward']),
    unit(['for_loop']),
    unit(['print', 'forward']),
  ],
  [
    unit(['right', 'forward']),
    unit(['variable']),
    unit(['if']),
    unit(['print']),
    unit(['for_loop']),
    unit(['for_loop', 'variable']),
  ],
]

function pad(order, width) {
  return String(order).padStart(width, '0')
}

function placeholderTitle(stageLevel, unitSort, slot) {
  return `Level ${stageLevel} · 单元 ${unitSort} · 第 ${slot + 1} 关`
}

const stages = []
const units = []
const levels = []
const badges = {
  turtle_hello: '初识海龟',
  loop_magic: '循环的魔法',
  star_flower: '小星花',
  first_drawing: '开口与海龟',
}

LEVELS.forEach((stageUnits, stageIndex) => {
  const stageLevel = stageIndex + 1
  stages.push({
    stageLevel,
    stageId: `L${stageLevel}`,
    title: `Level ${stageLevel}`,
    subtitle: SUBTITLES[stageIndex],
    heading: `Level ${stageLevel}`,
  })
  stageUnits.forEach((item, index) => {
    const sortOrder = index + 1
    const unitId = `L${stageLevel}_U${pad(sortOrder, 2)}`
    const title = `Level ${stageLevel} · 单元 ${sortOrder}`
    units.push({
      unitId,
      stageLevel,
      title,
      sortOrder,
      knowledgeTags: item.tags,
    })
    for (let slot = 0; slot < 20; slot += 1) {
      const order = levels.length + 1
      const preserved = units.length === 1 ? FIRST_UNIT[slot] : null
      const authored = Boolean(preserved && !preserved.placeholder)
      const levelType = preserved ? preserved.levelType : SLOT[slot]
      const knowledgeTags = preserved ? preserved.knowledgeTags : item.tags
      const isPlaceholder = !authored
      const milestoneBadge = preserved
        ? preserved.milestoneBadge
        : levelType === 'project'
          ? `${unitId}-badge`
          : null
      if (milestoneBadge && !badges[milestoneBadge]) badges[milestoneBadge] = title
      levels.push({
        levelId: `L${pad(order, 4)}`,
        order,
        stageLevel,
        unitId,
        levelType,
        title: authored ? preserved.title : placeholderTitle(stageLevel, sortOrder, slot),
        goal: authored ? preserved.goal : `这一节先熟悉${knowledgeTags.join('、')}，课文还在编写。`,
        knowledgeTags,
        milestoneBadge,
        placeholder: isPlaceholder,
        is_placeholder: isPlaceholder,
        legacyLevelId: order <= 60 ? `L${pad(order, 2)}` : null,
      })
    }
  })
})

function overlayLevel1() {
  const ids = ['L1_U01', 'L1_U02', 'L1_U03', 'L1_U04', 'L1_U05', 'L1_U06']
  const files = ids.map((id) => join(root, 'content', 'courses', 'level1', `${id}.json`))
  if (!files.every((file) => existsSync(file))) return false
  for (const file of files) {
    const pack = JSON.parse(readFileSync(file, 'utf8'))
    const unit = units.find((item) => item.unitId === pack.unit.unit_id)
    if (unit && Array.isArray(pack.unit_tags)) unit.knowledgeTags = pack.unit_tags
    for (const lesson of pack.levels) {
      const row = levels[lesson.order - 1]
      if (!row || row.order !== lesson.order) throw new Error(`课程包序号错位 ${lesson.order}`)
      row.title = lesson.title
      row.goal = lesson.goal
      row.levelType = lesson.level_type
      row.knowledgeTags = lesson.knowledge_tags
      row.milestoneBadge = lesson.milestone_badge
      row.placeholder = false
      row.is_placeholder = false
      if (typeof lesson.milestone_badge === 'string' && lesson.badge_title) badges[lesson.milestone_badge] = lesson.badge_title
    }
  }
  return true
}

function assertCurriculum(overlaid) {
  if (stages.length !== 8) throw new Error(`Level 数应为 8，实际 ${stages.length}`)
  if (units.length !== 48) throw new Error(`单元数应为 48，实际 ${units.length}`)
  if (levels.length !== 960) throw new Error(`课时数应为 960，实际 ${levels.length}`)
  const ids = new Set(levels.map((level) => level.levelId))
  if (ids.size !== 960) throw new Error('level_id 有重复')
  if (levels[0].levelId !== 'L0001' || levels[959].levelId !== 'L0960') throw new Error('level_id 没有覆盖 L0001–L0960')
  if (levels[0].unitId !== 'L1_U01' || levels[0].stageLevel !== 1) throw new Error('第 1 节不在 Level 1 第一单元')
  if (levels[19].unitId !== 'L1_U01' || levels[20].unitId !== 'L1_U02' || levels[20].order !== 21) {
    throw new Error('第 21 节没有落在第二单元')
  }
  if (levels[120].order !== 121 || levels[120].title !== 'Level 2 · 单元 1 · 第 1 关' || !levels[120].is_placeholder) {
    throw new Error('第 121 节应仍是 Level 2 的占位课')
  }
  if (overlaid) {
    if (levels[0].title !== '走一条直线' || levels[0].is_placeholder) throw new Error('第 1 节应是已写好的直线课')
    if (levels[19].order !== 20 || levels[19].levelType !== 'project' || levels[19].is_placeholder) {
      throw new Error('第 20 节应是可上的项目关')
    }
    if (levels[20].is_placeholder || levels[20].title !== '边长装进盒子') throw new Error('第 21 节应是已写好的变量课')
  } else {
    if (levels[0].title !== '让电脑开口说话') throw new Error('第 1 节不是 Level 1 第一单元的现有课文')
    if (levels[18].order !== 19 || levels[18].levelType !== 'typing' || levels[18].is_placeholder) {
      throw new Error('第 19 节应是可上的打字关')
    }
    if (levels[19].order !== 20 || levels[19].levelType !== 'project' || levels[19].is_placeholder) {
      throw new Error('第 20 节应是可上的项目关')
    }
    if (!levels[20].is_placeholder) throw new Error('第 21 节应标成占位')
    if (!/^Level 1 · 单元 2 · 第 1 关$/.test(levels[20].title)) throw new Error('占位课标题不是 Level 格式')
  }
  const byUnit = new Map()
  for (const level of levels) {
    const list = byUnit.get(level.unitId) ?? []
    list.push(level)
    byUnit.set(level.unitId, list)
  }
  for (const [unitId, list] of byUnit) {
    if (list.length !== 20) throw new Error(`${unitId} 不是 20 节`)
    if (unitId === 'L1_U01' && !overlaid) continue
    const count = { new: 0, practice: 0, typing: 0, project: 0 }
    for (const level of list) count[level.levelType] += 1
    if (count.new !== 12 || count.practice !== 5 || count.typing !== 2 || count.project !== 1) {
      throw new Error(`${unitId} 课型配比不是 12/5/2/1：${JSON.stringify(count)}`)
    }
    if (list[19].levelType !== 'project') throw new Error(`${unitId} 的收尾不是项目课`)
  }
  for (let stageLevel = 1; stageLevel <= 8; stageLevel += 1) {
    const count = levels.filter((level) => level.stageLevel === stageLevel).length
    if (count !== 120) throw new Error(`Level ${stageLevel} 不是 120 节`)
    if (units.filter((item) => item.stageLevel === stageLevel).length !== 6) throw new Error(`Level ${stageLevel} 不是 6 个单元`)
  }
}

const level1Ready = overlayLevel1()
assertCurriculum(level1Ready)

const catalog = { stages, units, levels, badges }
const jsonPath = join(root, 'src', 'data', 'generated', 'curriculum.json')
mkdirSync(dirname(jsonPath), { recursive: true })
writeFileSync(jsonPath, `${JSON.stringify(catalog)}\n`)

console.log(`units ${units.length}, levels ${levels.length}`)
console.log(`wrote ${jsonPath}`)
