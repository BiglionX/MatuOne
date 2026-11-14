-- 平台运营配置：开户、续费、代理分成都读这张表，不在函数里写死价格。

create table if not exists public.platform_configs (
  key text primary key,
  value text not null,
  description text not null,
  updated_by uuid references public.platform_staff (id),
  updated_at timestamptz not null default now()
);

comment on table public.platform_configs is '平台运营配置。key 不物理删除，只更新 value。';

drop trigger if exists platform_configs_no_delete on public.platform_configs;
create trigger platform_configs_no_delete before delete on public.platform_configs
  for each row execute function public.forbid_business_delete();

alter table public.platform_configs enable row level security;
revoke all on public.platform_configs from public, anon, authenticated;

insert into public.platform_configs (key, value, description)
values
  ('min_seat_count', '5', '机构开户最低席位'),
  ('base_seat_price', '90', '机构向平台支付的席位底价，元/席/月'),
  ('trial_days', '14', '新机构试用天数'),
  ('agent_commission_rate', '0.40', '代理分成比例，其余归平台')
on conflict (key) do nothing;

create or replace function public.platform_config_int(p_key text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select value::integer from public.platform_configs where key = p_key
$$;

create or replace function public.platform_config_numeric(p_key text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select value::numeric from public.platform_configs where key = p_key
$$;

revoke all on function public.platform_config_int(text) from public, anon, authenticated;
revoke all on function public.platform_config_numeric(text) from public, anon, authenticated;
grant execute on function public.platform_config_int(text) to service_role;
grant execute on function public.platform_config_numeric(text) to service_role;

create or replace function public.list_platform_configs()
returns table (
  key text,
  value text,
  description text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.key, c.value, c.description, c.updated_at
  from public.platform_configs c
  order by c.key
$$;

create or replace function public.save_platform_configs(
  p_staff_id uuid,
  p_min_seat_count integer,
  p_base_seat_price integer,
  p_trial_days integer,
  p_agent_commission_rate numeric
) returns void
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
  if p_min_seat_count is null or p_min_seat_count < 1 or p_min_seat_count > 10 then
    raise exception '最低席位需要在 1 到 10 之间';
  end if;
  if p_base_seat_price is null or p_base_seat_price < 1 then
    raise exception '平台底价至少为 1 元';
  end if;
  if p_trial_days is null or p_trial_days < 1 or p_trial_days > 90 then
    raise exception '试用天数需要在 1–90 之间';
  end if;
  if p_agent_commission_rate is null or p_agent_commission_rate < 0 or p_agent_commission_rate > 1 then
    raise exception '分成比例需要在 0 到 1 之间';
  end if;

  update public.platform_configs
    set value = p_min_seat_count::text, updated_by = v_staff.id, updated_at = now()
    where key = 'min_seat_count';
  update public.platform_configs
    set value = p_base_seat_price::text, updated_by = v_staff.id, updated_at = now()
    where key = 'base_seat_price';
  update public.platform_configs
    set value = p_trial_days::text, updated_by = v_staff.id, updated_at = now()
    where key = 'trial_days';
  update public.platform_configs
    set value = trim(to_char(p_agent_commission_rate, '0.0000')), updated_by = v_staff.id, updated_at = now()
    where key = 'agent_commission_rate';
end;
$$;

revoke all on function public.list_platform_configs() from public, anon, authenticated;
revoke all on function public.save_platform_configs(uuid, integer, integer, integer, numeric) from public, anon, authenticated;
grant execute on function public.list_platform_configs() to service_role;
grant execute on function public.save_platform_configs(uuid, integer, integer, integer, numeric) to service_role;

alter table public.org add column if not exists student_monthly_price integer not null default 200;
alter table public.org drop constraint if exists org_student_monthly_price_range;
alter table public.org add constraint org_student_monthly_price_range
  check (student_monthly_price between 150 and 500);
comment on column public.org.student_monthly_price is '机构向家长收取的月学费，元。';

alter table public.commission_log add column if not exists base_amount integer;
alter table public.commission_log add column if not exists commission_amount integer;
alter table public.commission_log drop constraint if exists commission_log_base_amount_chk;
alter table public.commission_log drop constraint if exists commission_log_commission_amount_chk;
alter table public.commission_log add constraint commission_log_base_amount_chk check (base_amount is null or base_amount >= 0);
alter table public.commission_log add constraint commission_log_commission_amount_chk check (commission_amount is null or commission_amount >= 0);
update public.commission_log set commission_amount = amount where commission_amount is null;
comment on column public.commission_log.base_amount is '机构按平台底价支付的席位费总额，元。';
comment on column public.commission_log.commission_amount is '代理按分成比例拿到的金额，元。';

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
  v_unit := public.platform_config_int('base_seat_price');
  if v_unit is null or v_unit < 1 then
    raise exception '缺少平台底价配置';
  end if;
  unit_price := v_unit;
  amount := v_unit * p_seats;
  plan_label := v_unit::text || ' 元/席/月';
  return next;
end;
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
  v_min integer;
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

  v_days := public.platform_config_int('trial_days');
  if v_days is null or v_days < 1 or v_days > 90 then
    raise exception '试用天数需要在 1–90 之间';
  end if;
  v_min := public.platform_config_int('min_seat_count');
  if v_min is null or v_min < 1 then
    raise exception '席位额度至少为 1';
  end if;
  if p_seat_quota is null or p_seat_quota < v_min then
    raise exception '席位额度至少为 %', v_min;
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
  v_agent uuid;
  v_rate numeric;
  v_base integer;
  v_commission integer;
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
    raise exception '金额与平台底价不一致';
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

    select ao.agent_id into v_agent from public.agent_org ao where ao.org_id = p_org_id;
    if v_agent is not null then
      v_rate := public.platform_config_numeric('agent_commission_rate');
      if v_rate is null then
        raise exception '缺少代理分成配置';
      end if;
      v_base := v_quote.unit_price * p_seats;
      v_commission := round(v_base * v_rate)::integer;
      insert into public.commission_log (
        agent_id, org_id, amount, base_amount, commission_amount, settle_type, status
      ) values (
        v_agent, p_org_id, v_commission, v_base, v_commission, 'seat_fee_rebate', 'pending'
      );
    end if;
  end if;

  return v_id;
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
  platform_net integer
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
    ), 0)
  from public.agent a
  left join public.agent_org ao on ao.agent_id = a.id
  group by a.id, a.name
  order by a.name;
$$;

revoke all on function public.list_agent_commissions() from public, anon, authenticated;
grant execute on function public.list_agent_commissions() to service_role;
