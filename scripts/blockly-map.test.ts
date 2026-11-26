import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { applyLinearUnlock, summarizeBlocklyProgress } from '../server/blocklyMap.ts'

const OUTLINE_MIGRATION = 'supabase/migrations/20261126120000_blockly_curriculum_outline.sql'
const RENAME_MIGRATION = 'supabase/migrations/20261126140000_blockly_term_level_names.sql'

/** 从大纲迁移里抠出学期、单元、关卡三层，验证地图要渲染的数据本身是自洽的。 */
function readOutline(): { terms: string[]; units: { unitId: string; termId: string }[]; levels: { levelId: string; sortOrder: number; termId: string; unitId: string }[] } {
  const sql = readFileSync(path.join(process.cwd(), OUTLINE_MIGRATION), 'utf8')
  const terms = [...sql.matchAll(/\('blockly', '(blk-g\d-[a-z]+)',/g)].map((match) => match[1])
  const units = [...sql.matchAll(/\('blockly', '(blk-g\d-[a-z]+-u\d+)', '(blk-g\d-[a-z]+)',/g)].map((match) => ({
    unitId: match[1],
    termId: match[2],
  }))
  const levels = [...sql.matchAll(/\('(blk-\d+)', (\d+), '(blk-g\d-[a-z]+)', '(blk-g\d-[a-z]+-u\d+)'/g)].map((match) => ({
    levelId: match[1],
    sortOrder: Number(match[2]),
    termId: match[3],
    unitId: match[4],
  }))
  return { terms, units, levels }
}

/** 从大纲迁移里抠出学期展示名，确认已经改成 Level 序列、不带年级语义。 */
function readTermTitles(): { termId: string; title: string; stageLabel: string }[] {
  const sql = readFileSync(path.join(process.cwd(), OUTLINE_MIGRATION), 'utf8')
  return [...sql.matchAll(/\('blockly', '(blk-g\d-[a-z]+)', '([^']+)', '([^']+)', '(fall|spring)'/g)].map((match) => ({
    termId: match[1],
    title: match[2],
    stageLabel: match[3],
  }))
}

test('第一关永远解锁，后面要等前一关通关', () => {
  const unlocked = applyLinearUnlock([
    { levelId: 'blk-001', sortOrder: 1, completed: false },
    { levelId: 'blk-002', sortOrder: 2, completed: false },
    { levelId: 'blk-003', sortOrder: 3, completed: false },
  ])
  assert.deepEqual(
    unlocked.map((item) => item.unlocked),
    [true, false, false],
  )
})

test('前一关通关，下一关才解锁', () => {
  const unlocked = applyLinearUnlock([
    { levelId: 'blk-001', sortOrder: 1, completed: true },
    { levelId: 'blk-002', sortOrder: 2, completed: false },
    { levelId: 'blk-003', sortOrder: 3, completed: false },
  ])
  assert.deepEqual(
    unlocked.map((item) => item.unlocked),
    [true, true, false],
  )
})

test('线性解锁不能跳关：中间那关没通关，后面那关即使已完成也锁着', () => {
  const unlocked = applyLinearUnlock([
    { levelId: 'blk-001', sortOrder: 1, completed: true },
    { levelId: 'blk-002', sortOrder: 2, completed: false },
    { levelId: 'blk-003', sortOrder: 3, completed: true },
  ])
  assert.deepEqual(
    unlocked.map((item) => item.unlocked),
    [true, true, false],
  )
})

test('连锁解锁：每一关通关都会打开下一关', () => {
  const unlocked = applyLinearUnlock([
    { levelId: 'blk-001', sortOrder: 1, completed: true },
    { levelId: 'blk-002', sortOrder: 2, completed: true },
    { levelId: 'blk-003', sortOrder: 3, completed: true },
    { levelId: 'blk-004', sortOrder: 4, completed: false },
  ])
  assert.deepEqual(
    unlocked.map((item) => item.unlocked),
    [true, true, true, true],
  )
})

test('通关记录打乱顺序也不影响解锁顺序', () => {
  const unlocked = applyLinearUnlock([
    { levelId: 'blk-003', sortOrder: 3, completed: false },
    { levelId: 'blk-001', sortOrder: 1, completed: true },
    { levelId: 'blk-002', sortOrder: 2, completed: true },
  ])
  assert.deepEqual(
    unlocked.map((item) => item.levelId),
    ['blk-001', 'blk-002', 'blk-003'],
  )
  assert.deepEqual(
    unlocked.map((item) => item.unlocked),
    [true, true, true],
  )
})

test('没有关卡时返回空数组', () => {
  assert.deepEqual(applyLinearUnlock([]), [])
})

test('大纲迁移给出 4 个学期、20 个单元、60 个关卡', () => {
  const { terms, units, levels } = readOutline()
  assert.equal(terms.length, 4)
  assert.equal(units.length, 20)
  assert.equal(levels.length, 60)
})

test('每个单元都挂在某个学期下，每个关卡都挂在某个单元下', () => {
  const { terms, units, levels } = readOutline()
  const termIds = new Set(terms)
  const unitIds = new Set(units.map((unit) => unit.unitId))
  for (const unit of units) assert.ok(termIds.has(unit.termId), `单元 ${unit.unitId} 的学期不存在`)
  for (const level of levels) {
    assert.ok(termIds.has(level.termId), `关卡 ${level.levelId} 的学期不存在`)
    assert.ok(unitIds.has(level.unitId), `关卡 ${level.levelId} 的单元不存在`)
  }
})

test('关卡序号 1 到 60 连续且不重复', () => {
  const { levels } = readOutline()
  const orders = levels.map((level) => level.sortOrder).sort((a, b) => a - b)
  assert.deepEqual(orders, Array.from({ length: 60 }, (_, index) => index + 1))
  assert.equal(new Set(levels.map((level) => level.levelId)).size, 60)
})

const progressLevels = [
  { levelId: 'blk-001', sortOrder: 1, title: '直走' },
  { levelId: 'blk-002', sortOrder: 2, title: 'L 型路线' },
  { levelId: 'blk-003', sortOrder: 3, title: '长直道' },
]

test('没有 Blockly 记录时显示 0 关，并指向第一关', () => {
  const result = summarizeBlocklyProgress(['student-a'], progressLevels, [])
  assert.deepEqual(result.get('student-a'), { completedCount: 0, currentLevelTitle: '直走' })
})

test('Blockly 汇总只认有效已发布关卡，不受 Python 和未完成记录干扰', () => {
  const result = summarizeBlocklyProgress(['student-a'], progressLevels, [
    { studentId: 'student-a', levelId: 'blk-001', completed: true },
    { studentId: 'student-a', levelId: 'blk-002', completed: false },
    { studentId: 'student-a', levelId: 'L0001', completed: true },
    { studentId: 'student-a', levelId: 'blk-999', completed: true },
  ])
  assert.deepEqual(result.get('student-a'), { completedCount: 1, currentLevelTitle: 'L 型路线' })
})

test('关卡顺序打乱时仍取第一个未通关关卡', () => {
  const result = summarizeBlocklyProgress(['student-a'], [progressLevels[2], progressLevels[0], progressLevels[1]], [
    { studentId: 'student-a', levelId: 'blk-001', completed: true },
  ])
  assert.deepEqual(result.get('student-a'), { completedCount: 1, currentLevelTitle: 'L 型路线' })
})

test('全部通关时不再虚构下一关', () => {
  const result = summarizeBlocklyProgress(['student-a'], progressLevels, progressLevels.map((level) => ({
    studentId: 'student-a',
    levelId: level.levelId,
    completed: true,
  })))
  assert.deepEqual(result.get('student-a'), { completedCount: 3, currentLevelTitle: null })
})

test('批量汇总按学生隔离，且每名学生都有默认值', () => {
  const result = summarizeBlocklyProgress(['student-a', 'student-b', 'student-a'], progressLevels, [
    { studentId: 'student-a', levelId: 'blk-001', completed: true },
    { studentId: 'student-b', levelId: 'blk-002', completed: true },
  ])
  assert.equal(result.size, 2)
  assert.deepEqual(result.get('student-a'), { completedCount: 1, currentLevelTitle: 'L 型路线' })
  assert.deepEqual(result.get('student-b'), { completedCount: 1, currentLevelTitle: '直走' })
})

test('学期展示名是 Level 序列，不再出现年级语义', () => {
  const terms = readTermTitles()
  assert.deepEqual(terms.map((term) => term.title), ['Level 0', 'Level 1', 'Level 2', 'Level 3'])
  assert.deepEqual([...new Set(terms.map((term) => term.stageLabel))], ['Blockly 课程线'])
})

test('改名迁移与大纲迁移的学期名一致', () => {
  const renameSql = readFileSync(path.join(process.cwd(), RENAME_MIGRATION), 'utf8')
  const titles = [...renameSql.matchAll(/set title = '([^']+)'/g)].map((match) => match[1])
  assert.deepEqual(titles, ['Level 0', 'Level 1', 'Level 2', 'Level 3'])
})