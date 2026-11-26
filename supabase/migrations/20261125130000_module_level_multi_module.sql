-- 多模块关卡落位：blockly / easy-robot 两条前置课程线，与 Python 的 course_level 物理隔离。
-- 本文件只改数据库结构，不写任何业务数据回填。
-- Neon 跨语句没有事务，某条失败时前面的已经生效、无法回滚，所以每条语句都写成幂等的，重跑即可。
--
-- 迁移前核对过的线上现状：
--   learning_record 的外键约束名是 learning_record_level_id_fkey，
--   定义为 FOREIGN KEY (level_id) REFERENCES course_level(level_id)；
--   主键是 learning_record_pkey = (student_id, level_id)，唯一索引也只有这一个；
--   learning_record 现有 5 行，level_id 全是 L01 这种旧格式，都在 course_level 里；
--   course_level 现有 960 行，sort_order 占满 1 到 960；
--   teaching_module 现有 python / matupix / arduino 三行；module_level 还不存在。
-- 下面删外键时仍然从 pg_constraint 查出来再删，不硬编码名字，避免环境差异。


-- 1. 新模块的关卡表
-- 只给 blockly / easy-robot 用，不复用 course_level 的任何外键：
-- 没有 unit_id、没有 stage_level、没有 level_type 枚举、没有学期 120 节上限触发器。
-- sort_order 只在模块内唯一（unique (module_id, sort_order)），不与 Python 的 1 到 960 抢号段。
create table if not exists public.module_level (
  module_id text not null references public.teaching_module (module_id),
  level_id text not null,
  sort_order integer not null,
  title text not null,
  goal text not null default '',
  body jsonb not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (module_id, level_id),
  unique (module_id, sort_order)
);

comment on table public.module_level is
  'blockly / easy-robot 两条前置课程线的关卡表，与 Python 的 course_level 物理隔离。module_id 指向 teaching_module；正文存在 body jsonb；sort_order 只在模块内唯一，不与 Python 的 1 到 960 共用号段。';

comment on column public.module_level.module_id is
  '所属模块，取值来自 public.teaching_module。python 走 course_level，blockly 与 easy-robot 走本表。';

comment on column public.module_level.level_id is
  '模块内关卡编号。与 course_level 的 L0001 形式互不相干，blockly 用 blk-001、easy-robot 用 robot-001 这类前缀即可。';

comment on column public.module_level.sort_order is
  '模块内课程序号，只在模块内唯一。与 course_level.sort_order 的全局唯一互不影响。';

comment on column public.module_level.body is
  '关卡正文 JSON，与 course_level.body 同形：teach_code_lines / challenge_params / quiz 等。';

comment on column public.module_level.published is
  '是否发布。未发布的关卡不进学生的课程地图，也不计入总关卡数。';

-- 关卡是内容数据，不物理删除，和 course_level、learning_record 的处理一致
drop trigger if exists module_level_no_delete on public.module_level;
create trigger module_level_no_delete
  before delete on public.module_level
  for each row execute function public.forbid_business_delete();

alter table public.module_level enable row level security;
revoke all on public.module_level from public, anon, authenticated;


-- 2. learning_record 加模块维度
-- 主键保持 (student_id, level_id) 不变：blockly 的 blk-001 和 Python 的 L0001 天然不撞，
-- 所以不需要把 module_id 塞进主键，也不需要建额外唯一约束，现有的 on conflict 目标继续可用。
-- 存量行靠 default 自动带 python，不写任何 update 回填语句。
alter table public.learning_record
  add column if not exists module_id text not null default 'python';

comment on column public.learning_record.module_id is
  '进度归属的模块。python 的存量数据全部是 python，blockly 与 easy-robot 写各自的模块号。level_id 不再限定在 course_level 里，所以这一列是唯一的模块判别依据。';

create index if not exists learning_record_student_module_idx
  on public.learning_record (student_id, module_id);


-- 3. 去掉 learning_record.level_id 到 course_level 的外键
-- 原因：blockly 与 easy-robot 的关卡在 module_level 里，不在 course_level 里，外键会挡住这两个模块写进度。
-- 注意：完整性从数据库层退到应用层，写入前要先查关卡存在。
-- Python 侧这条校验本来就有：resolveStoredLevel 先查 course_level，查不到就自动补建或返回失败，
-- 所以 Python 的写入路径不需要改。
-- 约束名不硬编码，从 pg_constraint 查出来再删；查不到就什么都不做，可重复执行。
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.learning_record'::regclass
      and con.contype = 'f'
      and con.confrelid = 'public.course_level'::regclass
      and pg_get_constraintdef(con.oid) like '%(level_id)%'
  loop
    execute format('alter table public.learning_record drop constraint %I', r.conname);
  end loop;
end;
$$;


-- 4. 模块清单补两行
-- org_entitlement.module_id 已经有外键指向 teaching_module，插完这两行，
-- 平台侧 set_org_module_enabled 就能直接给这两个模块开通，不需要再动 org_entitlement。
-- 两个模块都是整模块开关（level_based = false），所以 max_level 存 null。
-- 不动 python / matupix / arduino 三行。
insert into public.teaching_module (module_id, has_progress, level_based, status)
values
  ('blockly', true, false, 'active'),
  ('easy-robot', true, false, 'active')
on conflict (module_id) do nothing;


-- 验收 SQL（迁移后逐条跑）
--
-- A. 存量行都带上了模块号，没有 null
-- select count(*) from public.learning_record where module_id is null;
--
-- B. 进度按模块分组，当前只有 python 一组
-- select module_id, count(*) from public.learning_record group by module_id;
--
-- C. 新模块已在清单里登记
-- select module_id, has_progress, level_based, status
-- from public.teaching_module
-- where module_id in ('blockly', 'easy-robot')
-- order by module_id;
--
-- 附加 D. 外键确实已经摘掉，Python 的行还都在
-- select conname from pg_constraint where conrelid = 'public.learning_record'::regclass and contype = 'f';
