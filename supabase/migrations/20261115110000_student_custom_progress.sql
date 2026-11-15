-- 学生在机构专属课里的学习记录。完成一节写一行，不物理删除。
-- 学生身份只由调用方从会话传入。函数再核对机构状态、分配和前序环节。

create table public.org_custom_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student (id),
  course_id uuid not null references public.org_custom_course (id),
  section_id uuid not null references public.org_custom_section (id),
  completed_at timestamptz not null default now(),
  unique (student_id, section_id)
);

comment on table public.org_custom_progress is '学生完成机构专属课一个环节的记录。行不删除，重复完成只更新完成时间。';

create index org_custom_progress_student_course_idx
  on public.org_custom_progress (student_id, course_id);

create or replace function public.org_custom_progress_guard()
returns trigger
language plpgsql
as $$
begin
  if new.student_id is distinct from old.student_id
     or new.course_id is distinct from old.course_id
     or new.section_id is distinct from old.section_id then
    raise exception '学习记录不能改挂到别的环节';
  end if;
  return new;
end;
$$;

create trigger org_custom_progress_guard
  before update on public.org_custom_progress
  for each row execute function public.org_custom_progress_guard();

create trigger org_custom_progress_no_delete
  before delete on public.org_custom_progress
  for each row execute function public.forbid_business_delete();

alter table public.org_custom_progress enable row level security;
revoke all on public.org_custom_progress from public, anon, authenticated;
revoke all on function public.org_custom_progress_guard() from public, anon, authenticated;

-- 学生是否还能看这门课。停用机构直接拒绝。到期仍可查看，完成记录由后面的函数拒绝。
create or replace function public.assert_student_custom_access(p_student_id uuid, p_course_id uuid)
returns table (org_id uuid, org_status text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_group text;
  v_status text;
begin
  select s.org_id, s.group_id into v_org, v_group
  from public.student s
  where s.id = p_student_id and s.status = 'active';
  if v_org is null then
    raise exception '请先登录';
  end if;

  select public.effective_org_status(o.status, o.trial_expire_at, o.service_end_at)
    into v_status
  from public.org o
  where o.id = v_org;
  if v_status is null or v_status = 'disabled' then
    raise exception '机构已停用';
  end if;

  if p_course_id is not null then
    if not exists (
      select 1 from public.org_custom_course c
      where c.id = p_course_id and c.org_id = v_org and c.removed_at is null
    ) then
      raise exception '课程不存在';
    end if;
    if not exists (
      select 1 from public.org_custom_course_assignment a
      where a.course_id = p_course_id
        and a.removed_at is null
        and (
          (a.subject_type = 'student' and a.subject_id = p_student_id)
          or (a.subject_type = 'group' and a.subject_id::text = v_group)
        )
    ) then
      raise exception '这门课没有分给你';
    end if;
  end if;

  return query select v_org, v_status;
end;
$$;

create or replace function public.student_custom_course_outline(p_student_id uuid)
returns table (
  course_id uuid,
  course_title text,
  read_only boolean,
  section_index integer,
  section_order integer,
  section_type text,
  section_title text,
  completed boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_status text;
begin
  select a.org_id, a.org_status into v_org, v_status
  from public.assert_student_custom_access(p_student_id, null) a;

  return query
  select
    c.id,
    c.title,
    v_status = 'expired',
    (row_number() over (partition by c.id order by s."order") - 1)::integer,
    s."order",
    s.type,
    s.title,
    exists (
      select 1 from public.org_custom_progress p
      where p.student_id = p_student_id and p.section_id = s.id
    )
  from public.org_custom_course c
  join public.org_custom_section s on s.course_id = c.id and s.removed_at is null
  where c.org_id = v_org
    and c.removed_at is null
    and exists (
      select 1 from public.org_custom_course_assignment a
      join public.student st on st.id = p_student_id
      where a.course_id = c.id
        and a.removed_at is null
        and (
          (a.subject_type = 'student' and a.subject_id = p_student_id)
          or (a.subject_type = 'group' and a.subject_id::text = st.group_id)
        )
    )
  order by c.created_at, s."order";
end;
$$;

create or replace function public.student_custom_section_at(
  p_student_id uuid,
  p_course_id uuid,
  p_index integer
)
returns table (
  course_title text,
  section_index integer,
  next_index integer,
  section_type text,
  section_title text,
  platform_level_id text,
  file_type text,
  file_url text,
  content text,
  material_name text,
  read_only boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_status text;
  v_total integer;
begin
  if p_index is null or p_index < 0 then
    raise exception '环节不存在';
  end if;

  select a.org_id, a.org_status into v_org, v_status
  from public.assert_student_custom_access(p_student_id, p_course_id) a;

  select count(*)::integer into v_total
  from public.org_custom_section s
  where s.course_id = p_course_id and s.removed_at is null;
  if p_index >= v_total then
    raise exception '环节不存在';
  end if;

  if exists (
    select 1
    from (
      select s.id, row_number() over (order by s."order") - 1 as idx
      from public.org_custom_section s
      where s.course_id = p_course_id and s.removed_at is null
    ) prior
    where prior.idx < p_index
      and not exists (
        select 1 from public.org_custom_progress p
        where p.student_id = p_student_id and p.section_id = prior.id
      )
  ) then
    raise exception '前面的环节还没完成';
  end if;

  return query
  select
    c.title,
    p_index,
    (case when p_index + 1 < v_total then p_index + 1 else null end)::integer,
    picked.type,
    picked.title,
    picked.platform_level_id,
    m.file_type,
    case when m.org_id = v_org and m.removed_at is null then m.file_url else null end,
    case when m.org_id = v_org and m.removed_at is null then m.content else null end,
    case when m.org_id = v_org and m.removed_at is null then m.name else picked.title end,
    v_status = 'expired'
  from public.org_custom_course c
  join (
    select s.type, s.title, s.platform_level_id, s.material_id,
           row_number() over (order by s."order") - 1 as idx
    from public.org_custom_section s
    where s.course_id = p_course_id and s.removed_at is null
  ) picked on picked.idx = p_index
  left join public.org_material m on m.id = picked.material_id
  where c.id = p_course_id;
end;
$$;

create or replace function public.complete_org_custom_section(
  p_student_id uuid,
  p_course_id uuid,
  p_index integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_section uuid;
  v_total integer;
begin
  select a.org_status into v_status
  from public.assert_student_custom_access(p_student_id, p_course_id) a;
  if v_status = 'expired' then
    raise exception '本机构服务已到期';
  end if;
  if v_status is distinct from 'trial' and v_status is distinct from 'active' then
    raise exception '机构已停用';
  end if;

  if p_index is null or p_index < 0 then
    raise exception '环节不存在';
  end if;

  select count(*)::integer into v_total
  from public.org_custom_section s
  where s.course_id = p_course_id and s.removed_at is null;
  if p_index >= v_total then
    raise exception '环节不存在';
  end if;

  if exists (
    select 1
    from (
      select s.id, row_number() over (order by s."order") - 1 as idx
      from public.org_custom_section s
      where s.course_id = p_course_id and s.removed_at is null
    ) prior
    where prior.idx < p_index
      and not exists (
        select 1 from public.org_custom_progress p
        where p.student_id = p_student_id and p.section_id = prior.id
      )
  ) then
    raise exception '前面的环节还没完成';
  end if;

  select picked.id into v_section
  from (
    select s.id, row_number() over (order by s."order") - 1 as idx
    from public.org_custom_section s
    where s.course_id = p_course_id and s.removed_at is null
  ) picked
  where picked.idx = p_index;
  if v_section is null then
    raise exception '环节不存在';
  end if;

  insert into public.org_custom_progress (student_id, course_id, section_id)
  values (p_student_id, p_course_id, v_section)
  on conflict (student_id, section_id) do update set completed_at = now();

  if p_index + 1 < v_total then
    return p_index + 1;
  end if;
  return null;
end;
$$;

revoke all on function public.assert_student_custom_access(uuid, uuid) from public, anon, authenticated;
revoke all on function public.student_custom_course_outline(uuid) from public, anon, authenticated;
revoke all on function public.student_custom_section_at(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.complete_org_custom_section(uuid, uuid, integer) from public, anon, authenticated;

grant execute on function public.assert_student_custom_access(uuid, uuid) to service_role;
grant execute on function public.student_custom_course_outline(uuid) to service_role;
grant execute on function public.student_custom_section_at(uuid, uuid, integer) to service_role;
grant execute on function public.complete_org_custom_section(uuid, uuid, integer) to service_role;
