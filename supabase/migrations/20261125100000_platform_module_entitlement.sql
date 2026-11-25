-- 平台侧模块出口：运营后台能看机构已开通模块，并调整课程阶段上限 / 软关模块。
-- 撤销开通仍用 revoked_at 软关，不物理删除；每次调整写 provision_log 留痕。
-- 阶段上限只对「按阶段授权」的模块有效（该行 max_level 非空），不在此硬编码模块名。

-- 开通记录的动作扩展：模块相关调整也要进开通记录
alter table public.provision_log drop constraint if exists provision_log_action_check;
alter table public.provision_log add constraint provision_log_action_check
  check (action in ('开户', '续费', '停用', '恢复', '模块调整', '模块开关'));

comment on column public.provision_log.action is '动作：开户 | 续费 | 停用 | 恢复 | 模块调整 | 模块开关';

-- 平台调整某模块的阶段上限（课程阶段数）
create or replace function public.set_org_module_level(
  p_org_id uuid,
  p_module_id text,
  p_max_level integer,
  p_staff_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
  v_previous integer;
begin
  if p_staff_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_staff
  from public.platform_staff
  where id = p_staff_id and role = 'ops' and status = 'active';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_module_id is null or btrim(p_module_id) = '' then
    raise exception '请选择模块';
  end if;
  if p_max_level is null or p_max_level < 1 or p_max_level > 8 then
    raise exception '阶段上限需要在 1–8 之间';
  end if;
  if not exists (select 1 from public.org where id = p_org_id) then
    raise exception '机构不存在';
  end if;

  select e.max_level into v_previous
  from public.org_entitlement e
  where e.org_id = p_org_id and e.module_id = p_module_id;
  if not found then
    raise exception '该机构未开通这个模块';
  end if;
  if v_previous is null then
    raise exception '该模块没有阶段上限';
  end if;

  update public.org_entitlement
  set max_level = p_max_level
  where org_id = p_org_id and module_id = p_module_id;

  insert into public.provision_log (org_id, action, operator, operator_id, detail)
  values (
    p_org_id,
    '模块调整',
    v_staff.display_name,
    v_staff.id,
    jsonb_build_object(
      'moduleId', p_module_id,
      'maxLevel', p_max_level,
      'previousMaxLevel', v_previous
    )
  );
end;
$$;

-- 平台软关 / 重开某模块（revoked_at）
create or replace function public.set_org_module_revoked(
  p_org_id uuid,
  p_module_id text,
  p_revoked boolean,
  p_staff_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
begin
  if p_staff_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_staff
  from public.platform_staff
  where id = p_staff_id and role = 'ops' and status = 'active';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_module_id is null or btrim(p_module_id) = '' then
    raise exception '请选择模块';
  end if;
  if not exists (select 1 from public.org where id = p_org_id) then
    raise exception '机构不存在';
  end if;
  if not exists (
    select 1 from public.org_entitlement
    where org_id = p_org_id and module_id = p_module_id
  ) then
    raise exception '该机构未开通这个模块';
  end if;

  if p_revoked then
    update public.org_entitlement
    set revoked_at = now()
    where org_id = p_org_id and module_id = p_module_id and revoked_at is null;
    if not found then
      raise exception '该模块已经关闭';
    end if;
  else
    update public.org_entitlement
    set revoked_at = null
    where org_id = p_org_id and module_id = p_module_id and revoked_at is not null;
    if not found then
      raise exception '该模块已经开通';
    end if;
  end if;

  insert into public.provision_log (org_id, action, operator, operator_id, detail)
  values (
    p_org_id,
    '模块开关',
    v_staff.display_name,
    v_staff.id,
    jsonb_build_object('moduleId', p_module_id, 'revoked', p_revoked)
  );
end;
$$;

revoke all on function public.set_org_module_level(uuid, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.set_org_module_revoked(uuid, text, boolean, uuid) from public, anon, authenticated;
grant execute on function public.set_org_module_level(uuid, text, integer, uuid) to service_role;
grant execute on function public.set_org_module_revoked(uuid, text, boolean, uuid) to service_role;
