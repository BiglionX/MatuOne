-- 课程包授权、区域代理、佣金流水。业务行不物理删除。
-- 进关卡仍走 decideEnterLevel：stage_level 超过有效 max_level 时返回 course_locked。

create table if not exists public.org_entitlement (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.org (id),
  max_level integer not null check (max_level between 1 and 8),
  seat_quota integer not null check (seat_quota > 0),
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.org_entitlement is
  '机构课程包。max_level 是允许进入的最高阶段；valid_until 过后进关卡视为未授权。';

create table if not exists public.agent (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null default '',
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

comment on table public.agent is '区域代理。';

create table if not exists public.agent_org (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent (id),
  org_id uuid not null unique references public.org (id),
  created_at timestamptz not null default now()
);

comment on table public.agent_org is '代理负责的托管机构。一所机构只归属一个代理。';

create table if not exists public.commission_log (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agent (id),
  org_id uuid not null references public.org (id),
  amount integer not null check (amount >= 0),
  settle_type text not null,
  status text not null check (status in ('pending', 'settled')),
  created_at timestamptz not null default now()
);

comment on table public.commission_log is '佣金流水。settle_type 示例 seat_fee_rebate。不物理删除。';

create index if not exists agent_org_agent_id_idx on public.agent_org (agent_id);
create index if not exists commission_log_agent_id_idx on public.commission_log (agent_id);
create index if not exists commission_log_org_id_idx on public.commission_log (org_id);

create or replace function public.grant_org_course_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_entitlement (org_id, max_level, seat_quota, valid_until)
  values (
    new.id,
    4,
    new.seat_quota,
    coalesce(new.service_end_at, new.trial_expire_at)
  )
  on conflict (org_id) do nothing;
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
drop trigger if exists agent_no_delete on public.agent;
create trigger agent_no_delete before delete on public.agent
  for each row execute function public.forbid_business_delete();
drop trigger if exists agent_org_no_delete on public.agent_org;
create trigger agent_org_no_delete before delete on public.agent_org
  for each row execute function public.forbid_business_delete();
drop trigger if exists commission_log_no_delete on public.commission_log;
create trigger commission_log_no_delete before delete on public.commission_log
  for each row execute function public.forbid_business_delete();

alter table public.org_entitlement enable row level security;
alter table public.agent enable row level security;
alter table public.agent_org enable row level security;
alter table public.commission_log enable row level security;

revoke all on public.org_entitlement from public, anon, authenticated;
revoke all on public.agent from public, anon, authenticated;
revoke all on public.agent_org from public, anon, authenticated;
revoke all on public.commission_log from public, anon, authenticated;
revoke all on function public.grant_org_course_entitlement() from public, anon, authenticated;

create or replace function public.list_agent_commissions()
returns table (
  agent_id uuid,
  agent_name text,
  org_count integer,
  seat_fee_total integer,
  rebate_due integer
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
      select sum(c.amount)::integer
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

insert into public.org_entitlement (org_id, max_level, seat_quota, valid_until)
select
  o.id,
  4,
  o.seat_quota,
  coalesce(o.service_end_at, o.trial_expire_at, now() + interval '365 days')
from public.org o
where not exists (
  select 1 from public.org_entitlement e where e.org_id = o.id
);

insert into public.agent (id, name, region, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '华东代理', '华东', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '西南代理', '西南', 'active')
on conflict (id) do nothing;

insert into public.agent_org (agent_id, org_id)
select v.agent_id, v.org_id
from (
  values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, '11111111-1111-4111-8111-111111111111'::uuid),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid, '33333333-3333-4333-8333-333333333333'::uuid),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid, '22222222-2222-4222-8222-222222222222'::uuid)
) as v(agent_id, org_id)
where exists (select 1 from public.org o where o.id = v.org_id)
  and not exists (select 1 from public.agent_org ao where ao.org_id = v.org_id);

-- 演示：南风课后的席位年费，以及西南代理待结算返佣。比例不写进计费函数。
insert into public.billing_record (
  org_id, type, plan, seats, amount, amount_overridden, note, pay_method,
  service_start, service_end, invoice_status, renew_remind_at, operator, operator_id
)
select
  '22222222-2222-4222-8222-222222222222',
  '新购',
  '40 席位 / 年',
  40,
  16800,
  false,
  '演示：西南代理名下机构的席位年费',
  '对公转账',
  current_date - 30,
  current_date + 335,
  '未开票',
  current_date + 305,
  s.display_name,
  s.id
from public.platform_staff s
where s.account = 'ops'
  and exists (select 1 from public.org o where o.id = '22222222-2222-4222-8222-222222222222')
  and not exists (
    select 1 from public.billing_record b
    where b.org_id = '22222222-2222-4222-8222-222222222222'
      and b.note = '演示：西南代理名下机构的席位年费'
  );

insert into public.commission_log (agent_id, org_id, amount, settle_type, status)
select
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '22222222-2222-4222-8222-222222222222',
  1680,
  'seat_fee_rebate',
  'pending'
where exists (select 1 from public.org o where o.id = '22222222-2222-4222-8222-222222222222')
  and exists (select 1 from public.agent a where a.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
  and not exists (
    select 1 from public.commission_log c
    where c.agent_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
      and c.org_id = '22222222-2222-4222-8222-222222222222'
      and c.settle_type = 'seat_fee_rebate'
  );
