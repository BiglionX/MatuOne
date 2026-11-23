-- 模块化开通：org_entitlement 按 (org_id, module_id) 开通。
-- python 行保留 max_level；matupix 行存在且未 revoke 即开通。
-- 席位只留 org.seat_quota；开通撤销用 revoked_at 软关，不物理删除。
-- grant_opening_entitlement 仍只维护 level_entitlement，本文件不改它。

-- 重建表（无生产数据；旧行迁为 python，并为所有 org 补 matupix）
create table if not exists public.org_entitlement_modules_next (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  module_id text not null check (module_id in ('python', 'matupix')),
  max_level integer check (max_level is null or max_level between 1 and 8),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (org_id, module_id),
  check (
    (module_id = 'python' and max_level is not null)
    or (module_id <> 'python')
  )
);

-- 旧表若仍是一机构一行（无 module_id），迁为 python；已有 module_id 则原样拷贝。
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'org_entitlement'
      and column_name = 'module_id'
  ) then
    insert into public.org_entitlement_modules_next (
      id, org_id, module_id, max_level, valid_until, created_at, revoked_at
    )
    select
      e.id,
      e.org_id,
      e.module_id,
      e.max_level,
      e.valid_until,
      e.created_at,
      e.revoked_at
    from public.org_entitlement e
    on conflict (org_id, module_id) do nothing;
  else
    insert into public.org_entitlement_modules_next (
      id, org_id, module_id, max_level, valid_until, created_at
    )
    select
      e.id,
      e.org_id,
      'python',
      e.max_level,
      e.valid_until,
      e.created_at
    from public.org_entitlement e
    on conflict (org_id, module_id) do nothing;
  end if;
end $$;

drop trigger if exists org_entitlement_no_delete on public.org_entitlement;
drop table if exists public.org_entitlement;
alter table public.org_entitlement_modules_next rename to org_entitlement;

comment on table public.org_entitlement is
  '机构模块开通。python 用 max_level 控制课程阶段；matupix 有行且 revoked_at 为空即开通。席位在 org.seat_quota。';

comment on column public.org_entitlement.module_id is '教学模块：python | matupix';
comment on column public.org_entitlement.revoked_at is '软关时间；非空表示已撤销开通，不物理删除。';

-- 所有机构补 matupix 默认开通行（本阶段默认开通；valid_until 为空=长期，靠 revoked_at 软关）
insert into public.org_entitlement (org_id, module_id, max_level, valid_until)
select
  o.id,
  'matupix',
  null,
  null
from public.org o
where not exists (
  select 1 from public.org_entitlement e
  where e.org_id = o.id and e.module_id = 'matupix'
);

-- 无 python 行的机构也补上（与旧 trigger 默认 max_level=4 对齐）
insert into public.org_entitlement (org_id, module_id, max_level, valid_until)
select
  o.id,
  'python',
  4,
  coalesce(o.service_end_at, o.trial_expire_at)
from public.org o
where not exists (
  select 1 from public.org_entitlement e
  where e.org_id = o.id and e.module_id = 'python'
);

create or replace function public.grant_org_course_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_entitlement (org_id, module_id, max_level, valid_until)
  values (
    new.id,
    'python',
    4,
    coalesce(new.service_end_at, new.trial_expire_at)
  )
  on conflict (org_id, module_id) do nothing;

  insert into public.org_entitlement (org_id, module_id, max_level, valid_until)
  values (
    new.id,
    'matupix',
    null,
    null
  )
  on conflict (org_id, module_id) do nothing;

  return new;
end;
$$;

drop trigger if exists org_grant_course_entitlement on public.org;
create trigger org_grant_course_entitlement
  after insert on public.org
  for each row execute function public.grant_org_course_entitlement();

drop trigger if exists org_entitlement_no_delete on public.org_entitlement;
create trigger org_entitlement_no_delete before delete on public.org_entitlement
  for each row execute function public.forbid_business_delete();

alter table public.org_entitlement enable row level security;
revoke all on public.org_entitlement from public, anon, authenticated;
revoke all on function public.grant_org_course_entitlement() from public, anon, authenticated;

-- 读 max_level 的 SQL 函数必须限定 module_id = 'python'
create or replace function public.org_platform_levels_for_org(p_org_id uuid)
returns table (
  level_id text,
  sort_order integer,
  title text,
  stage_level integer,
  unit_id text,
  unit_title text,
  unit_sort integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
  v_max integer;
begin
  select public.effective_org_status(o.status, o.trial_expire_at, o.service_end_at)
    into v_status
  from public.org o
  where o.id = p_org_id;
  if v_status is null or v_status = 'disabled' then
    return;
  end if;

  select case
    when e.max_level is null then 0
    when e.revoked_at is not null then 0
    when e.valid_until is not null and e.valid_until <= now() then 0
    else e.max_level
  end into v_max
  from public.org_entitlement e
  where e.org_id = p_org_id
    and e.module_id = 'python'
    and e.revoked_at is null;
  v_max := coalesce(v_max, 0);

  return query
  select cl.level_id, cl.sort_order, cl.title, cl.stage_level, cl.unit_id, u.title, u.sort_order
  from public.course_level cl
  join public.curriculum_unit u on u.unit_id = cl.unit_id
  where cl.published = true
    and (
      (v_status in ('trial', 'active') and cl.stage_level = 1 and cl.sort_order between 1 and 120)
      or (v_status <> 'trial' and v_max >= 1 and cl.stage_level <= v_max)
    )
  order by cl.sort_order;
end;
$$;

create or replace function public.save_org_custom_course(
  p_org_id uuid,
  p_course_id uuid,
  p_title text,
  p_sections jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_max integer;
  v_title text;
  v_count integer;
  v_item jsonb;
  v_type text;
  v_level text;
  v_material uuid;
  v_level_title text;
  v_level_order integer;
  v_stage integer;
  v_material_name text;
  v_order integer := 0;
  v_created timestamptz;
  v_sections jsonb;
  v_level1 boolean;
begin
  if p_sections is null or jsonb_typeof(p_sections) <> 'array' then
    raise exception '课程环节格式不正确';
  end if;
  v_count := jsonb_array_length(p_sections);
  if v_count > 200 then
    raise exception '一门课程最多 200 个环节';
  end if;
  v_title := btrim(coalesce(p_title, ''));
  if char_length(v_title) < 1 or char_length(v_title) > 80 then
    raise exception '课程名称需要 1–80 个字';
  end if;

  if not exists (
    select 1 from public.org_custom_course c
    where c.id = p_course_id and c.org_id = p_org_id and c.removed_at is null
  ) then
    raise exception '课程不存在';
  end if;

  select public.effective_org_status(o.status, o.trial_expire_at, o.service_end_at)
    into v_status
  from public.org o
  where o.id = p_org_id;
  if v_status = 'disabled' then
    raise exception '机构已停用';
  end if;
  if v_status = 'expired' then
    raise exception '服务已到期，仅可查看';
  end if;

  select case
    when e.max_level is null then 0
    when e.revoked_at is not null then 0
    when e.valid_until is not null and e.valid_until <= now() then 0
    else e.max_level
  end into v_max
  from public.org_entitlement e
  where e.org_id = p_org_id
    and e.module_id = 'python'
    and e.revoked_at is null;
  v_max := coalesce(v_max, 0);

  update public.org_custom_course set title = v_title where id = p_course_id;
  update public.org_custom_section
  set removed_at = now()
  where course_id = p_course_id and removed_at is null;

  for v_item in select jsonb_array_elements(p_sections)
  loop
    v_order := v_order + 1;
    v_type := v_item->>'type';
    if v_type = 'platform_level' then
      v_level := btrim(coalesce(v_item->>'platformLevelId', ''));
      v_level_title := null;
      v_level_order := null;
      v_stage := null;
      select cl.title, cl.sort_order, cl.stage_level
        into v_level_title, v_level_order, v_stage
      from public.course_level cl
      where cl.level_id = v_level and cl.published = true;
      if v_level_title is null then
        raise exception '关卡不存在';
      end if;
      v_level1 := v_stage = 1 and v_level_order between 1 and 120;
      if v_status = 'trial' and not coalesce(v_level1, false) then
        raise exception '试用机构只能使用 Level 1';
      end if;
      if not coalesce(v_level1, false) and (v_stage is null or v_stage > v_max) then
        raise exception '这关尚未授权';
      end if;
      insert into public.org_custom_section (course_id, "order", type, platform_level_id, title)
      values (p_course_id, v_order, 'platform_level', v_level, v_level_title);
    elsif v_type = 'material' then
      begin
        v_material := nullif(btrim(coalesce(v_item->>'materialId', '')), '')::uuid;
      exception
        when invalid_text_representation then
          raise exception '素材不属于本机构';
      end;
      v_material_name := null;
      select m.name into v_material_name
      from public.org_material m
      where m.id = v_material and m.org_id = p_org_id and m.removed_at is null;
      if v_material_name is null then
        raise exception '素材不属于本机构';
      end if;
      insert into public.org_custom_section (course_id, "order", type, material_id, title)
      values (p_course_id, v_order, 'material', v_material, v_material_name);
    else
      raise exception '环节类型不正确';
    end if;
  end loop;

  select c.created_at into v_created from public.org_custom_course c where c.id = p_course_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'courseId', s.course_id,
    'order', s."order",
    'type', s.type,
    'platformLevelId', s.platform_level_id,
    'materialId', s.material_id,
    'title', s.title
  ) order by s."order"), '[]'::jsonb)
  into v_sections
  from public.org_custom_section s
  where s.course_id = p_course_id and s.removed_at is null;

  return jsonb_build_object(
    'id', p_course_id,
    'title', v_title,
    'createdAt', v_created,
    'sections', v_sections
  );
end;
$$;

revoke all on function public.org_platform_levels_for_org(uuid) from public, anon, authenticated;
revoke all on function public.save_org_custom_course(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.org_platform_levels_for_org(uuid) to service_role;
grant execute on function public.save_org_custom_course(uuid, uuid, text, jsonb) to service_role;
