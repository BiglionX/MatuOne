-- 开发演示家长。明文不入库。一键登录使用 parent.demo。
-- 绑定陈小满，方便打开家长首页就能看到一条学习记录。

insert into public.parent_account (account, password_hash)
select
  'parent.demo',
  'pbkdf2-sha256$100000$cf77dd81611f272043bb97ca3383aeed$860d3ccdde33cf2ed1abc26b5d2c91b0e044108414cba8e41243c693d203131b'
where not exists (
  select 1 from public.parent_account where account = 'parent.demo'
);

insert into public.parent_binding (parent_account_id, student_id)
select p.id, s.id
from public.parent_account p
join public.student s on s.account = 'chenxiaoman'
where p.account = 'parent.demo'
  and not exists (
    select 1
    from public.parent_binding b
    where b.parent_account_id = p.id
      and b.student_id = s.id
  );
