-- 触发器函数只应由触发器运行。收回 anon / authenticated 的直接执行权。
-- service_role 与函数所有者仍保留执行权，开户插入机构时触发器照常触发。

revoke all on function public.grant_opening_entitlement() from public, anon, authenticated;
revoke all on function public.grant_default_groups() from public, anon, authenticated;
