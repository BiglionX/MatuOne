-- 家长最近登录。只在登录成功时由服务端写入，不接受前端传入。

alter table public.parent_account
  add column if not exists last_login_at timestamptz;

comment on column public.parent_account.last_login_at is
  '最近一次登录成功的时间。由登录接口写入。';
