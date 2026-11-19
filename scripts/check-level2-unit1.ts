/**
 * 确认 Level 2 六个单元都能通过课程包校验，课时页加载的是课文。
 * 用法：npx tsx scripts/check-level2-unit1.ts
 */
import { readFileSync } from 'node:fs'
import { validateCoursePackage } from '../supabase/functions/_shared/coursePackage.ts'
import { buildPlayableLevel } from '../src/lib/lessonMaterial.ts'
import { projectUnit } from '../src/lib/curriculumState.ts'

const files = ['L2_U01', 'L2_U02', 'L2_U03', 'L2_U04', 'L2_U05', 'L2_U06']
let imported = 0
const orders = new Set<number>()
for (const file of files) {
  const text = readFileSync(new URL(`../content/courses/level2/${file}.json`, import.meta.url), 'utf8')
  const { report } = validateCoursePackage(text)
  const errors = report.issues.filter((issue) => issue.severity === 'error')
  if (!report.ok || errors.length || report.imported !== 20) {
    console.error(file, errors)
    process.exit(1)
  }
  const body = JSON.parse(text) as { levels: { order: number }[] }
  for (const level of body.levels) {
    if (orders.has(level.order)) throw new Error(`${file} 的序号 ${level.order} 和别的单元冲突`)
    orders.add(level.order)
  }
  imported += report.imported
}
if (orders.size !== 120 || Math.min(...orders) !== 121 || Math.max(...orders) !== 240) {
  throw new Error('Level 2 序号没有覆盖 121–240')
}

const expect: Array<[string, string]> = [
  ['L0121', '给正方形起个名字'],
  ['L0140', '两扇小窗'],
  ['L0141', '函数一上来就涂红'],
  ['L0160', '双色小窗'],
  ['L0180', '一串小旗'],
  ['L0200', '方瓣花环'],
  ['L0220', '我的作品签名'],
  ['L0240', '我的小花园'],
]
for (const [id, title] of expect) {
  const level = buildPlayableLevel(id)
  if (!level || level.is_placeholder || level.title !== title || level.teach_code_lines.length === 0) {
    throw new Error(`${id} 没有载入课文 ${title}`)
  }
  if (level.preview_kind !== 'turtle') throw new Error(`${id} 不是海龟课`)
}
const after = buildPlayableLevel('L0241')
if (!after?.is_placeholder) throw new Error('第 241 关不应变成已写课文')

const finishedLevel1 = Array.from({ length: 120 }, (_, index) => ({ order: index + 1, completed: true, stars: 1 }))
const activeAccess = {
  status: 'active' as const,
  spans: [{ orgId: 'org', subjectType: 'org' as const, subjectId: 'org', levelOrderMin: 1, levelOrderMax: 960 }],
  orgId: 'org',
  groupId: 'group',
  studentId: 'student',
}
const view = projectUnit('L2_U01', finishedLevel1, activeAccess)
if (!view || view.length !== 20 || view[0]?.title !== '给正方形起个名字' || view[0]?.is_placeholder || !view[0]?.unlocked) {
  throw new Error('地图没有打开第 121 关课文')
}
const trialUnits = ['L2_U01', 'L2_U02', 'L2_U03', 'L2_U04', 'L2_U05', 'L2_U06']
for (const unitId of trialUnits) {
  const trial = projectUnit(unitId, finishedLevel1, { ...activeAccess, status: 'trial', spans: [] })
  if (!trial || trial.some((level) => level.unlocked)) throw new Error(`试用机构不应打开 ${unitId}`)
}
const finishedThrough239 = Array.from({ length: 239 }, (_, index) => ({ order: index + 1, completed: true, stars: 1 }))
const garden = projectUnit('L2_U06', finishedThrough239, activeAccess)
if (!garden || garden[19]?.title !== '我的小花园' || garden[19]?.is_placeholder || !garden[19]?.unlocked) {
  throw new Error('地图没有打开第 240 关课文')
}

console.log(`package-ok ${imported}, trial-locked, placeholder-after ${after.title}`)
