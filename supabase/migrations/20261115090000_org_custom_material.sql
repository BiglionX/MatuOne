-- 机构自定义课程包与素材库。
-- 业务行不物理删除：素材和课程包用 removed_at 停用。
-- 接口只按会话里的 org_id 读写。下面的 RLS / Storage 策略是直接访问时的第二道隔离。
-- 没有 auth.uid() 或 storage 的库（例如当前 Neon）只建表并收回匿名权限。

create table public.org_custom_course (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

comment on table public.org_custom_course is '机构自定义课程包，例如「王老师的 Python 启蒙」。';

create table public.org_material (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.org (id),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  file_type text not null check (file_type in ('image', 'pdf', 'ppt', 'text')),
  file_url text not null default '',
  content text,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  constraint org_material_payload check (
    (file_type = 'text' and content is not null and char_length(btrim(content)) > 0)
    or (file_type in ('image', 'pdf', 'ppt') and char_length(file_url) > 0)
  )
);

comment on table public.org_material is '机构上传的素材。file_url 是本机构 Storage 目录下的对象路径。';
comment on column public.org_material.file_url is '对象路径 {org_id}/{material_id}/{file}，不是可公开访问的链接。';
comment on column public.org_material.content is '文本或题目正文。图片和 PDF 留空。';

create table public.org_custom_section (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.org_custom_course (id),
  "order" integer not null check ("order" >= 1),
  type text not null check (type in ('platform_level', 'material')),
  platform_level_id text references public.course_level (level_id),
  material_id uuid references public.org_material (id),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now(),
  constraint org_custom_section_link check (
    (type = 'platform_level' and platform_level_id is not null and material_id is null)
    or (type = 'material' and material_id is not null and platform_level_id is null)
  ),
  unique (course_id, "order")
);

comment on table public.org_custom_section is '自定义课程里的环节。"order" 是课内排序。';
comment on column public.org_custom_section."order" is '环节排序，从 1 开始。';

create index org_custom_course_org_id_idx on public.org_custom_course (org_id);
create index org_material_org_id_idx on public.org_material (org_id) where removed_at is null;
create index org_custom_section_course_idx on public.org_custom_section (course_id, "order");

create or replace function public.org_custom_course_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.org_id is distinct from old.org_id then
    raise exception '不能改所属机构';
  end if;
  return new;
end;
$$;

create or replace function public.org_material_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.org_id is distinct from old.org_id then
    raise exception '不能改所属机构';
  end if;
  if new.file_type <> 'text' and (
    position('..' in new.file_url) > 0
    or lower(split_part(new.file_url, '/', 1)) is distinct from lower(new.org_id::text)
  ) then
    raise exception '素材地址必须放在本机构目录';
  end if;
  return new;
end;
$$;

create or replace function public.org_custom_section_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_org uuid;
  v_material_org uuid;
begin
  select c.org_id into v_org
  from public.org_custom_course c
  where c.id = new.course_id and c.removed_at is null;
  if v_org is null then
    raise exception '课程不存在';
  end if;
  if new.material_id is not null then
    select m.org_id into v_material_org
    from public.org_material m
    where m.id = new.material_id and m.removed_at is null;
    if v_material_org is null or v_material_org <> v_org then
      raise exception '素材不属于这门课程的机构';
    end if;
  end if;
  return new;
end;
$$;

create trigger org_custom_course_guard
  before insert or update on public.org_custom_course
  for each row execute function public.org_custom_course_guard();
create trigger org_material_guard
  before insert or update on public.org_material
  for each row execute function public.org_material_guard();
create trigger org_custom_section_guard
  before insert or update on public.org_custom_section
  for each row execute function public.org_custom_section_guard();

create trigger org_custom_course_no_delete before delete on public.org_custom_course
  for each row execute function public.forbid_business_delete();
create trigger org_material_no_delete before delete on public.org_material
  for each row execute function public.forbid_business_delete();
create trigger org_custom_section_no_delete before delete on public.org_custom_section
  for each row execute function public.forbid_business_delete();

alter table public.org_custom_course enable row level security;
alter table public.org_material enable row level security;
alter table public.org_custom_section enable row level security;

revoke all on public.org_custom_course from public, anon, authenticated;
revoke all on public.org_material from public, anon, authenticated;
revoke all on public.org_custom_section from public, anon, authenticated;
revoke all on function public.org_custom_course_guard() from public, anon, authenticated;
revoke all on function public.org_material_guard() from public, anon, authenticated;
revoke all on function public.org_custom_section_guard() from public, anon, authenticated;

-- Supabase 登录用户只能碰到自己机构的行。没有 auth.uid() 时跳过，避免在 Neon 上建一个调用失败的函数。
do $rls$
begin
  if to_regprocedure('auth.uid()') is null then
    return;
  end if;

  execute $fn$
    create or replace function public.current_org_id()
    returns uuid
    language sql
    stable
    security definer
    set search_path = public
    as $body$
      select a.org_id
      from public.org_admin a
      where a.auth_user_id = auth.uid()
        and a.status = 'active'
      limit 1
    $body$
  $fn$;

  execute 'revoke all on function public.current_org_id() from public, anon';
  execute 'grant execute on function public.current_org_id() to authenticated';

  execute $pol$
    create policy org_custom_course_select on public.org_custom_course
    for select to authenticated
    using (org_id = public.current_org_id() and removed_at is null)
  $pol$;
  execute $pol$
    create policy org_custom_course_insert on public.org_custom_course
    for insert to authenticated
    with check (org_id = public.current_org_id() and removed_at is null)
  $pol$;
  execute $pol$
    create policy org_custom_course_update on public.org_custom_course
    for update to authenticated
    using (org_id = public.current_org_id() and removed_at is null)
    with check (org_id = public.current_org_id())
  $pol$;

  execute $pol$
    create policy org_material_select on public.org_material
    for select to authenticated
    using (org_id = public.current_org_id() and removed_at is null)
  $pol$;
  execute $pol$
    create policy org_material_insert on public.org_material
    for insert to authenticated
    with check (org_id = public.current_org_id() and removed_at is null)
  $pol$;
  execute $pol$
    create policy org_material_update on public.org_material
    for update to authenticated
    using (org_id = public.current_org_id() and removed_at is null)
    with check (org_id = public.current_org_id())
  $pol$;

  execute $pol$
    create policy org_custom_section_select on public.org_custom_section
    for select to authenticated
    using (
      exists (
        select 1 from public.org_custom_course c
        where c.id = org_custom_section.course_id
          and c.org_id = public.current_org_id()
          and c.removed_at is null
      )
    )
  $pol$;
  execute $pol$
    create policy org_custom_section_insert on public.org_custom_section
    for insert to authenticated
    with check (
      exists (
        select 1 from public.org_custom_course c
        where c.id = org_custom_section.course_id
          and c.org_id = public.current_org_id()
          and c.removed_at is null
      )
    )
  $pol$;
  execute $pol$
    create policy org_custom_section_update on public.org_custom_section
    for update to authenticated
    using (
      exists (
        select 1 from public.org_custom_course c
        where c.id = org_custom_section.course_id
          and c.org_id = public.current_org_id()
          and c.removed_at is null
      )
    )
    with check (
      exists (
        select 1 from public.org_custom_course c
        where c.id = org_custom_section.course_id
          and c.org_id = public.current_org_id()
      )
    )
  $pol$;

  execute 'grant select, insert, update on public.org_custom_course to authenticated';
  execute 'grant select, insert, update on public.org_material to authenticated';
  execute 'grant select, insert, update on public.org_custom_section to authenticated';
end
$rls$;

-- Storage：私有桶，对象第一级目录必须是当前机构 id。服务端用 service role 写入时仍要自己拼这个路径。
do $storage$
begin
  if to_regclass('storage.buckets') is null or to_regprocedure('public.current_org_id()') is null then
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('org-materials', 'org-materials', false)
  on conflict (id) do update set public = false;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit'
  ) then
    update storage.buckets
    set file_size_limit = 8388608
    where id = 'org-materials';
  end if;

  execute 'drop policy if exists org_materials_select on storage.objects';
  execute 'drop policy if exists org_materials_insert on storage.objects';
  execute 'drop policy if exists org_materials_update on storage.objects';
  execute 'drop policy if exists org_materials_delete on storage.objects';

  execute $pol$
    create policy org_materials_select on storage.objects
    for select to authenticated
    using (
      bucket_id = 'org-materials'
      and (storage.foldername(name))[1] = public.current_org_id()::text
    )
  $pol$;
  execute $pol$
    create policy org_materials_insert on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'org-materials'
      and (storage.foldername(name))[1] = public.current_org_id()::text
    )
  $pol$;
  execute $pol$
    create policy org_materials_update on storage.objects
    for update to authenticated
    using (
      bucket_id = 'org-materials'
      and (storage.foldername(name))[1] = public.current_org_id()::text
    )
    with check (
      bucket_id = 'org-materials'
      and (storage.foldername(name))[1] = public.current_org_id()::text
    )
  $pol$;
  execute $pol$
    create policy org_materials_delete on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'org-materials'
      and (storage.foldername(name))[1] = public.current_org_id()::text
    )
  $pol$;
end
$storage$;
