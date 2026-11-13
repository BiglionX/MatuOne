-- 真实数据层：修正有效状态，并补上分组、学习记录、课程、家长、计费。
-- 业务表仍然禁止物理删除。身份只从 session 取，本文件里的函数不信任调用方自称的操作人，除非传入的是已核对过的 staff id。

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

comment on function public.effective_org_status(text, timestamptz, timestamptz, timestamptz) is
  '请求路径现算。手动停用优先；试用或服务到期为 expired；再过 30 天宽限为 disabled。';

alter table public.platform_staff alter column auth_user_id drop not null;
alter table public.platform_staff add column password_hash text;
alter table public.platform_staff
  add constraint platform_staff_hash_only check (password_hash is null or password_hash like 'pbkdf2-sha256$%');

alter table public.student add column bind_code text unique;
alter table public.student add column last_active_at timestamptz;
alter table public.student add column current_level_order integer not null default 1;

alter table public.level_entitlement add column expires_at timestamptz;

create table public.student_group (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.course_activation (
  org_id uuid primary key references public.org (id),
  group_id text not null default 'all',
  seats integer not null check (seats > 0),
  expires_at date,
  activated_at timestamptz not null default now()
);

create table public.level_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student (id),
  level_id text not null,
  completed boolean not null default false,
  stars integer not null default 0 check (stars between 0 and 3),
  change_done boolean not null default false,
  error_taps integer not null default 0,
  runs integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (student_id, level_id)
);

create table public.typing_record (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student (id),
  practiced_on date not null,
  practice_type text not null check (practice_type in ('home_row', 'keywords', 'lesson_embedded')),
  wpm numeric not null,
  accuracy numeric not null,
  created_at timestamptz not null default now()
);

create table public.study_session (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student (id),
  level_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.course_level (
  level_id text primary key,
  sort_order integer not null unique,
  title text not null,
  goal text not null,
  body jsonb not null,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.error_hint (
  pattern text primary key check (pattern in ('cjk', 'paren', 'indent', 'name')),
  friendly_message text not null
);

create table public.parent_session (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now()
);

create table public.parent_binding (
  id uuid primary key default gen_random_uuid(),
  parent_session_id uuid not null references public.parent_session (id),
  student_id uuid not null references public.student (id),
  created_at timestamptz not null default now(),
  unique (parent_session_id, student_id)
);

create table public.seat_price_tier (
  id integer primary key,
  min_seats integer not null,
  max_seats integer,
  unit_price integer not null check (unit_price > 0),
  constraint seat_price_tier_range check (max_seats is null or max_seats >= min_seats)
);

create table public.billing_record (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  type text not null check (type in ('试用', '新购', '续费', '扩容')),
  plan text not null,
  seats integer not null check (seats > 0),
  amount integer not null check (amount >= 0),
  amount_overridden boolean not null default false,
  note text,
  pay_method text not null default '对公转账' check (pay_method = '对公转账'),
  service_start date,
  service_end date,
  invoice_status text not null default '未开票' check (invoice_status in ('未开票', '已申请', '已开票', '已寄出')),
  renew_remind_at date,
  operator text not null,
  operator_id uuid not null references public.platform_staff (id),
  created_at timestamptz not null default now()
);

create index student_group_org_id_idx on public.student_group (org_id);
create index level_progress_student_idx on public.level_progress (student_id);
create index typing_record_student_idx on public.typing_record (student_id, practiced_on);
create index study_session_student_idx on public.study_session (student_id, started_at);
create index parent_binding_session_idx on public.parent_binding (parent_session_id);
create index billing_record_org_idx on public.billing_record (org_id);

create or replace function public.grant_default_groups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_group (org_id, name)
  values
    (new.id, '二年级 A 班'),
    (new.id, '三年级 B 班'),
    (new.id, '四五年级提高班');
  return new;
end;
$$;

create trigger org_default_groups
  after insert on public.org
  for each row execute function public.grant_default_groups();

insert into public.student_group (org_id, name)
select o.id, g.name
from public.org o
cross join (values ('二年级 A 班'), ('三年级 B 班'), ('四五年级提高班')) as g(name)
where not exists (
  select 1 from public.student_group s where s.org_id = o.id and s.name = g.name
);

create trigger student_group_no_delete before delete on public.student_group
  for each row execute function public.forbid_business_delete();
create trigger course_activation_no_delete before delete on public.course_activation
  for each row execute function public.forbid_business_delete();
create trigger level_progress_no_delete before delete on public.level_progress
  for each row execute function public.forbid_business_delete();
create trigger typing_record_no_delete before delete on public.typing_record
  for each row execute function public.forbid_business_delete();
create trigger study_session_no_delete before delete on public.study_session
  for each row execute function public.forbid_business_delete();
create trigger course_level_no_delete before delete on public.course_level
  for each row execute function public.forbid_business_delete();
create trigger error_hint_no_delete before delete on public.error_hint
  for each row execute function public.forbid_business_delete();
create trigger parent_session_no_delete before delete on public.parent_session
  for each row execute function public.forbid_business_delete();
create trigger parent_binding_no_delete before delete on public.parent_binding
  for each row execute function public.forbid_business_delete();
create trigger seat_price_tier_no_delete before delete on public.seat_price_tier
  for each row execute function public.forbid_business_delete();
create trigger billing_record_no_delete before delete on public.billing_record
  for each row execute function public.forbid_business_delete();

alter table public.student_group enable row level security;
alter table public.course_activation enable row level security;
alter table public.level_progress enable row level security;
alter table public.typing_record enable row level security;
alter table public.study_session enable row level security;
alter table public.course_level enable row level security;
alter table public.error_hint enable row level security;
alter table public.parent_session enable row level security;
alter table public.parent_binding enable row level security;
alter table public.seat_price_tier enable row level security;
alter table public.billing_record enable row level security;

revoke all on public.student_group from public, anon, authenticated;
revoke all on public.course_activation from public, anon, authenticated;
revoke all on public.level_progress from public, anon, authenticated;
revoke all on public.typing_record from public, anon, authenticated;
revoke all on public.study_session from public, anon, authenticated;
revoke all on public.course_level from public, anon, authenticated;
revoke all on public.error_hint from public, anon, authenticated;
revoke all on public.parent_session from public, anon, authenticated;
revoke all on public.parent_binding from public, anon, authenticated;
revoke all on public.seat_price_tier from public, anon, authenticated;
revoke all on public.billing_record from public, anon, authenticated;

create or replace function public.auth_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;

create or replace function public.attach_org_admin_auth(p_admin_id uuid, p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.org_admin
    set auth_user_id = p_auth_user_id
    where id = p_admin_id
      and (auth_user_id is null or auth_user_id = p_auth_user_id);
end;
$$;

create or replace function public.attach_student_auth(p_student_id uuid, p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.student
    set auth_user_id = p_auth_user_id
    where id = p_student_id
      and (auth_user_id is null or auth_user_id = p_auth_user_id);
end;
$$;

create or replace function public.attach_staff_auth(p_staff_id uuid, p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.platform_staff
    set auth_user_id = p_auth_user_id
    where id = p_staff_id
      and (auth_user_id is null or auth_user_id = p_auth_user_id);
end;
$$;

create or replace function public.student_login_lookup(p_account text)
returns table (
  student_id uuid,
  password_hash text,
  auth_user_id uuid,
  student_status text,
  name text,
  account text,
  group_id text,
  bind_code text,
  current_level_order integer,
  last_active_at timestamptz,
  org_id uuid,
  org_no text,
  org_name text,
  org_status text,
  trial_expire_at timestamptz,
  service_end_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id, s.password_hash, s.auth_user_id, s.status, s.name, s.account, s.group_id,
    s.bind_code, s.current_level_order, s.last_active_at,
    o.id, o.org_no, o.name, o.status, o.trial_expire_at, o.service_end_at
  from public.student s
  join public.org o on o.id = s.org_id
  where s.account = p_account
    and s.status = 'active'
$$;

create or replace function public.platform_login_lookup(p_account text)
returns table (
  staff_id uuid,
  account text,
  display_name text,
  role text,
  status text,
  password_hash text,
  auth_user_id uuid
)
language sql
security definer
set search_path = public
as $$
  select id, account, display_name, role, status, password_hash, auth_user_id
  from public.platform_staff
  where account = p_account
    and status = 'active'
$$;

create or replace function public.list_org_ledger()
returns table (
  id uuid,
  org_no text,
  name text,
  contact_phone text,
  campus text,
  seat_quota integer,
  used_seats integer,
  created_at timestamptz,
  trial_expire_at timestamptz,
  service_end_at timestamptz,
  status text,
  expiring_soon boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.org_no,
    o.name,
    o.contact_phone,
    o.campus,
    o.seat_quota,
    o.used_seats,
    o.created_at,
    o.trial_expire_at,
    o.service_end_at,
    public.effective_org_status(o.status, o.trial_expire_at, o.service_end_at) as status,
    (
      public.effective_org_status(o.status, o.trial_expire_at, o.service_end_at) in ('trial', 'active')
      and coalesce(o.service_end_at, o.trial_expire_at) is not null
      and coalesce(o.service_end_at, o.trial_expire_at) >= now()
      and coalesce(o.service_end_at, o.trial_expire_at) <= now() + interval '30 days'
    ) as expiring_soon
  from public.org o
  order by coalesce(o.service_end_at, o.trial_expire_at) asc nulls last
$$;

create or replace function public.quote_seat_price(p_seats integer)
returns table (unit_price integer, amount integer, plan_label text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_unit integer;
begin
  if p_seats is null or p_seats < 1 then
    raise exception '席位数至少为 1';
  end if;
  select t.unit_price into v_unit
  from public.seat_price_tier t
  where p_seats >= t.min_seats
    and (t.max_seats is null or p_seats <= t.max_seats)
  order by t.min_seats desc
  limit 1;
  if v_unit is null then
    raise exception '没有匹配的席位档';
  end if;
  unit_price := v_unit;
  amount := v_unit * p_seats;
  plan_label := p_seats::text || ' 席位 / 年';
  return next;
end;
$$;

create or replace function public.submit_lead(
  p_org_name text,
  p_contact text,
  p_phone text,
  p_city text,
  p_est_students integer,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_org_name is null or char_length(btrim(p_org_name)) < 2 or char_length(btrim(p_org_name)) > 50 then
    raise exception '机构名称需要 2–50 个字';
  end if;
  if p_contact is null or char_length(btrim(p_contact)) < 2 or char_length(btrim(p_contact)) > 20 then
    raise exception '联系人需要 2–20 个字';
  end if;
  if p_phone is null or p_phone !~ '^1[0-9]{10}$' then
    raise exception '请填写 11 位手机号';
  end if;
  if p_city is null or char_length(btrim(p_city)) < 1 or char_length(btrim(p_city)) > 50 then
    raise exception '请填写所在城市或校区';
  end if;
  if p_est_students is null or p_est_students < 1 or p_est_students > 500 then
    raise exception '预计学生数需要在 1–500 之间';
  end if;
  if p_note is not null and char_length(p_note) > 200 then
    raise exception '备注不超过 200 字';
  end if;
  insert into public.lead (org_name, contact, phone, city, est_students, note, status)
  values (btrim(p_org_name), btrim(p_contact), p_phone, btrim(p_city), p_est_students, nullif(btrim(coalesce(p_note, '')), ''), '新')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_lead_status(p_lead_id uuid, p_status text, p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
begin
  select * into v_staff from public.platform_staff
  where id = p_staff_id and role = 'ops' and status = 'active';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('新', '已联系', '已关闭') then
    raise exception '这个状态不能手动修改';
  end if;
  update public.lead
    set status = p_status
    where id = p_lead_id
      and status <> '已开户';
  if not found then
    raise exception '线索不存在或已经开户';
  end if;
end;
$$;

create or replace function public.record_billing(
  p_org_id uuid,
  p_type text,
  p_seats integer,
  p_amount integer,
  p_overridden boolean,
  p_note text,
  p_service_start date,
  p_service_end date,
  p_staff_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
  v_org public.org%rowtype;
  v_quote record;
  v_id uuid;
  v_plan text;
  v_remind date;
begin
  select * into v_staff from public.platform_staff
  where id = p_staff_id and role in ('ops', 'finance') and status = 'active';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_type not in ('试用', '新购', '续费', '扩容') then
    raise exception '记录类型不正确';
  end if;
  if p_seats is null or p_seats < 1 then
    raise exception '席位数至少为 1';
  end if;
  select * into v_org from public.org where id = p_org_id;
  if not found then
    raise exception '机构不存在';
  end if;

  select * into v_quote from public.quote_seat_price(p_seats);
  v_plan := v_quote.plan_label;
  if p_type = '试用' then
    if p_amount is null or p_amount <> 0 then
      raise exception '试用记录金额为 0';
    end if;
  elsif coalesce(p_overridden, false) then
    if p_note is null or char_length(btrim(p_note)) < 1 then
      raise exception '手工改价需要填写备注';
    end if;
    if p_amount is null or p_amount < 0 then
      raise exception '金额不正确';
    end if;
  elsif p_amount is distinct from v_quote.amount then
    raise exception '金额与阶梯价不一致';
  end if;

  if p_type in ('新购', '续费', '扩容') then
    if p_service_start is null or p_service_end is null or p_service_end < p_service_start then
      raise exception '请填写服务期';
    end if;
    v_remind := p_service_end - 30;
  end if;

  insert into public.billing_record (
    org_id, type, plan, seats, amount, amount_overridden, note,
    service_start, service_end, renew_remind_at, operator, operator_id
  ) values (
    p_org_id, p_type, v_plan, p_seats, p_amount, coalesce(p_overridden, false), nullif(btrim(coalesce(p_note, '')), ''),
    p_service_start, p_service_end, v_remind, v_staff.display_name, v_staff.id
  ) returning id into v_id;

  if p_type in ('新购', '续费') then
    update public.org
      set status = 'active',
          seat_quota = p_seats,
          service_start_at = p_service_start::timestamptz,
          service_end_at = (p_service_end + 1)::timestamptz - interval '1 second'
      where id = p_org_id;
    update public.level_entitlement
      set level_order_max = 999, expires_at = (p_service_end + 1)::timestamptz - interval '1 second'
      where org_id = p_org_id and subject_type = 'org';
  elsif p_type = '扩容' then
    update public.org
      set seat_quota = seat_quota + p_seats
      where id = p_org_id;
  end if;

  if p_type in ('新购', '续费', '扩容') then
    insert into public.provision_log (org_id, action, operator, operator_id, detail)
    values (
      p_org_id,
      '续费',
      v_staff.display_name,
      v_staff.id,
      jsonb_build_object('billingId', v_id, 'type', p_type, 'seats', p_seats, 'amount', p_amount)
    );
  end if;

  return v_id;
end;
$$;

create or replace function public.set_invoice_status(p_record_id uuid, p_status text, p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
begin
  select * into v_staff from public.platform_staff
  where id = p_staff_id and role in ('ops', 'finance') and status = 'active';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('未开票', '已申请', '已开票', '已寄出') then
    raise exception '开票状态不正确';
  end if;
  update public.billing_record set invoice_status = p_status where id = p_record_id;
  if not found then
    raise exception '收费记录不存在';
  end if;
end;
$$;

create or replace function public.set_org_manual_status(p_org_id uuid, p_action text, p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff public.platform_staff%rowtype;
  v_org public.org%rowtype;
  v_previous text;
begin
  select * into v_staff from public.platform_staff
  where id = p_staff_id and role = 'ops' and status = 'active';
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_org from public.org where id = p_org_id;
  if not found then
    raise exception '机构不存在';
  end if;

  if p_action = '停用' then
    update public.org set status = 'disabled' where id = p_org_id;
    insert into public.provision_log (org_id, action, operator, operator_id, detail)
    values (p_org_id, '停用', v_staff.display_name, v_staff.id, jsonb_build_object('previousStatus', v_org.status));
  elsif p_action = '恢复' then
    select detail->>'previousStatus' into v_previous
    from public.provision_log
    where org_id = p_org_id and action = '停用'
    order by created_at desc
    limit 1;
    if v_previous is null or v_previous not in ('trial', 'active', 'expired') then
      v_previous := 'active';
    end if;
    update public.org set status = v_previous where id = p_org_id;
    insert into public.provision_log (org_id, action, operator, operator_id, detail)
    values (p_org_id, '恢复', v_staff.display_name, v_staff.id, jsonb_build_object('status', v_previous));
  else
    raise exception '只能停用或恢复';
  end if;
end;
$$;

revoke all on function public.auth_user_id_by_email(text) from public, anon, authenticated;
revoke all on function public.attach_org_admin_auth(uuid, uuid) from public, anon, authenticated;
revoke all on function public.attach_student_auth(uuid, uuid) from public, anon, authenticated;
revoke all on function public.attach_staff_auth(uuid, uuid) from public, anon, authenticated;
revoke all on function public.student_login_lookup(text) from public, anon, authenticated;
revoke all on function public.platform_login_lookup(text) from public, anon, authenticated;
revoke all on function public.list_org_ledger() from public, anon, authenticated;
revoke all on function public.quote_seat_price(integer) from public, anon, authenticated;
revoke all on function public.submit_lead(text, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.set_lead_status(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.record_billing(uuid, text, integer, integer, boolean, text, date, date, uuid) from public, anon, authenticated;
revoke all on function public.set_invoice_status(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.set_org_manual_status(uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.auth_user_id_by_email(text) to service_role;
grant execute on function public.attach_org_admin_auth(uuid, uuid) to service_role;
grant execute on function public.attach_student_auth(uuid, uuid) to service_role;
grant execute on function public.attach_staff_auth(uuid, uuid) to service_role;
grant execute on function public.student_login_lookup(text) to service_role;
grant execute on function public.platform_login_lookup(text) to service_role;
grant execute on function public.list_org_ledger() to service_role;
grant execute on function public.quote_seat_price(integer) to service_role;
grant execute on function public.submit_lead(text, text, text, text, integer, text) to service_role;
grant execute on function public.set_lead_status(uuid, text, uuid) to service_role;
grant execute on function public.record_billing(uuid, text, integer, integer, boolean, text, date, date, uuid) to service_role;
grant execute on function public.set_invoice_status(uuid, text, uuid) to service_role;
grant execute on function public.set_org_manual_status(uuid, text, uuid) to service_role;

insert into public.seat_price_tier (id, min_seats, max_seats, unit_price) values
  (1, 1, 20, 480),
  (2, 21, 50, 420),
  (3, 51, null, 360);

insert into public.error_hint (pattern, friendly_message) values
  ('cjk', '这里的括号或逗号是中文的，Python 只认英文标点，换成英文输入法再打一次。'),
  ('paren', '这一行的括号没有配对上，数一数左括号和右括号是不是一样多。'),
  ('indent', '冒号后面要缩进 4 个空格，下一行要往右挪一点。'),
  ('name', '有个名字拼错了，Python 不认识它。对照上面那一行标准答案看看。');

-- 演示机构。哈希见 seed 说明。
-- 密码只以哈希入库。登录时才创建 auth.users。
insert into public.platform_staff (account, display_name, role, status, password_hash)
values ('ops', '平台运营', 'ops', 'active', 'pbkdf2-sha256$100000$6a5e4096c2e5227e5e524f93a2b34951$3a3c7ff9692ca93b4931cb0ec568b7b4fd118ba540fa64c8561496d4be911e94');

insert into public.org (
  id, org_no, name, contact_name, contact_phone, campus, seat_quota, used_seats, status, trial_expire_at, service_start_at, service_end_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    'ORG-0001', '青禾托辅', '周宁', '13800000001', '杭州西湖校区',
    10, 1, 'trial', now() + interval '14 days', null, null
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'ORG-0002', '南风课后', '林可', '13800000002', '成都高新校区',
    40, 0, 'active', null, now() - interval '30 days', now() + interval '335 days'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'ORG-0003', '江湾学堂', '赵启', '13800000003', '南京鼓楼校区',
    20, 0, 'trial', now() - interval '1 day', null, null
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'ORG-0004', '停用示例', '吴安', '13800000004', '武汉光谷校区',
    20, 0, 'disabled', now() - interval '40 days', null, null
  );

insert into public.org_admin (org_id, account, password_hash, status)
select o.id,
  'admin' || lower(replace(o.org_no, '-', '')) || '@daima-chuangguan.local',
  'pbkdf2-sha256$100000$11ca2e565874cf5470a21a3098e396b0$ef6e9207e214957012b6c3808295168e57940c4a261f4013834fa4a31c876b41',
  'active'
from public.org o
where o.org_no in ('ORG-0001', 'ORG-0002', 'ORG-0003', 'ORG-0004');

insert into public.student (
  org_id, group_id, name, account, password_hash, status, bind_code, current_level_order
)
select
  g.org_id,
  g.id::text,
  '陈小满',
  'chenxiaoman',
  'pbkdf2-sha256$100000$115a7f97991d29457ebf400940ace169$2335749c8cc711a7449fb152aa6d791f87dbe5a6c23dfe99ba106507b83eb686',
  'active',
  '204815',
  1
from public.student_group g
where g.org_id = '11111111-1111-4111-8111-111111111111'
  and g.name = '二年级 A 班';
