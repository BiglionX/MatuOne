-- 2.7 拦截：有效状态现算，进关卡与席位不靠页面。
-- 宽限 30 天写死。业务表仍然禁止物理删除。

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
    when p_status = 'trial'
      and p_trial_expire_at is not null
      and p_now > p_trial_expire_at then 'expired'
    when p_status = 'active'
      and p_service_end_at is not null
      and p_now > p_service_end_at + interval '30 days' then 'disabled'
    else p_status
  end
$$;

comment on function public.effective_org_status(text, timestamptz, timestamptz, timestamptz) is
  '请求路径现算。trial 过试用到期即为 expired；active 超过服务期止 30 天后为 disabled。';

create table public.student (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  auth_user_id uuid unique references auth.users (id),
  group_id text not null default '',
  name text not null,
  account text not null unique,
  password_hash text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  constraint student_hash_only check (password_hash like 'pbkdf2-sha256$%')
);

comment on column public.student.password_hash is '只存哈希，禁止明文';

create table public.level_entitlement (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  subject_type text not null check (subject_type in ('org', 'group', 'student')),
  subject_id text not null,
  level_order_min integer not null,
  level_order_max integer not null,
  created_at timestamptz not null default now(),
  constraint level_entitlement_range check (level_order_min >= 1 and level_order_max >= level_order_min)
);

create index student_org_id_idx on public.student (org_id);
create index level_entitlement_org_id_idx on public.level_entitlement (org_id);

alter table public.org_admin add column auth_user_id uuid unique references auth.users (id);

create or replace function public.grant_opening_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'trial' then
    insert into public.level_entitlement (org_id, subject_type, subject_id, level_order_min, level_order_max)
    values (new.id, 'org', new.id::text, 1, 3);
  else
    insert into public.level_entitlement (org_id, subject_type, subject_id, level_order_min, level_order_max)
    values (new.id, 'org', new.id::text, 1, 999);
  end if;
  return new;
end;
$$;

create trigger org_grant_entitlement
  after insert on public.org
  for each row execute function public.grant_opening_entitlement();

create trigger student_no_delete before delete on public.student
  for each row execute function public.forbid_business_delete();
create trigger level_entitlement_no_delete before delete on public.level_entitlement
  for each row execute function public.forbid_business_delete();

alter table public.student enable row level security;
alter table public.level_entitlement enable row level security;
revoke all on public.student from public, anon, authenticated;
revoke all on public.level_entitlement from public, anon, authenticated;

-- 只给台账展示用，拦截不得读这次回写的结果作为依据。
create or replace function public.rewrite_org_status_for_display()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.org
    set status = public.effective_org_status(status, trial_expire_at, service_end_at)
    where status is distinct from public.effective_org_status(status, trial_expire_at, service_end_at);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.rewrite_org_status_for_display() from public, anon, authenticated;
grant execute on function public.rewrite_org_status_for_display() to service_role;

insert into public.level_entitlement (org_id, subject_type, subject_id, level_order_min, level_order_max)
select o.id, 'org', o.id::text, 1, case when o.status = 'trial' then 3 else 999 end
from public.org o
where not exists (
  select 1 from public.level_entitlement e
  where e.org_id = o.id and e.subject_type = 'org'
);
