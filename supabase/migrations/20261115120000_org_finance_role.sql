-- 机构成员角色：财务只对 admin 开放。老师账号可以登录机构端，但不能读财务接口。
alter table public.org_admin
  add column if not exists role text not null default 'admin';

alter table public.org_admin drop constraint if exists org_admin_role_check;
alter table public.org_admin
  add constraint org_admin_role_check check (role in ('admin', 'teacher'));

comment on column public.org_admin.role is 'admin 可进财务；teacher 不能。角色只从这一列读取，不信前端传参。';

-- 开票申请记在原账单上，不新增可删除的业务行。
alter table public.billing_record
  add column if not exists invoice_title text,
  add column if not exists invoice_tax_no text;

comment on column public.billing_record.invoice_title is '机构申请开票时填写的抬头。账单不物理删除。';
comment on column public.billing_record.invoice_tax_no is '机构申请开票时填写的纳税人识别号。';

-- 演示机构的老师。密码哈希与机构管理员演示账号相同，明文不入库。
insert into public.org_admin (org_id, account, password_hash, status, role)
select o.id,
  'teacherorg0001@daima-chuangguan.local',
  'pbkdf2-sha256$100000$11ca2e565874cf5470a21a3098e396b0$ef6e9207e214957012b6c3808295168e57940c4a261f4013834fa4a31c876b41',
  'active',
  'teacher'
from public.org o
where o.org_no = 'ORG-0001'
  and not exists (
    select 1 from public.org_admin a
    where a.account = 'teacherorg0001@daima-chuangguan.local'
  );
