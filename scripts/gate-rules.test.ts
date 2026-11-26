/**
 * 门禁规则审计（本地可跑，不连数据库）。
 *
 * 覆盖三类：
 * 1. 进关卡判定顺序：机构状态 → 模块开通 → Level 1 免费 → 试用范围 → 开通记录 → 课程包阶段
 * 2. 模块开通事实的派生：撤销 / 过期不算开通；候选集只来自共享注册表
 * 3. 单一事实源与死代码：前后端模块 ID 同源、迁移种子同源、页面不再按模块名分支
 *
 * 运行：npm run test:gates（不需要 DATABASE_URL，CI 与本地都能跑）
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  activeGrantOf,
  enabledModuleIds,
  isEnabledModuleEntitlement,
  moduleLessonIsAuthorized,
  type ModuleEntitlementRow,
} from '../supabase/functions/_shared/moduleEntitlements.ts'
import {
  MODULE_IDS,
  MODULE_REGISTRY,
  PROGRESS_MODULE_IDS,
  TOGGLEABLE_MODULE_IDS,
  isToggleableModule,
} from '../supabase/functions/_shared/moduleRegistry.ts'
import {
  decideEnterLevel,
  isFreeLevel1,
  LESSONS_PER_STAGE,
  openMaxLevel,
  TRIAL_LEVEL_MAX,
} from '../supabase/functions/_shared/orgStatus.ts'
import { MODULE_IDS as FRONT_MODULE_IDS } from '../src/modules/ids.ts'
import { launcherGateRole, needsModuleEntitlementCheck } from '../src/modules/launcherRole.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

type DecideInput = Parameters<typeof decideEnterLevel>[0]

/** 默认：试用机构 + 已开通 python + Level 1 + 有开通记录。 */
function decide(overrides: Partial<DecideInput> = {}) {
  const base: DecideInput = {
    status: 'trial',
    levelOrder: 1,
    entitled: true,
    stageLevel: 1,
    maxLevel: 1,
    enabledModules: ['python'],
  }
  return decideEnterLevel({ ...base, ...overrides })
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8')
}

test('模块清单只有一份：前端常量直接来自后端注册表', () => {
  assert.deepEqual(FRONT_MODULE_IDS, MODULE_IDS)
  assert.deepEqual(
    Object.keys(MODULE_IDS).sort(),
    MODULE_REGISTRY.map((module) => module.module_id).sort(),
  )
  for (const moduleId of PROGRESS_MODULE_IDS) {
    const entry = MODULE_REGISTRY.find((module) => module.module_id === moduleId)
    assert.ok(entry?.has_progress, `${moduleId} 进了进度清单却没有 has_progress`)
  }
  for (const moduleId of TOGGLEABLE_MODULE_IDS) {
    const entry = MODULE_REGISTRY.find((module) => module.module_id === moduleId)
    assert.ok(entry?.org_toggleable, `${moduleId} 进了可开关清单却没有 org_toggleable`)
  }
})

test('模块策略锁死：只有 MatuPix 机构可自行开关，Arduino 还没进度', () => {
  assert.deepEqual(PROGRESS_MODULE_IDS, ['matupix', 'python', 'blockly', 'easy-robot'])
  assert.deepEqual(TOGGLEABLE_MODULE_IDS, ['matupix'])
  assert.equal(isToggleableModule('matupix'), true)
  assert.equal(isToggleableModule('python'), false)
  assert.equal(isToggleableModule('arduino'), false)
  assert.equal(MODULE_REGISTRY.find((m) => m.module_id === 'arduino')?.status, 'coming_soon')
})

test('撤销或过期的开通记录不算开通', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const rows: ModuleEntitlementRow[] = [
    { module_id: 'python', revoked_at: null, valid_until: null },
    { module_id: 'matupix', revoked_at: '2026-01-01T00:00:00Z', valid_until: null },
  ]
  assert.deepEqual(enabledModuleIds(rows, now), ['python'])
  assert.equal(
    isEnabledModuleEntitlement({ module_id: 'matupix', revoked_at: null, valid_until: '2025-12-31T00:00:00Z' }, now),
    false,
  )
  assert.equal(
    isEnabledModuleEntitlement({ module_id: 'python', revoked_at: null, valid_until: '2026-06-01T00:00:00Z' }, now),
    true,
  )
})

test('未开通的模块拿不到授权记录', () => {
  const rows: ModuleEntitlementRow[] = [{ module_id: 'python', revoked_at: null, valid_until: null, max_level: 2 }]
  assert.equal(activeGrantOf(rows, 'python', ['python'])?.max_level, 2)
  assert.equal(activeGrantOf(rows, 'python', []), null)
})

test('模块未开通优先于 Level 1 免费放行', () => {
  assert.equal(decide({ enabledModules: [] }).reason, 'module_not_entitled')
  assert.equal(decide({ enabledModules: [], levelOrder: 1, stageLevel: 1 }).allowed, false)
  assert.deepEqual(moduleLessonIsAuthorized('python', [], 'trial', 1, 1, 1), {
    authorized: false,
    reason: 'module_not_entitled',
  })
})

test('机构状态先于模块判断：停用不可进，到期只读', () => {
  assert.equal(decide({ status: 'disabled' }).reason, 'org_disabled')
  assert.equal(decide({ status: 'expired' }).reason, 'org_expired')
})

test('试用机构：Level 1 免费放行，第 121 节起锁定', () => {
  assert.equal(decide({ levelOrder: 1, stageLevel: 1 }).allowed, true)
  assert.equal(decide({ levelOrder: TRIAL_LEVEL_MAX, stageLevel: 1 }).allowed, true)
  assert.equal(decide({ levelOrder: TRIAL_LEVEL_MAX + 1, stageLevel: 2 }).reason, 'trial_locked')
  assert.equal(isFreeLevel1(TRIAL_LEVEL_MAX, 1), true)
  assert.equal(isFreeLevel1(TRIAL_LEVEL_MAX + 1, 2), false)
  assert.equal(LESSONS_PER_STAGE, TRIAL_LEVEL_MAX)
})

test('正式机构：Level 1 免费，更高阶段要开通记录和课程包阶段', () => {
  assert.equal(decide({ status: 'active', levelOrder: 1, stageLevel: 1 }).allowed, true)
  assert.equal(decide({ status: 'active', levelOrder: 121, stageLevel: 2, entitled: false }).reason, 'not_entitled')
  assert.equal(
    decide({ status: 'active', levelOrder: 121, stageLevel: 2, entitled: true, maxLevel: 1 }).reason,
    'course_locked',
  )
  assert.equal(decide({ status: 'active', levelOrder: 121, stageLevel: 2, entitled: true, maxLevel: 2 }).allowed, true)
})

test('关卡序号或阶段对不上时一律不放行', () => {
  assert.equal(decide({ levelOrder: null }).reason, 'not_found')
  assert.equal(decide({ stageLevel: null }).reason, 'not_found')
})

test('课程包过期后任何阶段都不放行', () => {
  const now = new Date('2026-02-01T00:00:00Z')
  assert.equal(openMaxLevel({ maxLevel: 2, validUntil: '2026-01-01T00:00:00Z' }, now), 0)
  assert.equal(openMaxLevel({ maxLevel: 2, validUntil: null }, now), 2)
  assert.equal(openMaxLevel(null, now), 0)
})

test('家长会话按游客口径：不触发机构开通校验', () => {
  assert.equal(launcherGateRole({ student: false, org: false }), 'guest')
  assert.equal(launcherGateRole({ student: true, org: false }), 'student')
  assert.equal(launcherGateRole({ student: false, org: true }), 'org')
  assert.equal(launcherGateRole({ student: true, org: true }), 'student')
  assert.equal(needsModuleEntitlementCheck('guest'), false)
  assert.equal(needsModuleEntitlementCheck('student'), true)
  assert.equal(needsModuleEntitlementCheck('org'), true)
})

test('teaching_module 迁移种子与共享注册表同源', () => {
  const sql = [
    readSource('supabase/migrations/20261125110000_teaching_module_catalog.sql'),
    readSource('supabase/migrations/20261125130000_module_level_multi_module.sql'),
  ].join('\n')
  for (const module of MODULE_REGISTRY) {
    assert.ok(sql.includes(`'${module.module_id}'`), `迁移里缺少模块 ${module.module_id}`)
  }
  assert.ok(sql.includes('references public.teaching_module'), 'org_entitlement.module_id 仍没引用 teaching_module')
})

test('模块清单事实源在数据库：后台读 teaching_module，并且能首次开通', () => {
  const routes = readSource('server/routes.ts')
  assert.ok(routes.includes('from public.teaching_module'), '后台模块列表没有读 teaching_module 清单')
  assert.ok(routes.includes('set-module-enabled'), '后台没有首次开通模块的入口')
  assert.ok(routes.includes('set_org_module_enabled'), '后台没有调用 set_org_module_enabled')

  const migration = readSource('supabase/migrations/20261125120000_platform_module_grant.sql')
  assert.ok(
    migration.includes('create or replace function public.set_org_module_enabled'),
    '缺少 set_org_module_enabled 函数',
  )
  assert.ok(migration.includes("'模块开通'"), '开通记录没有区分「首次开通」')
  assert.ok(
    migration.includes("v_module.status <> 'active'"),
    '没有挡住筹备中的模块被开通',
  )
})

test('模块开关只有一个入口：前端不再并排两套开关 API', () => {
  const api = readSource('src/api/adminOrgs.ts')
  assert.ok(api.includes('setOrgModuleEnabled'), '前端缺少统一的模块开关 API')
  assert.ok(!api.includes('setOrgModuleLevel'), '前端还留着只调阶段上限的旧入口')
  assert.ok(!api.includes('setOrgModuleRevoked'), '前端还留着只调软关的旧入口')

  const page = readSource('src/pages/admin/AdminOrgDetail.tsx')
  assert.ok(page.includes('grantModule'), '后台页面没有首次开通的处理')
  assert.ok(page.includes("'coming_soon'"), '后台页面没处理筹备中的模块')
})

test('模块开关的目标状态不能写反：关闭发 false，重开发 true', () => {
  const page = readSource('src/pages/admin/AdminOrgDetail.tsx')
  const toggleStart = page.indexOf('const toggleModule')
  const levelStart = page.indexOf('const saveModuleLevel')
  const grantStart = page.indexOf('const grantModule')
  assert.ok(toggleStart > 0 && levelStart > 0 && grantStart > toggleStart, '后台页面缺少模块开关处理函数')

  const toggle = page.slice(toggleStart, grantStart)
  assert.ok(
    /revokedAt\s*!=\s*null/.test(toggle),
    'toggleModule 应按目标状态取反：已关闭（revokedAt 非空）才发 enabled=true',
  )
  const level = page.slice(levelStart, toggleStart)
  assert.ok(
    /revokedAt\s*==\s*null/.test(level),
    'saveModuleLevel 应保持当前开关状态：已关闭的模块只改上限，不被顺手重开',
  )
})

test('页面不再按模块名分支：一律走 availability', () => {
  const files = [...walk(join(ROOT, 'src', 'pages')), ...walk(join(ROOT, 'src', 'components'))]
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    assert.ok(
      !source.includes("detail.kind === 'python'"),
      `${relative(ROOT, file)} 还在按 detail.kind === 'python' 分支，应改成按 availability 渲染`,
    )
  }
})

test('死代码不留痕：无临时脚本、无废弃导出', () => {
  const scripts = readdirSync(join(ROOT, 'scripts')).filter((name) => name.startsWith('_tmp-'))
  assert.deepEqual(scripts, [], `scripts 下还有临时脚本：${scripts.join(', ')}`)

  const removed = ['modulesForParentChild', 'getOrgStudentPythonProgress', 'formatOrgPythonProgressLine']
  const files = walk(join(ROOT, 'src'))
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const name of removed) {
      assert.ok(!source.includes(name), `${relative(ROOT, file)} 还在引用已删除的 ${name}`)
    }
  }
})
