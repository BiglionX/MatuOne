import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { splitSql } from './split-sql.mjs'

const MIGRATION_FILE = 'supabase/migrations/20261127100000_blockly_level_2_3_80_stage_generated.sql'
const migrationSql = readFileSync(path.join(process.cwd(), MIGRATION_FILE), 'utf8')

const STUDENT_A = '11111111-1111-4111-8111-111111111111'
const STUDENT_B = '22222222-2222-4222-8222-222222222222'
const STUDENT_C = '33333333-3333-4333-8333-333333333333'
const STUDENT_D = '44444444-4444-4444-8444-444444444444'
const STUDENT_E = '55555555-5555-4555-8555-555555555555'

const SCHEMA_SQL = `
create table public.student (id uuid primary key);
create table public.teaching_module (module_id text primary key);
create table public.module_term (
  module_id text not null references public.teaching_module(module_id),
  term_id text not null,
  title text not null,
  stage_label text not null,
  term_code text not null,
  sort_order integer not null,
  weeks integer not null,
  level_cap integer not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (module_id, term_id),
  unique (module_id, sort_order)
);
create table public.module_unit (
  module_id text not null references public.teaching_module(module_id),
  unit_id text not null,
  term_id text not null,
  title text not null,
  summary text not null default '',
  scene_form text not null default 'stage',
  knowledge_tags text[] not null default '{}',
  level_cap integer not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (module_id, unit_id),
  unique (module_id, term_id, sort_order),
  foreign key (module_id, term_id) references public.module_term(module_id, term_id)
);
create table public.module_level (
  module_id text not null references public.teaching_module(module_id),
  level_id text not null,
  sort_order integer not null,
  title text not null,
  goal text not null default '',
  body jsonb not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  term_id text,
  unit_id text,
  scene_type text not null default 'stage',
  level_type text not null default 'new',
  knowledge_tags text[] not null default '{}',
  milestone_badge text,
  estimated_minutes integer,
  is_placeholder boolean not null default false,
  primary key (module_id, level_id),
  unique (module_id, sort_order),
  constraint module_level_term_fk foreign key (module_id, term_id) references public.module_term(module_id, term_id),
  constraint module_level_unit_fk foreign key (module_id, unit_id) references public.module_unit(module_id, unit_id)
);
create table public.learning_record (
  student_id uuid not null references public.student(id),
  level_id text not null,
  module_id text not null default 'python',
  completed boolean not null default false,
  stars integer not null default 0,
  change_done boolean not null default false,
  error_taps integer not null default 0,
  runs integer not null default 0,
  bonus_completed boolean not null default false,
  bonus_reward text,
  drill_reps integer not null default 0,
  drill_chunk text,
  updated_at timestamptz not null default now(),
  primary key (student_id, level_id)
);
create function public.forbid_business_delete() returns trigger
language plpgsql as $$
begin
  raise exception '业务数据禁止物理删除';
end;
$$;
create trigger module_level_no_delete before delete on public.module_level
  for each row execute function public.forbid_business_delete();
create trigger module_unit_no_delete before delete on public.module_unit
  for each row execute function public.forbid_business_delete();
create trigger learning_record_no_delete before delete on public.learning_record
  for each row execute function public.forbid_business_delete();
`

function levelId(order: number): string {
  return `blk-${String(order).padStart(3, '0')}`
}

function oldUnit(order: number): string {
  if (order <= 200) return `blk-g2-fall-u${order <= 180 ? 1 : 2}`
  const unitIndex = order <= 220 ? 1 : order <= 240 ? 2 : Math.floor((order - 241) / 3) + 1
  return `blk-g2-spring-u${unitIndex}`
}

async function insertUnit(db: PGlite, unitId: string, termId: string, sortOrder: number) {
  await db.query(
    `insert into public.module_unit
      (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
     values ('blockly', $1, $2, $1, '旧版单元', 'stage', array['stage'], 20, $3)`,
    [unitId, termId, sortOrder],
  )
}

async function insertOldLevel(db: PGlite, order: number, unitId: string, placeholder: boolean) {
  const termId = order <= 200 ? 'blk-g2-fall' : 'blk-g2-spring'
  await db.query(
    `insert into public.module_level
      (module_id, level_id, sort_order, title, goal, body, published, term_id, unit_id,
       scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
     values ('blockly', $1, $2, $1, '旧版目标', $3::jsonb, true, $4, $5,
       'stage', 'new', array['stage'], null, 15, $6)`,
    [levelId(order), order, JSON.stringify({ marker: `old-${levelId(order)}` }), termId, unitId, placeholder],
  )
}

async function insertProgress(
  db: PGlite,
  studentId: string,
  progressLevelId: string,
  values: Partial<{
    moduleId: string
    completed: boolean
    stars: number
    changeDone: boolean
    errorTaps: number
    runs: number
    bonusCompleted: boolean
    bonusReward: string | null
    drillReps: number
    drillChunk: string | null
  }> = {},
) {
  await db.query(
    `insert into public.learning_record
      (student_id, level_id, module_id, completed, stars, change_done, error_taps, runs,
       bonus_completed, bonus_reward, drill_reps, drill_chunk)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      studentId,
      progressLevelId,
      values.moduleId ?? 'blockly',
      values.completed ?? false,
      values.stars ?? 0,
      values.changeDone ?? false,
      values.errorTaps ?? 0,
      values.runs ?? 0,
      values.bonusCompleted ?? false,
      values.bonusReward ?? null,
      values.drillReps ?? 0,
      values.drillChunk ?? null,
    ],
  )
}

async function createFixture(oldStageApplied: boolean): Promise<PGlite> {
  const db = await PGlite.create()
  await db.exec(SCHEMA_SQL)
  await db.query(`insert into public.teaching_module (module_id) values ('blockly'), ('python')`)
  await db.query(
    `insert into public.module_term
      (module_id, term_id, title, stage_label, term_code, sort_order, weeks, level_cap, summary)
     values
     ('blockly', 'blk-g2-fall', 'Level 2', 'Blockly 课程线', 'fall', 3, 20, 40, '旧版 Level 2'),
     ('blockly', 'blk-g2-spring', 'Level 3', 'Blockly 课程线', 'spring', 4, 20, 40, '旧版 Level 3')`,
  )

  for (let unit = 1; unit <= 5; unit += 1) {
    if (!oldStageApplied || unit <= 2) await insertUnit(db, `blk-g2-fall-u${unit}`, 'blk-g2-fall', unit)
    if (!oldStageApplied || unit <= 2) await insertUnit(db, `blk-g2-spring-u${unit}`, 'blk-g2-spring', unit)
    if (oldStageApplied) await insertUnit(db, `blk-g2-spring-u${unit}-legacy`, 'blk-g2-spring', 90 + unit)
  }
  if (oldStageApplied) {
    for (let unit = 3; unit <= 5; unit += 1) {
      await insertUnit(db, `blk-g2-fall-u${unit}-legacy`, 'blk-g2-fall', unit)
    }
  }

  for (let order = 161; order <= 240; order += 1) {
    const legacyL2Placeholder = !oldStageApplied && order >= 167 && order <= 175
    const unitId = legacyL2Placeholder
      ? `blk-g2-fall-u${Math.floor((order - 167) / 3) + 3}`
      : oldUnit(order)
    await insertOldLevel(db, order, unitId, legacyL2Placeholder)
  }

  if (oldStageApplied) {
    for (let order = 901; order <= 909; order += 1) {
      const unit = Math.floor((order - 901) / 3) + 3
      await insertOldLevel(db, order, `blk-g2-fall-u${unit}-legacy`, true)
    }
    for (let order = 941; order <= 955; order += 1) {
      const unit = Math.floor((order - 941) / 3) + 1
      await insertOldLevel(db, order, `blk-g2-spring-u${unit}-legacy`, true)
    }
  } else {
    for (let order = 241; order <= 255; order += 1) {
      await insertOldLevel(db, order, oldUnit(order, false), true)
    }
  }

  for (const studentId of [STUDENT_A, STUDENT_B, STUDENT_C, STUDENT_D, STUDENT_E]) {
    await db.query('insert into public.student (id) values ($1)', [studentId])
  }
  await insertProgress(db, STUDENT_A, 'blk-161', { completed: true, stars: 3, changeDone: true, runs: 2 })
  await insertProgress(db, STUDENT_A, 'blk-201', { completed: true, stars: 2, changeDone: true, runs: 1 })
  await insertProgress(db, STUDENT_B, oldStageApplied ? 'blk-941' : 'blk-241', { completed: true, stars: 1, runs: 1 })
  await insertProgress(db, STUDENT_B, 'blk-167', { completed: true, stars: 2, runs: 1 })
  await insertProgress(db, STUDENT_C, 'blk-202', {
    completed: true,
    stars: 3,
    changeDone: true,
    errorTaps: 2,
    runs: 4,
    bonusCompleted: true,
    bonusReward: 'crown',
    drillReps: 2,
    drillChunk: 'old-chunk',
  })
  await insertProgress(db, STUDENT_C, 'blk-962', {
    completed: true,
    stars: 1,
    errorTaps: 1,
    runs: 1,
    drillReps: 1,
    drillChunk: 'target-chunk',
  })
  await insertProgress(db, STUDENT_D, 'L0001', { moduleId: 'python', completed: true, stars: 3, runs: 1 })
  return db
}

async function applyMigration(db: PGlite) {
  const statements = splitSql(migrationSql)
  for (const [index, statement] of statements.entries()) {
    try {
      await db.query(statement)
    } catch (error) {
      throw new Error(`迁移第 ${index + 1}/${statements.length} 条失败：${String(error?.message ?? error)}`, { cause: error })
    }
  }
}

async function scalar(db: PGlite, sql: string, params: unknown[] = []): Promise<number> {
  const result = await db.query(sql, params)
  return Number(result.rows[0]?.n ?? 0)
}

async function oneRow(db: PGlite, sql: string, params: unknown[] = []): Promise<Record<string, any> | undefined> {
  const result = await db.query(sql, params)
  assert.ok(result.rows.length <= 1, `查询应最多返回一行：${sql}`)
  return result.rows[0]
}

test('旧正式关卡和占位关卡存在时归档正文、恢复外键并隔离学习记录', async (t) => {
  const db = await createFixture(false)
  t.after(async () => db.close())
  await applyMigration(db)

  assert.equal(await scalar(db, `select count(*) n from public.module_level
    where published = false
      and (sort_order between 811 and 850 or sort_order between 961 and 1000)`), 80)
  assert.equal(await scalar(db, `select count(*) n from public.module_level
    where published = false and is_placeholder = false
      and (sort_order between 811 and 850 or sort_order between 961 and 1000)`), 71)

  const archivedL2 = await oneRow(db, `select * from public.module_level where level_id = 'blk-811'`)
  assert.equal(archivedL2?.body.marker, 'old-blk-161')
  assert.equal(archivedL2?.unit_id, 'blk-g2-fall-u1-legacy')
  assert.equal(archivedL2?.published, false)

  const archivedL2Placeholder = await oneRow(db, `select * from public.module_level where level_id = 'blk-817'`)
  assert.equal(archivedL2Placeholder?.body.marker, 'old-blk-167')
  assert.equal(archivedL2Placeholder?.unit_id, 'blk-g2-fall-u3-legacy')
  assert.equal(archivedL2Placeholder?.is_placeholder, true)
  assert.equal(archivedL2Placeholder?.published, false)

  const archivedL3 = await oneRow(db, `select * from public.module_level where level_id = 'blk-961'`)
  assert.equal(archivedL3?.body.marker, 'old-blk-201')
  assert.equal(archivedL3?.unit_id, 'blk-g2-spring-u1-legacy')
  assert.equal(archivedL3?.published, false)

  const archivedPlaceholder = await oneRow(db, `select * from public.module_level where level_id = 'blk-941'`)
  assert.equal(archivedPlaceholder?.body.marker, 'old-blk-241')
  assert.equal(archivedPlaceholder?.is_placeholder, true)
  assert.equal(archivedPlaceholder?.published, false)

  const newL2 = await oneRow(db, `select * from public.module_level where level_id = 'blk-161'`)
  assert.equal(newL2?.body.schema_version, 2)
  assert.equal(newL2?.unit_id, 'blk-g2-fall-u1')
  assert.equal(newL2?.published, true)
  assert.equal(newL2?.is_placeholder, false)

  const newL3 = await oneRow(db, `select * from public.module_level where level_id = 'blk-241'`)
  assert.equal(newL3?.body.schema_version, 2)
  assert.equal(newL3?.unit_id, 'blk-g2-spring-u1')
  assert.equal(newL3?.published, true)

  const termCounts = await db.query(`select term_id, count(*) n from public.module_level
    where published = true and is_placeholder = false
    group by term_id order by term_id`)
  assert.deepEqual(termCounts.rows.map((row) => [row.term_id, Number(row.n)]), [
    ['blk-g2-fall', 80],
    ['blk-g2-spring', 80],
  ])
  assert.equal(await scalar(db, `select count(*) n from pg_constraint
    where conname = 'module_level_unit_fk' and convalidated`), 1)
  assert.equal(await scalar(db, `select count(*) n from public.module_level l
    where not exists (select 1 from public.module_unit u
      where u.module_id = l.module_id and u.unit_id = l.unit_id and u.term_id = l.term_id)`), 0)

  const movedL2 = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-811'`, [STUDENT_A])
  assert.equal(movedL2?.completed, true)
  assert.equal(movedL2?.stars, 3)
  const movedL3 = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-961'`, [STUDENT_A])
  assert.equal(movedL3?.completed, true)
  assert.equal(movedL3?.stars, 2)
  assert.equal(await scalar(db, `select count(*) n from public.learning_record
    where student_id = $1 and level_id in ('blk-161', 'blk-201') and completed`, [STUDENT_A]), 0)

  const movedL2Legacy = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-817'`, [STUDENT_B])
  assert.equal(movedL2Legacy?.completed, true)
  assert.equal(movedL2Legacy?.stars, 2)
  assert.equal(await scalar(db, `select count(*) n from public.learning_record
    where student_id = $1 and level_id = 'blk-167' and completed`, [STUDENT_B]), 0)

  const movedPlaceholder = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-941'`, [STUDENT_B])
  assert.equal(movedPlaceholder?.completed, true)

  const merged = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-962'`, [STUDENT_C])
  assert.equal(merged?.completed, true)
  assert.equal(merged?.stars, 3)
  assert.equal(merged?.change_done, true)
  assert.equal(merged?.error_taps, 3)
  assert.equal(merged?.runs, 5)
  assert.equal(merged?.bonus_completed, true)
  assert.equal(merged?.bonus_reward, 'crown')
  assert.equal(merged?.drill_reps, 3)
  assert.equal(merged?.drill_chunk, 'target-chunk')

  const reset = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-202'`, [STUDENT_C])
  assert.equal(reset?.completed, false)
  assert.equal(reset?.stars, 0)
  assert.equal(reset?.runs, 0)
  assert.equal(reset?.bonus_completed, false)
  assert.equal(reset?.drill_reps, 0)

  const python = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'L0001'`, [STUDENT_D])
  assert.equal(python?.module_id, 'python')
  assert.equal(python?.completed, true)
  assert.equal(await scalar(db, `select count(*) n from public.learning_record lr
    where lr.module_id = 'blockly' and not exists (select 1 from public.module_level ml
      where ml.module_id = 'blockly' and ml.level_id = lr.level_id)`), 0)
})

test('旧版 80 关迁移已执行时重复执行不误伤新关卡和新进度', async (t) => {
  const db = await createFixture(true)
  t.after(async () => db.close())
  const oldL3 = await oneRow(db, `select * from public.module_level where level_id = 'blk-201'`)
  assert.equal(oldL3?.unit_id, 'blk-g2-spring-u1')
  assert.equal(await scalar(db, `select count(*) n from public.module_unit
    where module_id = 'blockly' and unit_id in ('blk-g2-spring-u1', 'blk-g2-spring-u1-legacy')`), 2)
  await applyMigration(db)

  assert.equal(await scalar(db, `select count(*) n from public.module_level
    where is_placeholder = true and (sort_order between 901 and 909 or sort_order between 941 and 955)`), 24)
  assert.equal(await scalar(db, `select count(*) n from public.module_unit
    where module_id = 'blockly' and unit_id like 'blk-g2-%'`), 14)

  await insertProgress(db, STUDENT_E, 'blk-201', { completed: true, stars: 3, changeDone: true, runs: 1 })
  const progressBefore = await db.query(`select student_id, level_id, module_id, completed, stars,
    change_done, error_taps, runs, bonus_completed, bonus_reward, drill_reps, drill_chunk, updated_at
    from public.learning_record order by student_id, level_id`)
  const countsBefore = await db.query(`select
    (select count(*) from public.module_level) n,
    (select count(*) from public.module_unit) n,
    (select count(*) from public.learning_record) n`)

  await applyMigration(db)

  const progressAfter = await db.query(`select student_id, level_id, module_id, completed, stars,
    change_done, error_taps, runs, bonus_completed, bonus_reward, drill_reps, drill_chunk, updated_at
    from public.learning_record order by student_id, level_id`)
  const countsAfter = await db.query(`select
    (select count(*) from public.module_level) n,
    (select count(*) from public.module_unit) n,
    (select count(*) from public.learning_record) n`)
  assert.deepEqual(progressAfter.rows, progressBefore.rows)
  assert.deepEqual(countsAfter.rows, countsBefore.rows)

  const current = await oneRow(db, `select * from public.module_level where level_id = 'blk-201'`)
  assert.equal(current?.body.schema_version, 2)
  assert.equal(current?.unit_id, 'blk-g2-fall-u2')
  assert.equal(current?.published, true)
  const archived = await oneRow(db, `select * from public.module_level where level_id = 'blk-961'`)
  assert.equal(archived?.body.marker, 'old-blk-201')
  assert.equal(archived?.published, false)

  const movedOldL2 = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-811'`, [STUDENT_A])
  assert.equal(movedOldL2?.completed, true)
  const movedOldL3 = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-961'`, [STUDENT_A])
  assert.equal(movedOldL3?.completed, true)
  assert.equal(await scalar(db, `select count(*) n from public.learning_record
    where student_id = $1 and level_id in ('blk-161', 'blk-201') and completed`, [STUDENT_A]), 0)

  const legacyProgress = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-817'`, [STUDENT_B])
  assert.equal(legacyProgress?.completed, true)
  assert.equal(legacyProgress?.stars, 2)
  assert.equal(await scalar(db, `select count(*) n from public.learning_record
    where student_id = $1 and level_id = 'blk-167' and completed`, [STUDENT_B]), 0)

  const newProgress = await oneRow(db, `select * from public.learning_record
    where student_id = $1 and level_id = 'blk-201'`, [STUDENT_E])
  assert.equal(newProgress?.completed, true)
  assert.equal(newProgress?.stars, 3)
  assert.equal(await scalar(db, `select count(*) n from public.learning_record
    where student_id = $1 and level_id = 'blk-961'`, [STUDENT_E]), 0)
})
