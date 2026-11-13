-- 家长账号。登录身份从 auth.users 关联，不接受调用方传入的家长 id。
-- 旧的 parent_session 设备令牌保留不删；新的绑定挂在 parent_account 上。

create table public.parent_account (
  id uuid primary key default gen_random_uuid(),
  account text not null unique check (account ~ '^[a-z0-9][a-z0-9._]{2,31}$'),
  password_hash text not null check (password_hash <> ''),
  auth_user_id uuid unique references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.parent_binding alter column parent_session_id drop not null;

alter table public.parent_binding
  add column parent_account_id uuid references public.parent_account (id);

alter table public.parent_binding
  add constraint parent_binding_one_owner check (
    (parent_session_id is not null) <> (parent_account_id is not null)
  );

create unique index parent_binding_account_student_uidx
  on public.parent_binding (parent_account_id, student_id)
  where parent_account_id is not null;

create index parent_binding_account_idx on public.parent_binding (parent_account_id);

create trigger parent_account_no_delete before delete on public.parent_account
  for each row execute function public.forbid_business_delete();

alter table public.parent_account enable row level security;
revoke all on public.parent_account from public, anon, authenticated;

create or replace function public.parent_login_lookup(p_account text)
returns table (
  parent_id uuid,
  account text,
  password_hash text,
  auth_user_id uuid
)
language sql
security definer
set search_path = public
as $$
  select id, account, password_hash, auth_user_id
  from public.parent_account
  where account = lower(trim(p_account))
$$;

create or replace function public.attach_parent_auth(p_parent_id uuid, p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.parent_account
    set auth_user_id = p_auth_user_id
    where id = p_parent_id
      and (auth_user_id is null or auth_user_id = p_auth_user_id);
end;
$$;

revoke all on function public.parent_login_lookup(text) from public, anon, authenticated;
revoke all on function public.attach_parent_auth(uuid, uuid) from public, anon, authenticated;
grant execute on function public.parent_login_lookup(text) to service_role;
grant execute on function public.attach_parent_auth(uuid, uuid) to service_role;
