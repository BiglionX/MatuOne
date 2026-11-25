-- 平台侧首次开通模块：机构还没有开通行时也能开通；开通 / 重开 / 关闭统一走这一个入口。
-- 模块必须已在 teaching_module 登记；筹备中（coming_soon）的模块不给开通。
-- 每次调整写 provision_log 留痕，detail 只记模块与状态，不含密码。

-- 首次开通单独记一类，便于区分「从没开过」和「关过又开」
alter table public.provision_log drop constraint if exists provision_log_action_check;
alter table public.provision_log add constraint provision_log_action_check
  check (action in ('开户', '续费', '停用', '恢复', '模块调整', '模块开关', '模块开通'));

comment on column public.provision_log.action is '动作：开户 | 续费 | 停用 | 恢复 | 模块调整 | 模块开关 | 模块开通';

-- 平台开关某模块的开通状态
-- p_enabled = true：没有开通行就新建，有则重开并按模块清单刷新阶段上限与有效期
-- p_enabled = false：软关（写 revoked_at），不物理删除
create or replace function public.set_org_module_enabled(
  p_org_id uuid,
  p_module_id text,
  p_enabled boolean,
  p_max_level integer,
  p_valid_until timestamptz,
  p_staff_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
  v_module record;
  v_existing public.org_entitlement%rowtype;
  v_first_grant boolean;
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

  select tm.module_id, tm.level_based, tm.status into v_module
  from public.teaching_module tm
  where tm.module_id = p_module_id;
  if not found then
    raise exception '模块未登记：%', p_module_id;
  end if;
  if v_module.status <> 'active' then
    raise exception '该模块还在筹备中，暂不能开通';
  end if;
  if v_module.level_based and (p_max_level is null or p_max_level < 1 or p_max_level > 8) then
    raise exception '阶段上限需要在 1–8 之间';
  end if;

  select * into v_existing
  from public.org_entitlement
  where org_id = p_org_id and module_id = p_module_id;
  v_first_grant := v_existing.id is null;

  if p_enabled then
    if v_first_grant then
      insert into public.org_entitlement (org_id, module_id, max_level, valid_until)
      values (
        p_org_id,
        p_module_id,
        case when v_module.level_based then p_max_level else null end,
        p_valid_until
      );
    else
      update public.org_entitlement
      set revoked_at = null,
          max_level = case when v_module.level_based then p_max_level else null end,
          valid_until = p_valid_until
      where id = v_existing.id;
    end if;
  else
    if v_first_grant then
      raise exception '该机构未开通这个模块';
    end if;
    -- 关闭时仍然刷新阶段上限与有效期（预置下次打开时的上限），
    -- revoked_at 用 coalesce 保持幂等：已关闭的模块再关一次不会改时间戳。
    update public.org_entitlement
    set max_level = case when v_module.level_based then p_max_level else null end,
        valid_until = p_valid_until,
        revoked_at = coalesce(revoked_at, now())
    where id = v_existing.id;
  end if;

  insert into public.provision_log (org_id, action, operator, operator_id, detail)
  values (
    p_org_id,
    case when v_first_grant then '模块开通' else '模块开关' end,
    v_staff.display_name,
    v_staff.id,
    jsonb_build_object(
      'moduleId', p_module_id,
      'enabled', p_enabled,
      'maxLevel', case when v_module.level_based then p_max_level else null end
    )
  );
end;
$$;

revoke all on function public.set_org_module_enabled(uuid, text, boolean, integer, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.set_org_module_enabled(uuid, text, boolean, integer, timestamptz, uuid) to service_role;