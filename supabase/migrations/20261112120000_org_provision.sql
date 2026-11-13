-- 机构开户：org / org_admin / provision_log
-- 身份只认 platform_staff（由 auth.uid() 关联），不接受调用方传入的操作人。
-- org_admin 只存 PBKDF2 哈希，禁止明文。业务表禁止物理删除。

create extension if not exists pgcrypto;

create or replace function public.forbid_business_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception '业务数据不允许物理删除';
end;
$$;

create table public.platform_staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id),
  account text not null unique,
  display_name text not null,
  role text not null check (role in ('ops', 'finance')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

create table public.org (
  id uuid primary key default gen_random_uuid(),
  org_no text not null unique,
  name text not null,
  contact_name text not null,
  contact_phone text not null,
  campus text not null,
  seat_quota integer not null check (seat_quota > 0),
  used_seats integer not null default 0 check (used_seats >= 0),
  status text not null check (status in ('trial', 'active', 'expired', 'disabled')),
  trial_expire_at timestamptz,
  service_start_at timestamptz,
  service_end_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.org_admin (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  account text not null unique,
  password_hash text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  constraint org_admin_hash_only check (password_hash like 'pbkdf2-sha256$%')
);

comment on column public.org_admin.password_hash is 'PBKDF2-SHA256 哈希，禁止写入明文密码';

create table public.provision_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  action text not null check (action in ('开户', '续费', '停用', '恢复')),
  operator text not null,
  operator_id uuid not null references public.platform_staff (id),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint provision_log_no_secret check (
    not jsonb_exists(detail, 'password')
    and not jsonb_exists(detail, 'initialPassword')
    and not jsonb_exists(detail, 'password_hash')
  )
);

comment on table public.provision_log is '开通记录。operator 由函数从 platform_staff 写入，detail 不得含密码';

-- 线索只为开户时回写「已开户」。本轮不做营销站页面。
create table public.lead (
  id uuid primary key default gen_random_uuid(),
  org_name text not null,
  contact text not null default '',
  phone text not null default '',
  city text not null default '',
  est_students integer,
  note text,
  status text not null default '新' check (status in ('新', '已联系', '已开户', '已关闭')),
  org_id uuid references public.org (id),
  created_at timestamptz not null default now()
);

create index org_admin_org_id_idx on public.org_admin (org_id);
create index provision_log_org_id_idx on public.provision_log (org_id);
create index lead_org_id_idx on public.lead (org_id);

create trigger org_no_delete before delete on public.org
  for each row execute function public.forbid_business_delete();
create trigger org_admin_no_delete before delete on public.org_admin
  for each row execute function public.forbid_business_delete();
create trigger provision_log_no_delete before delete on public.provision_log
  for each row execute function public.forbid_business_delete();
create trigger lead_no_delete before delete on public.lead
  for each row execute function public.forbid_business_delete();
create trigger platform_staff_no_delete before delete on public.platform_staff
  for each row execute function public.forbid_business_delete();

alter table public.platform_staff enable row level security;
alter table public.org enable row level security;
alter table public.org_admin enable row level security;
alter table public.provision_log enable row level security;
alter table public.lead enable row level security;

revoke all on public.platform_staff from public, anon, authenticated;
revoke all on public.org from public, anon, authenticated;
revoke all on public.org_admin from public, anon, authenticated;
revoke all on public.provision_log from public, anon, authenticated;
revoke all on public.lead from public, anon, authenticated;

-- 懒判定：停用优先；试用/服务期超过到期点为已到期，再过 30 天宽限为停用。
create or replace function public.effective_org_status(
  p_status text,
  p_trial_expire_at timestamptz,
  p_service_end_at timestamptz,
  p_now timestamptz default now()
) returns text
language sql
stable
set search_path = public
as $$
  select case
    when p_status = 'disabled' then 'disabled'
    when p_status = 'trial'
      and p_trial_expire_at is not null
      and p_now > p_trial_expire_at + interval '30 days' then 'disabled'
    when p_status = 'trial'
      and p_trial_expire_at is not null
      and p_now > p_trial_expire_at then 'expired'
    when p_status = 'active'
      and p_service_end_at is not null
      and p_now > p_service_end_at + interval '30 days' then 'disabled'
    when p_status = 'active'
      and p_service_end_at is not null
      and p_now > p_service_end_at then 'expired'
    when p_status = 'expired'
      and coalesce(p_service_end_at, p_trial_expire_at) is not null
      and p_now > coalesce(p_service_end_at, p_trial_expire_at) + interval '30 days' then 'disabled'
    else p_status
  end
$$;

create or replace function public.provision_org(
  p_name text,
  p_contact_name text,
  p_contact_phone text,
  p_campus text,
  p_seat_quota integer,
  p_trial_days integer,
  p_password_hash text,
  p_lead_id uuid,
  p_operator_staff_id uuid
) returns table (org_no text, admin_account text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
  v_lead public.lead%rowtype;
  v_seq integer;
  v_org_no text;
  v_org_id uuid;
  v_account text;
  v_days integer;
begin
  if p_operator_staff_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_staff
  from public.platform_staff
  where id = p_operator_staff_id
    and role = 'ops'
    and status = 'active';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_name is null or char_length(btrim(p_name)) < 2 or char_length(btrim(p_name)) > 50 then
    raise exception '机构名称需要 2–50 个字';
  end if;
  if p_contact_name is null or char_length(btrim(p_contact_name)) < 2 or char_length(btrim(p_contact_name)) > 20 then
    raise exception '联系人需要 2–20 个字';
  end if;
  if p_contact_phone is null or p_contact_phone !~ '^1[0-9]{10}$' then
    raise exception '请填写 11 位手机号';
  end if;
  if p_campus is null or char_length(btrim(p_campus)) < 1 or char_length(btrim(p_campus)) > 50 then
    raise exception '请填写校区';
  end if;

  v_days := coalesce(p_trial_days, 14);
  if v_days < 1 or v_days > 90 then
    raise exception '试用天数需要在 1–90 之间';
  end if;
  if p_seat_quota is null or p_seat_quota < 1 then
    raise exception '席位额度至少为 1';
  end if;
  if p_seat_quota > 10 then
    raise exception '试用机构最多 10 个席位';
  end if;
  if p_password_hash is null or p_password_hash not like 'pbkdf2-sha256$%' or char_length(p_password_hash) < 40 then
    raise exception '密码哈希无效';
  end if;

  if p_lead_id is not null then
    select * into v_lead from public.lead where id = p_lead_id for update;
    if not found then
      raise exception '线索不存在';
    end if;
    if v_lead.status = '已开户' then
      raise exception '该线索已开户';
    end if;
    if v_lead.status not in ('新', '已联系') then
      raise exception '该线索不能开户';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext('provision_org_no'));

  select coalesce(max((substring(o.org_no from 5))::integer), 0) + 1
    into v_seq
  from public.org o
  where o.org_no ~ '^ORG-[0-9]+$';

  v_org_no := 'ORG-' || lpad(v_seq::text, 4, '0');
  v_account := 'admin' || lower(replace(v_org_no, '-', '')) || '@daima-chuangguan.local';

  insert into public.org (
    org_no, name, contact_name, contact_phone, campus,
    seat_quota, used_seats, status, trial_expire_at
  ) values (
    v_org_no,
    btrim(p_name),
    btrim(p_contact_name),
    p_contact_phone,
    btrim(p_campus),
    p_seat_quota,
    0,
    'trial',
    now() + make_interval(days => v_days)
  ) returning id into v_org_id;

  insert into public.org_admin (org_id, account, password_hash, status)
  values (v_org_id, v_account, p_password_hash, 'active');

  insert into public.provision_log (org_id, action, operator, operator_id, detail)
  values (
    v_org_id,
    '开户',
    v_staff.display_name,
    v_staff.id,
    jsonb_build_object(
      'seatQuota', p_seat_quota,
      'trialDays', v_days,
      'orgNo', v_org_no,
      'adminAccount', v_account,
      'leadId', p_lead_id
    )
  );

  if p_lead_id is not null then
    update public.lead
      set status = '已开户', org_id = v_org_id
      where id = p_lead_id;
  end if;

  org_no := v_org_no;
  admin_account := v_account;
  return next;
end;
$$;

create or replace function public.org_admin_login_lookup(p_account text)
returns table (
  admin_id uuid,
  password_hash text,
  admin_status text,
  org_id uuid,
  org_no text,
  org_name text,
  org_status text,
  trial_expire_at timestamptz,
  service_start_at timestamptz,
  service_end_at timestamptz,
  seat_quota integer,
  used_seats integer
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.password_hash,
    a.status,
    o.id,
    o.org_no,
    o.name,
    o.status,
    o.trial_expire_at,
    o.service_start_at,
    o.service_end_at,
    o.seat_quota,
    o.used_seats
  from public.org_admin a
  join public.org o on o.id = a.org_id
  where a.account = p_account
    and a.status = 'active'
$$;

create or replace function public.mark_org_admin_login(p_admin_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.org_admin
    set last_login_at = now()
    where id = p_admin_id
      and status = 'active'
$$;

revoke all on function public.forbid_business_delete() from public, anon, authenticated;
revoke all on function public.effective_org_status(text, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.provision_org(text, text, text, text, integer, integer, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.org_admin_login_lookup(text) from public, anon, authenticated;
revoke all on function public.mark_org_admin_login(uuid) from public, anon, authenticated;

grant execute on function public.effective_org_status(text, timestamptz, timestamptz, timestamptz) to service_role;
grant execute on function public.provision_org(text, text, text, text, integer, integer, text, uuid, uuid) to service_role;
grant execute on function public.org_admin_login_lookup(text) to service_role;
grant execute on function public.mark_org_admin_login(uuid) to service_role;
