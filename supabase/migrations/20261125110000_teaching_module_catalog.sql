-- 模块清单入库：把 org_entitlement.module_id 上写死的 check ('python','matupix')
-- 换成引用 teaching_module 表；阶段上限规则也改为按「该模块是否按阶段授权」判定。
-- 新增模块时：代码改 MODULE_REGISTRY，本文件插一行 teaching_module。

create table if not exists public.teaching_module (
  module_id text primary key,
  has_progress boolean not null default true,
  /** 按课程阶段授权的模块（如 python）：必须带 max_level。 */
  level_based boolean not null default false,
  status text not null default 'active' check (status in ('active', 'coming_soon')),
  created_at timestamptz not null default now()
);

comment on table public.teaching_module is
  '教学模块清单，与代码里的 MODULE_REGISTRY 对齐；org_entitlement.module_id 引用它。新增模块时同步这张表。';

insert into public.teaching_module (module_id, has_progress, level_based, status)
values
  ('matupix', true, false, 'active'),
  ('python', true, true, 'active'),
  ('arduino', false, false, 'coming_soon')
on conflict (module_id) do update
set has_progress = excluded.has_progress,
    level_based = excluded.level_based,
    status = excluded.status;

-- 去掉写死模块名的 CHECK 约束（module_id 白名单 + python 必须带 max_level）
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.org_entitlement'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%module_id%'
  loop
    execute format('alter table public.org_entitlement drop constraint %I', r.conname);
  end loop;
end $$;

-- 重跑友好：先删再加。否则第二次执行会因为约束已存在而报错，迁移就不是幂等的。
alter table public.org_entitlement drop constraint if exists org_entitlement_module_id_fkey;
alter table public.org_entitlement add constraint org_entitlement_module_id_fkey
  foreign key (module_id) references public.teaching_module (module_id);

comment on constraint org_entitlement_module_id_fkey on public.org_entitlement is
  '模块必须在 teaching_module 里登记；新增模块时同步该表。';

-- 阶段上限规则改为按清单判定：按阶段授权的模块必须带 max_level
create or replace function public.guard_org_entitlement_module()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level_based boolean;
begin
  select tm.level_based into v_level_based
  from public.teaching_module tm
  where tm.module_id = new.module_id;
  if v_level_based is null then
    raise exception '模块未登记：%', new.module_id;
  end if;
  if v_level_based and new.max_level is null then
    raise exception '该模块需要阶段上限';
  end if;
  return new;
end;
$$;

drop trigger if exists org_entitlement_module_guard on public.org_entitlement;
create trigger org_entitlement_module_guard
  before insert or update on public.org_entitlement
  for each row execute function public.guard_org_entitlement_module();

alter table public.teaching_module enable row level security;
revoke all on public.teaching_module from public, anon, authenticated;
revoke all on function public.guard_org_entitlement_module() from public, anon, authenticated;
