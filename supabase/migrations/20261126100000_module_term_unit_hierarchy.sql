-- Blockly 两年期课程线的层级骨架：学期（Term）→ 单元（Unit）。
--
-- 为什么新建表而不是复用 curriculum_stage / curriculum_semester / curriculum_unit：
--   1. 那三张表属于 Python 课程线，course_level.unit_id 外键指向 curriculum_unit(unit_id)；
--      20261114000000 已把 curriculum_semester.title 改写成 "Level 1 / Level 2"，
--      语义是课程序列号，不是学校年级。
--   2. curriculum_semester 上有 unique (stage_id, term)，一个年级段只允许一个 fall / 一个 spring，
--      装不下 Blockly 需要的「一上 / 一下 / 二上 / 二下」四条并列学期。
--   3. 项目已定调：新模块与 Python 物理隔离 + module_id 隔离（module_level 表就是这么来的）。
--      这里沿用同一思路：新表一律带 module_id，不碰 Python 的外键。
--
-- Neon 跨语句没有事务，某条失败时前面的已经生效、无法回滚，所以每条语句都写成幂等的，重跑即可。
-- 本文件只建结构，不写业务数据；数据在 20261126120000_blockly_curriculum_outline.sql。


-- 1. 学期：一个模块课程线下的一个学期
create table if not exists public.module_term (
  module_id text not null references public.teaching_module (module_id),
  term_id text not null,
  /** 展示名，例如「一年级上」。 */
  title text not null,
  /** 学段名，例如「一年级」。 */
  stage_label text not null,
  /** 季节：fall 秋季学期 / spring 春季学期。 */
  term_code text not null check (term_code in ('fall', 'spring')),
  /** 课程线内线性序号，从 1 开始。 */
  sort_order integer not null,
  /** 周数，默认 15。 */
  weeks integer not null default 15,
  /** 本学期最多容纳的课时数。 */
  level_cap integer not null default 15,
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (module_id, term_id),
  unique (module_id, sort_order),
  check (sort_order > 0),
  check (weeks > 0),
  check (level_cap > 0)
);

comment on table public.module_term is
  '模块课程线的学期表。与 Python 的 curriculum_semester 物理隔离：一行是「某模块的某个学期」，例如 blockly 的「一年级上」。';

comment on column public.module_term.module_id is
  '所属模块，取值来自 public.teaching_module。blockly 用它区分于 python 与 easy-robot。';

comment on column public.module_term.term_id is
  '模块内学期编号，约定 blk-g1-fall / blk-g1-spring / blk-g2-fall / blk-g2-spring。';

comment on column public.module_term.title is
  '学期展示名，例如「一年级上」。';

comment on column public.module_term.stage_label is
  '学段展示名，例如「一年级」。';

comment on column public.module_term.term_code is
  '季节：fall / spring。用于按上下学期排序展示。';

comment on column public.module_term.sort_order is
  '课程线内线性序号，只在 module_id 内唯一。';

comment on column public.module_term.weeks is
  '本学期的教学周数，默认 15。';

comment on column public.module_term.level_cap is
  '本学期最多容纳的课时数，用于硬上限校验。';


-- 2. 单元：一个学期里的一个模块
create table if not exists public.module_unit (
  module_id text not null references public.teaching_module (module_id),
  unit_id text not null,
  term_id text not null,
  title text not null,
  summary text not null default '',
  /** 单元的整体形态：grid 网格闯关 / grid_interactive 带交互网格 / stage 舞台游戏。 */
  scene_form text not null default 'grid' check (scene_form in ('grid', 'grid_interactive', 'stage')),
  /** 单元覆盖的知识点标签。 */
  knowledge_tags text[] not null default '{}',
  /** 本单元最多容纳的课时数。 */
  level_cap integer not null default 15,
  /** 学期内线性序号，从 1 开始。 */
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (module_id, unit_id),
  unique (module_id, term_id, sort_order),
  foreign key (module_id, term_id)
    references public.module_term (module_id, term_id),
  check (sort_order > 0),
  check (level_cap > 0)
);

comment on table public.module_unit is
  '模块课程线的单元表。挂在 module_term 下面，一行是「某学期的一个模块」，例如「循环入门」。';

comment on column public.module_unit.unit_id is
  '模块内单元编号，约定 {term_id}-u{n}，例如 blk-g1-fall-u3。';

comment on column public.module_unit.term_id is
  '所属学期，组合外键 (module_id, term_id) 指向 module_term。';

comment on column public.module_unit.scene_form is
  '单元形态：grid 纯网格闯关 / grid_interactive 带一点交互的网格 / stage 自由舞台。给课程地图展示用，单关的运行形态看 module_level.scene_type 与 body.scene_type。';

comment on column public.module_unit.knowledge_tags is
  '单元覆盖的知识点，例如 {"loop", "nested_loop"}。';


-- 3. 内容数据不物理删除，和 course_level / learning_record / curriculum_* 的处理一致
drop trigger if exists module_term_no_delete on public.module_term;
create trigger module_term_no_delete
  before delete on public.module_term
  for each row execute function public.forbid_business_delete();

drop trigger if exists module_unit_no_delete on public.module_unit;
create trigger module_unit_no_delete
  before delete on public.module_unit
  for each row execute function public.forbid_business_delete();


-- 4. 权限：这两张表只经服务端函数访问，前端不直连
alter table public.module_term enable row level security;
alter table public.module_unit enable row level security;
revoke all on public.module_term from public, anon, authenticated;
revoke all on public.module_unit from public, anon, authenticated;


-- 验收 SQL（迁移后逐条跑）
--
-- A. 两张表建好
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name in ('module_term','module_unit');
--
-- B. 空表，学期与单元都还没写数据
-- select count(*) from public.module_term;
-- select count(*) from public.module_unit;
--
-- C. 触发器已挂上（内容数据禁止物理删除）
-- select tgname from pg_trigger
-- where tgrelid in ('public.module_term'::regclass, 'public.module_unit'::regclass)
--   and not tgisinternal;
