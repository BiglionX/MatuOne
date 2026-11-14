-- 区域服务商登录账号。agent_id 只从登录会话回填，不接受前端传入。

create table if not exists public.agent_admin (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.agent (id),
  account text not null unique,
  password_hash text not null,
  auth_user_id uuid unique,
  status text not null default 'active' check (status in ('active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agent_admin_hash_only check (password_hash like 'pbkdf2-sha256$%')
);

comment on table public.agent_admin is '区域服务商登录账号。一户一个账号，不物理删除。';

drop trigger if exists agent_admin_no_delete on public.agent_admin;
create trigger agent_admin_no_delete before delete on public.agent_admin
  for each row execute function public.forbid_business_delete();

alter table public.agent_admin enable row level security;
revoke all on public.agent_admin from public, anon, authenticated;

update public.agent set name = '华东区域服务商' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' and name = '华东代理';
update public.agent set name = '西南区域服务商' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' and name = '西南代理';

insert into public.agent_admin (id, agent_id, account, password_hash, status)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'partner0001@daima-chuangguan.local',
  'pbkdf2-sha256$100000$a2d28eade32ec239f9921e8b4cd44795$0e5f0557d0d22c5b67059566fb7833a06bc7ea60d5bbd4785c199df535dae310',
  'active'
)
on conflict (agent_id) do nothing;

create or replace function public.agent_login_lookup(p_account text)
returns table (
  admin_id uuid,
  password_hash text,
  agent_id uuid,
  agent_name text,
  region text,
  agent_status text
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.password_hash, g.id, g.name, g.region, g.status
  from public.agent_admin a
  join public.agent g on g.id = a.agent_id
  where a.account = p_account
    and a.status = 'active'
$$;

create or replace function public.mark_agent_admin_login(p_admin_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.agent_admin
    set last_login_at = now()
    where id = p_admin_id
      and status = 'active'
$$;

create or replace function public.attach_agent_admin_auth(p_admin_id uuid, p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agent_admin
    set auth_user_id = p_auth_user_id
    where id = p_admin_id
      and (auth_user_id is null or auth_user_id = p_auth_user_id);
end;
$$;

create or replace function public.issue_agent_account(
  p_staff_id uuid,
  p_agent_id uuid,
  p_password_hash text
) returns table (admin_id uuid, account text, reset boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
  v_agent public.agent%rowtype;
  v_admin public.agent_admin%rowtype;
  v_seq integer;
  v_account text;
begin
  select * into v_staff from public.platform_staff
  where id = p_staff_id and role = 'ops' and status = 'active';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_password_hash is null or p_password_hash not like 'pbkdf2-sha256$%' or char_length(p_password_hash) < 40 then
    raise exception '密码哈希无效';
  end if;
  select * into v_agent from public.agent where id = p_agent_id;
  if not found then
    raise exception '区域服务商不存在';
  end if;
  if v_agent.status <> 'active' then
    raise exception '区域服务商已停用';
  end if;

  select * into v_admin from public.agent_admin where agent_id = p_agent_id;
  if found then
    update public.agent_admin
      set password_hash = p_password_hash,
          status = 'active'
      where id = v_admin.id;
    admin_id := v_admin.id;
    account := v_admin.account;
    reset := true;
    return next;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext('issue_agent_account'));
  select coalesce(max((substring(a.account from '^partner([0-9]+)@'))::integer), 0) + 1
    into v_seq
  from public.agent_admin a
  where a.account ~ '^partner[0-9]+@daima-chuangguan\.local$';
  v_account := 'partner' || lpad(v_seq::text, 4, '0') || '@daima-chuangguan.local';

  insert into public.agent_admin (agent_id, account, password_hash, status)
  values (p_agent_id, v_account, p_password_hash, 'active')
  returning id into admin_id;
  account := v_account;
  reset := false;
  return next;
end;
$$;

create or replace function public.agent_home(p_admin_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin public.agent_admin%rowtype;
  v_agent public.agent%rowtype;
begin
  select * into v_admin from public.agent_admin where id = p_admin_id and status = 'active';
  if not found then
    raise exception '未登录' using errcode = '42501';
  end if;
  select * into v_agent from public.agent where id = v_admin.agent_id;
  if not found or v_agent.status <> 'active' then
    raise exception '区域服务商已停用，无法登录';
  end if;

  return jsonb_build_object(
    'agentName', v_agent.name,
    'region', v_agent.region,
    'account', v_admin.account,
    'orgCount', (
      select count(*)::integer from public.agent_org ao where ao.agent_id = v_agent.id
    ),
    'seatFeeTotal', coalesce((
      select sum(b.amount)::integer
      from public.agent_org ao
      join public.billing_record b on b.org_id = ao.org_id
      where ao.agent_id = v_agent.id
        and b.type in ('新购', '续费', '扩容')
    ), 0),
    'commissionDue', coalesce((
      select sum(coalesce(c.commission_amount, c.amount))::integer
      from public.commission_log c
      where c.agent_id = v_agent.id
        and c.settle_type = 'seat_fee_rebate'
        and c.status = 'pending'
    ), 0),
    'commissionSettled', coalesce((
      select sum(coalesce(c.commission_amount, c.amount))::integer
      from public.commission_log c
      where c.agent_id = v_agent.id
        and c.settle_type = 'seat_fee_rebate'
        and c.status = 'settled'
    ), 0),
    'orgs', coalesce((
      select jsonb_agg(item order by org_no)
      from (
        select o.org_no, jsonb_build_object(
          'orgNo', o.org_no,
          'name', o.name,
          'status', o.status,
          'seatQuota', o.seat_quota
        ) as item
        from public.agent_org ao
        join public.org o on o.id = ao.org_id
        where ao.agent_id = v_agent.id
      ) listed
    ), '[]'::jsonb),
    'records', coalesce((
      select jsonb_agg(item order by created_at desc)
      from (
        select c.created_at, jsonb_build_object(
          'orgName', o.name,
          'baseAmount', c.base_amount,
          'commissionAmount', coalesce(c.commission_amount, c.amount),
          'status', c.status,
          'createdAt', c.created_at
        ) as item
        from public.commission_log c
        join public.org o on o.id = c.org_id
        where c.agent_id = v_agent.id
          and c.settle_type = 'seat_fee_rebate'
        order by c.created_at desc
        limit 20
      ) listed
    ), '[]'::jsonb)
  );
end;
$$;

drop function if exists public.list_agent_commissions();

create function public.list_agent_commissions()
returns table (
  agent_id uuid,
  agent_name text,
  org_count integer,
  seat_fee_total integer,
  rebate_due integer,
  platform_net integer,
  account text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.name,
    count(ao.org_id)::integer,
    coalesce((
      select sum(b.amount)::integer
      from public.agent_org link
      join public.billing_record b on b.org_id = link.org_id
      where link.agent_id = a.id
        and b.type in ('新购', '续费', '扩容')
    ), 0),
    coalesce((
      select sum(coalesce(c.commission_amount, c.amount))::integer
      from public.commission_log c
      where c.agent_id = a.id
        and c.settle_type = 'seat_fee_rebate'
    ), 0),
    coalesce((
      select sum(b.amount)::integer
      from public.agent_org link
      join public.billing_record b on b.org_id = link.org_id
      where link.agent_id = a.id
        and b.type in ('新购', '续费', '扩容')
    ), 0)
    - coalesce((
      select sum(coalesce(c.commission_amount, c.amount))::integer
      from public.commission_log c
      where c.agent_id = a.id
        and c.settle_type = 'seat_fee_rebate'
    ), 0),
    (
      select aa.account
      from public.agent_admin aa
      where aa.agent_id = a.id
        and aa.status = 'active'
    )
  from public.agent a
  left join public.agent_org ao on ao.agent_id = a.id
  group by a.id, a.name
  order by a.name;
$$;

revoke all on function public.agent_login_lookup(text) from public, anon, authenticated;
revoke all on function public.mark_agent_admin_login(uuid) from public, anon, authenticated;
revoke all on function public.attach_agent_admin_auth(uuid, uuid) from public, anon, authenticated;
revoke all on function public.issue_agent_account(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.agent_home(uuid) from public, anon, authenticated;
revoke all on function public.list_agent_commissions() from public, anon, authenticated;

grant execute on function public.agent_login_lookup(text) to service_role;
grant execute on function public.mark_agent_admin_login(uuid) to service_role;
grant execute on function public.attach_agent_admin_auth(uuid, uuid) to service_role;
grant execute on function public.issue_agent_account(uuid, uuid, text) to service_role;
grant execute on function public.agent_home(uuid) to service_role;
grant execute on function public.list_agent_commissions() to service_role;
