-- 绑定码尝试记录，供家长端按 IP 限流。不存完整绑定码。
-- 解除绑定只写 revoked_at，不物理删除。

create table public.bind_attempt (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  code_prefix text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);

create index bind_attempt_ip_fail_idx
  on public.bind_attempt (ip, created_at)
  where success = false;

create trigger bind_attempt_no_delete before delete on public.bind_attempt
  for each row execute function public.forbid_business_delete();

alter table public.bind_attempt enable row level security;
revoke all on public.bind_attempt from public, anon, authenticated;

alter table public.parent_binding
  add column revoked_at timestamptz;

comment on column public.parent_binding.revoked_at is
  '解除绑定的时间。为空表示仍有效。不允许物理删除该行。';
