/**
 * Blockly Level 1 的 80 关逻辑进阶练习。
 *
 * 以已经通过生产解释器校验的 Level 0 标准解为素材，重新组合镜像、反向和旋转，
 * 再用生产解析器与解释器逐关验证。生成的关卡全部是正式正文，不把占位行直接放行。
 * 旧占位行保留在原编号上，由 insert … on conflict 增量替换正文。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseModuleLevelBody } from '../src/modules/curriculum/moduleLevelBody.ts'
import { interpretModuleLevel } from '../src/modules/curriculum/moduleLevelInterpreter.ts'
import {
  ALL_VARIANTS,
  applyVariant,
  corridorScene,
  countBlocks,
  pathIsSafe,
  placeCollectibles,
  transformPath,
} from './blockly-level-recipes.mjs'
import { analyzeLevel, buildHints, buildStoryFor } from './blockly-story-recipes.mjs'

const ROOT = process.cwd()
const SOURCE_MANIFEST = path.join(ROOT, 'scripts/generated/blockly-80.manifest.json')
const SQL_PATH = path.join(ROOT, 'supabase/migrations/20261127110000_blockly_level_1_80_grid_generated.sql')
const MANIFEST_PATH = path.join(ROOT, 'scripts/generated/blockly-level-1-80.manifest.json')
const TERM_ID = 'blk-g1-spring'

const UNIT_META = [
  {
    title: '路线规划师',
    summary: '把长路线拆成小段，数清步数，再用顺序积木稳稳走完。',
    tags: ['sequence', 'path', 'planning'],
  },
  {
    title: '转向与对称',
    summary: '从不同方向观察路线，练习左右转、镜像和反向行走。',
    tags: ['turn', 'mirror', 'path'],
  },
  {
    title: '嵌套循环进阶',
    summary: '把重复动作装进更大的重复里，用更少积木完成复杂路线。',
    tags: ['loop', 'nested_loop'],
  },
  {
    title: '条件判断进阶',
    summary: '根据前方有路还是有墙自动选择动作，比较不同条件写法。',
    tags: ['condition', 'if', 'loop'],
  },
  {
    title: '综合调试挑战',
    summary: '组合顺序、循环和条件，检查朝向、次数与分支，完成学期作品。',
    tags: ['project', 'debug', 'sequence', 'loop', 'condition'],
  },
]

const TITLE_PREFIXES = [
  '拆解路线', '换方向走', '循环再挑战', '条件再判断', '综合调试',
]

function containsCondition(nodes) {
  return nodes.some((node) => {
    if (!node) return false
    return node.type.startsWith('if_') || containsCondition(node.children ?? []) || (node.next ? containsCondition([node.next]) : false)
  })
}

function alternateVariant(solution, startHeading, index) {
  if (!containsCondition(solution)) {
    for (let offset = 0; offset < ALL_VARIANTS.length; offset += 1) {
      const variant = ALL_VARIANTS[(index * 5 + offset) % ALL_VARIANTS.length]
      const picked = applyVariant(solution, variant)
      if (picked && pathIsSafe(picked.cells)) return picked
    }
  }
  // 条件走廊只允许旋转：镜像会把“撞墙右转”的规则破坏掉。
  return transformPath([], { rotate: (index + 1) % 4, heading: startHeading })
}

function transformedLevel(source, index) {
  const sourceBody = parseModuleLevelBody(source.body)
  if (sourceBody.scene.type !== 'grid') throw new Error(`${source.levelId} 不是网格关卡`)
  const sourceResult = interpretModuleLevel(sourceBody, source.solution)
  if (!sourceResult.completed || sourceResult.blocked) throw new Error(`${source.levelId} 源标准解不合格`)

  const variant = alternateVariant(source.solution, sourceBody.scene.start.heading, index)
  const cells = variant.cells.length ? variant.cells : transformPath(sourceResult.final.trail, {
    rotate: (index + 1) % 4,
    heading: sourceBody.scene.start.heading,
  }).cells
  const heading = variant.heading
  const solution = variant.program ?? source.solution
  const corridor = corridorScene(cells)
  const unitIndex = Math.floor(index / 16)
  const levelId = `blk-${String(index + 81).padStart(3, '0')}`

  return {
    levelId,
    sortOrder: index + 81,
    unitId: `${TERM_ID}-u${unitIndex + 1}`,
    title: `${TITLE_PREFIXES[unitIndex]} · ${source.title}`,
    levelType: index === 79 ? 'project' : source.levelType,
    knowledgeTags: UNIT_META[unitIndex].tags,
    milestoneBadge: index === 79 ? 'level1_master' : null,
    estimatedMinutes: index >= 64 ? 20 : 15,
    facts: source.facts ?? null,
    maxStepsSlack: source.maxStepsSlack ?? 0,
    solution,
    body: {
      ...source.body,
      scene: {
        ...sourceBody.scene,
        width: corridor.width,
        height: corridor.height,
        start: { ...corridor.start, heading },
        goal: corridor.goal,
        obstacles: corridor.obstacles,
        entities: placeCollectibles(corridor.path, sourceBody.scene.entities.length, `level1-${levelId}`),
      },
      runtime: { ...sourceBody.runtime, max_steps: 400 },
      hints: [],
      completion: {
        ...sourceBody.completion,
        success_text: index === 79 ? 'Level 1 逻辑大挑战通关！' : '路线调试成功！',
      },
    },
  }
}

function verify(level) {
  const parsed = parseModuleLevelBody(level.body)
  const result = interpretModuleLevel(parsed, level.solution)
  if (!result.completed) throw new Error(`${level.levelId} 标准解没有通关`)
  if (result.blocked) throw new Error(`${level.levelId} 标准解发生了撞墙`)
  const goalHits = result.final.trail.filter((cell) => cell.x === parsed.scene.goal.x && cell.y === parsed.scene.goal.y).length
  if (goalHits !== 1) throw new Error(`${level.levelId} 终点经过了 ${goalHits} 次`)
  if (countBlocks(level.solution) > parsed.workspace.max_blocks) throw new Error(`${level.levelId} 积木数超过上限`)
  if (result.steps.length > parsed.runtime.max_steps) throw new Error(`${level.levelId} 步数超过上限`)
  return { parsed, result }
}

function sealLevel(level) {
  const first = verify(level)
  const maxSteps = Math.max(first.result.steps.length + 2 + (level.maxStepsSlack ?? 0), 4)
  const sealed = {
    ...level,
    body: { ...level.body, runtime: { ...level.body.runtime, max_steps: maxSteps } },
  }
  const second = verify(sealed)
  return { ...sealed, maxSteps, steps: second.result.steps.length, blocks: countBlocks(sealed.solution) }
}

function buildAllLevels() {
  const source = JSON.parse(readFileSync(SOURCE_MANIFEST, 'utf8'))
  if (source.termId !== 'blk-g1-fall' || source.levels.length !== 80) throw new Error('Level 0 源清单无效')
  const transformed = source.levels.map(transformedLevel)
  const withGoals = transformed.map((level) => ({ ...level, goal: analyzeLevel(level).goal }))
  const withTeaching = withGoals.map((level, index) => ({
    ...level,
    body: {
      ...level.body,
      hints: buildHints(level),
      ...buildStoryFor(level, index ? withGoals[index - 1] : null),
    },
  }))
  return withTeaching.map(sealLevel)
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlArray(values) {
  return `array[${values.map(sqlString).join(', ')}]`
}

function levelSql(level) {
  return `-- ${level.levelId} ${level.title}
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', ${sqlString(level.levelId)}, ${level.sortOrder},
   ${sqlString(level.title)}, ${sqlString(level.goal)}, $body$
${JSON.stringify(level.body, null, 2)}
  $body$::jsonb, true, now(), now(),
   ${sqlString(TERM_ID)}, ${sqlString(level.unitId)}, 'grid', ${sqlString(level.levelType)},
   ${sqlArray(level.knowledgeTags)}, ${level.milestoneBadge ? sqlString(level.milestoneBadge) : 'null'},
   ${level.estimatedMinutes}, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();`
}

function buildSql(levels) {
  return `-- Blockly Level 1 补齐到 80 关（blk-081 … blk-160）。
-- 由 scripts/generate-blockly-level-1-80.mjs 生成；每关都用生产解析器和解释器自校验。
-- 原 blk-081 … blk-095 占位行由 on conflict 原位替换为正式正文，不删除数据，不改学习记录编号。
-- Neon 跨语句没有事务，所有语句均可重复执行。

update public.module_term
set weeks = 16,
    level_cap = 80,
    summary = '逻辑进阶：路线拆解、嵌套循环、条件判断与综合调试。80 课网格闯关。',
    updated_at = now()
where module_id = 'blockly' and term_id = ${sqlString(TERM_ID)};

insert into public.module_unit
  (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
values
${UNIT_META.map((unit, index) => `  ('blockly', ${sqlString(`${TERM_ID}-u${index + 1}`)}, ${sqlString(TERM_ID)}, ${sqlString(unit.title)},
   ${sqlString(unit.summary)}, 'grid', ${sqlArray(unit.tags)}, 16, ${index + 1})`).join(',\n')}
on conflict (module_id, unit_id) do update set
  term_id = excluded.term_id,
  title = excluded.title,
  summary = excluded.summary,
  scene_form = excluded.scene_form,
  knowledge_tags = excluded.knowledge_tags,
  level_cap = excluded.level_cap,
  sort_order = excluded.sort_order,
  updated_at = now();

${levels.map(levelSql).join('\n\n')}
`
}

const levels = buildAllLevels()
if (levels.length !== 80) throw new Error(`应该生成 80 关，实际 ${levels.length}`)
for (const [index, unit] of UNIT_META.entries()) {
  const count = levels.filter((level) => level.unitId === `${TERM_ID}-u${index + 1}`).length
  if (count !== 16) throw new Error(`${unit.title} 应该有 16 关，实际 ${count}`)
}

mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
writeFileSync(MANIFEST_PATH, `${JSON.stringify({ termId: TERM_ID, levels }, null, 2)}\n`, 'utf8')
writeFileSync(SQL_PATH, `${buildSql(levels)}\n`, 'utf8')
console.log(`已生成 Level 1 80 关：${path.relative(ROOT, SQL_PATH)}`)
console.log(`标准解清单：${path.relative(ROOT, MANIFEST_PATH)}`)
