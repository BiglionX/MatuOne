-- 教学文案可以在后台就地保存。课文、代码和报错映射仍只由课程包 JSON 写入。
-- 每次保存文案，course_level.revision_count 加 1，并追加一条 content_history。不删除历史。

alter table public.course_level
  add column if not exists revision_count integer not null default 0;

comment on column public.course_level.revision_count is
  '教学文案就地保存的次数。课程包导入不改这个数。';

create table if not exists public.content_history (
  id uuid primary key default gen_random_uuid(),
  level_id text not null references public.course_level (level_id),
  field text not null check (field in ('goal', 'teaching_intent', 'parent_brief', 'teacher_guide')),
  previous_text text,
  next_text text,
  revision_count integer not null check (revision_count > 0),
  editor_id uuid not null references public.platform_staff (id),
  editor_name text not null,
  created_at timestamptz not null default now()
);

comment on table public.content_history is
  '教学文案的修改记录：谁在什么时候改了哪一段。只追加，不删除。';

create index if not exists content_history_level_idx
  on public.content_history (level_id, created_at desc);

alter table public.content_history enable row level security;

revoke all on public.content_history from public, anon, authenticated;

drop trigger if exists content_history_no_delete on public.content_history;
create trigger content_history_no_delete
  before delete on public.content_history
  for each row execute function public.forbid_business_delete();

create or replace function public.save_course_copy(
  p_level_id text,
  p_field text,
  p_text text,
  p_editor_id uuid,
  p_editor_name text
) returns table (changed boolean, revision_count integer, stored_text text)
language plpgsql
security definer
set search_path = public
as $$
declare
  prev text;
  next_rev integer;
  stored text;
begin
  if p_field not in ('goal', 'teaching_intent', 'parent_brief', 'teacher_guide') then
    raise exception '文案字段不正确';
  end if;
  if p_editor_id is null or length(trim(coalesce(p_editor_name, ''))) = 0 then
    raise exception '需要平台运营权限';
  end if;
  if p_text is null or length(trim(p_text)) = 0 then
    if p_field = 'goal' then
      raise exception '学习目标不能为空';
    end if;
    stored := null;
  else
    stored := trim(p_text);
    if length(stored) > 2000 then
      raise exception '文案请控制在 2000 字以内';
    end if;
  end if;

  select case p_field
    when 'goal' then goal
    when 'teaching_intent' then teaching_intent
    when 'parent_brief' then parent_brief
    else teacher_guide
  end
  into prev
  from public.course_level
  where level_id = p_level_id
  for update;

  if not found then
    raise exception '没有找到这一关';
  end if;

  if prev is not distinct from stored then
    select cl.revision_count into next_rev from public.course_level cl where cl.level_id = p_level_id;
    return query select false, next_rev, stored;
    return;
  end if;

  update public.course_level cl
  set
    goal = case when p_field = 'goal' then stored else cl.goal end,
    teaching_intent = case when p_field = 'teaching_intent' then stored else cl.teaching_intent end,
    parent_brief = case when p_field = 'parent_brief' then stored else cl.parent_brief end,
    teacher_guide = case when p_field = 'teacher_guide' then stored else cl.teacher_guide end,
    body = case
      when p_field = 'goal' then jsonb_set(cl.body, '{goal}', to_jsonb(stored), true)
      else cl.body
    end,
    revision_count = cl.revision_count + 1,
    updated_at = now()
  where cl.level_id = p_level_id
  returning cl.revision_count into next_rev;

  insert into public.content_history (
    level_id, field, previous_text, next_text, revision_count, editor_id, editor_name
  ) values (
    p_level_id, p_field, prev, stored, next_rev, p_editor_id, trim(p_editor_name)
  );

  return query select true, next_rev, stored;
end;
$$;

revoke all on function public.save_course_copy(text, text, text, uuid, text) from public, anon, authenticated;
