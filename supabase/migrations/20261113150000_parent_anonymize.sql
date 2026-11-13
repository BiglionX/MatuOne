-- 注销家长不物理删除。账号改成不可识别的形式，密码作废，并记下匿名化时间。
-- 已匿名的账号不能再登录。

alter table public.parent_account
  add column if not exists anonymized_at timestamptz;

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
    and anonymized_at is null
$$;
