-- module_level 补上课程层级与课时元数据列。
--
-- 加列顺序：
--   term_id / unit_id   学期与单元的外键，指向 20261126100000 建的 module_term / module_unit。
--                       允许为 null：easy-robot 的 robot-001 还没排期，blockly 存量行在后面的迁移里补齐。
--   scene_type          单关的运行形态，grid / stage。必须与 body.scene_type 一致。
--   level_type          课型，与 Python 侧 course_level.level_type 同口径。
--   knowledge_tags      知识点标签。
--   milestone_badge     里程碑徽章，null 表示不颁发。
--   estimated_minutes   建议课时分钟数。
--   is_placeholder      占位关标记。存量的 blk-001 有真实正文，其余（robot-001 等）保持占位。
--
-- sort_order 语义不变：module 内唯一，全课程线性排 1 到 N。
--
-- Neon 跨语句没有事务，每条语句都写成幂等的，重跑即可。
-- 约束统一先 drop 再 add，保证重复执行不报错。


alter table public.module_level
  add column if not exists term_id text,
  add column if not exists unit_id text,
  add column if not exists scene_type text not null default 'grid',
  add column if not exists level_type text not null default 'new',
  add column if not exists knowledge_tags text[] not null default '{}',
  add column if not exists milestone_badge text,
  add column if not exists estimated_minutes integer,
  add column if not exists is_placeholder boolean not null default true;

comment on column public.module_level.term_id is
  '所属学期，组合外键 (module_id, term_id) 指向 module_term。null 表示尚未排期。';

comment on column public.module_level.unit_id is
  '所属单元，组合外键 (module_id, unit_id) 指向 module_unit。null 表示尚未排期。';

comment on column public.module_level.scene_type is
  '单关的运行形态：grid 网格闯关 / stage 自由舞台。必须与 body.scene_type 保持一致，运行时以 body 为准。';

comment on column public.module_level.level_type is
  '课型：new 新授，practice 练习，project 项目，typing 打字。与 Python 侧 course_level.level_type 同口径，两边不要混用。';

comment on column public.module_level.knowledge_tags is
  '这一关覆盖的知识点，例如 {"loop"}、{"condition"}。';

comment on column public.module_level.milestone_badge is
  '完成本关要颁发的里程碑徽章标识。null 表示不颁发。';

comment on column public.module_level.estimated_minutes is
  '建议课时分钟数，null 表示未填写。';

comment on column public.module_level.is_placeholder is
  '是否为占位关。true 表示正文还是占位骨架，页面显示「内容制作中」；写好正文后改成 false。';


-- 约束：先删再加，重复执行不报错
alter table public.module_level drop constraint if exists module_level_term_fk;
alter table public.module_level add constraint module_level_term_fk
  foreign key (module_id, term_id) references public.module_term (module_id, term_id);

alter table public.module_level drop constraint if exists module_level_unit_fk;
alter table public.module_level add constraint module_level_unit_fk
  foreign key (module_id, unit_id) references public.module_unit (module_id, unit_id);

alter table public.module_level drop constraint if exists module_level_scene_type_chk;
alter table public.module_level add constraint module_level_scene_type_chk
  check (scene_type in ('grid', 'stage'));

alter table public.module_level drop constraint if exists module_level_level_type_chk;
alter table public.module_level add constraint module_level_level_type_chk
  check (level_type in ('new', 'practice', 'project', 'typing'));

alter table public.module_level drop constraint if exists module_level_estimated_minutes_chk;
alter table public.module_level add constraint module_level_estimated_minutes_chk
  check (estimated_minutes is null or estimated_minutes > 0);


-- 存量行：blk-001 已有真实正文，不再是占位；其余模块保持占位。
-- 只动非 blockly 的行，重跑本迁移不会把后来写好正文的 blockly 关卡打回占位。
-- term_id / unit_id 留空，等 20261126120000 写完大纲后由那批数据补齐。
update public.module_level
set is_placeholder = false
where module_id = 'blockly' and level_id = 'blk-001';

update public.module_level
set is_placeholder = true
where module_id <> 'blockly';


-- 验收 SQL（迁移后逐条跑）
--
-- A. 八列都在，类型与默认值正确
-- select column_name, data_type, column_default, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'module_level'
--   and column_name in ('term_id','unit_id','scene_type','level_type',
--                       'knowledge_tags','milestone_badge','estimated_minutes','is_placeholder')
-- order by column_name;
--
-- B. 存量行没有被外键挡住，层级字段暂时为空
-- select module_id, level_id, term_id, unit_id, scene_type, level_type, is_placeholder
-- from public.module_level order by module_id, level_id;
--
-- C. 约束都在
-- select conname from pg_constraint
-- where conrelid = 'public.module_level'::regclass and contype in ('c','f')
-- order by conname;
