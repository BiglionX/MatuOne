-- 课程从单表平铺改成四级：学段 → 学期 → 单元 → 课时。
-- 四年 × 两学期 × 每学期 120 节 = 960。已写好的 12 节挂进这条链，其余学期先留空。
-- learning_record 的主键是 (student_id, level_id)，没有 org_id。
-- 换机构只改 student.org_id；在家登录也只按 student_id 把地图取回来。

create table public.curriculum_stage (
  stage_id text primary key,
  title text not null,
  sort_order integer not null unique check (sort_order > 0),
  created_at timestamptz not null default now()
);

create table public.curriculum_semester (
  semester_id text primary key,
  stage_id text not null references public.curriculum_stage (stage_id),
  title text not null,
  term text not null check (term in ('fall', 'spring')),
  sort_order integer not null check (sort_order > 0),
  level_cap integer not null default 120 check (level_cap > 0),
  created_at timestamptz not null default now(),
  unique (stage_id, term),
  unique (stage_id, sort_order)
);

comment on column public.curriculum_semester.level_cap is
  '一个学期最多容纳的课时数。默认 120，四个学段各两学期，合计 960 节。';

create table public.curriculum_unit (
  unit_id text primary key,
  semester_id text not null references public.curriculum_semester (semester_id),
  title text not null,
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default now(),
  unique (semester_id, sort_order)
);

insert into public.curriculum_stage (stage_id, title, sort_order) values
  ('G2', '二年级', 1),
  ('G3', '三年级', 2),
  ('G4', '四年级', 3),
  ('G5', '五年级', 4);

insert into public.curriculum_semester (semester_id, stage_id, title, term, sort_order) values
  ('G2-fall', 'G2', '二年级上', 'fall', 1),
  ('G2-spring', 'G2', '二年级下', 'spring', 2),
  ('G3-fall', 'G3', '三年级上', 'fall', 1),
  ('G3-spring', 'G3', '三年级下', 'spring', 2),
  ('G4-fall', 'G4', '四年级上', 'fall', 1),
  ('G4-spring', 'G4', '四年级下', 'spring', 2),
  ('G5-fall', 'G5', '五年级上', 'fall', 1),
  ('G5-spring', 'G5', '五年级下', 'spring', 2);

insert into public.curriculum_unit (unit_id, semester_id, title, sort_order) values
  ('G2-fall-u1', 'G2-fall', '第一单元 开口与直线', 1),
  ('G3-fall-u1', 'G3-fall', '第一单元 变量的小盒子', 1),
  ('G3-fall-u2', 'G3-fall', '第二单元 循环的魔法', 2),
  ('G3-fall-u3', 'G3-fall', '第三单元 让海龟做选择', 3),
  ('G3-fall-u4', 'G3-fall', '第四单元 越画越大', 4),
  ('G3-fall-u5', 'G3-fall', '第五单元 阶段作品', 5),
  ('G5-spring-inbox', 'G5-spring', '待归入单元', 1);

alter table public.course_level
  add column unit_id text,
  add column knowledge_tags text[] not null default '{}',
  add column level_type text not null default 'new',
  add column milestone_badge text;

comment on column public.course_level.level_type is
  '课型：new 新授，practice 练习，project 项目，typing 打字。正文 body.level_type 仍是回合形态（normal / fill_blank / debug），两者不要混用。';

comment on column public.course_level.milestone_badge is
  '完成本课要颁发的里程碑徽章标识。null 表示不颁发。';

comment on column public.course_level.knowledge_tags is
  '这一课覆盖的知识点，例如 for_loop、range。';

update public.course_level set
  unit_id = 'G2-fall-u1',
  level_type = 'new',
  knowledge_tags = array['print'],
  milestone_badge = null
where level_id = 'L01';

update public.course_level set
  unit_id = 'G2-fall-u1',
  level_type = 'new',
  knowledge_tags = array['forward', 'right'],
  milestone_badge = null
where level_id = 'L02';

update public.course_level set
  unit_id = 'G2-fall-u1',
  level_type = 'practice',
  knowledge_tags = array['forward', 'right'],
  milestone_badge = null
where level_id = 'L03';

update public.course_level set
  unit_id = 'G3-fall-u1',
  level_type = 'new',
  knowledge_tags = array['variable'],
  milestone_badge = null
where level_id = 'L04';

update public.course_level set
  unit_id = 'G3-fall-u1',
  level_type = 'practice',
  knowledge_tags = array['variable', 'angle'],
  milestone_badge = null
where level_id = 'L05';

update public.course_level set
  unit_id = 'G3-fall-u2',
  level_type = 'new',
  knowledge_tags = array['for_loop', 'range'],
  milestone_badge = null
where level_id = 'L06';

update public.course_level set
  unit_id = 'G3-fall-u2',
  level_type = 'practice',
  knowledge_tags = array['for_loop', 'range'],
  milestone_badge = 'loop_magic'
where level_id = 'L07';

update public.course_level set
  unit_id = 'G3-fall-u3',
  level_type = 'new',
  knowledge_tags = array['if', 'else'],
  milestone_badge = null
where level_id = 'L08';

update public.course_level set
  unit_id = 'G3-fall-u3',
  level_type = 'practice',
  knowledge_tags = array['if', 'for_loop'],
  milestone_badge = null
where level_id = 'L09';

update public.course_level set
  unit_id = 'G3-fall-u4',
  level_type = 'new',
  knowledge_tags = array['variable', 'for_loop'],
  milestone_badge = null
where level_id = 'L10';

update public.course_level set
  unit_id = 'G3-fall-u4',
  level_type = 'practice',
  knowledge_tags = array['variable'],
  milestone_badge = null
where level_id = 'L11';

update public.course_level set
  unit_id = 'G3-fall-u5',
  level_type = 'project',
  knowledge_tags = array['for_loop', 'nested_loop', 'variable'],
  milestone_badge = 'star_flower'
where level_id = 'L12';

update public.course_level
set unit_id = 'G5-spring-inbox'
where unit_id is null;

alter table public.course_level
  alter column unit_id set default 'G5-spring-inbox',
  alter column unit_id set not null;

alter table public.course_level
  add constraint course_level_unit_fk foreign key (unit_id) references public.curriculum_unit (unit_id);

alter table public.course_level
  add constraint course_level_level_type_chk check (level_type in ('new', 'practice', 'project', 'typing'));

alter table public.course_level
  add constraint course_level_milestone_badge_chk check (milestone_badge is null or char_length(btrim(milestone_badge)) > 0);

create or replace function public.knowledge_tags_ok(tags text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select tags is not null
    and not exists (
      select 1 from unnest(tags) as tag
      where tag is null or char_length(btrim(tag)) = 0
    )
$$;

alter table public.course_level
  add constraint course_level_knowledge_tags_chk check (public.knowledge_tags_ok(knowledge_tags));

create index course_level_unit_idx on public.course_level (unit_id, sort_order);
create index curriculum_semester_stage_idx on public.curriculum_semester (stage_id, sort_order);
create index curriculum_unit_semester_idx on public.curriculum_unit (semester_id, sort_order);

create or replace function public.enforce_semester_level_cap()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_semester text;
  v_cap integer;
  v_count integer;
begin
  select u.semester_id into v_semester
  from public.curriculum_unit u
  where u.unit_id = new.unit_id;

  select s.level_cap into v_cap
  from public.curriculum_semester s
  where s.semester_id = v_semester;

  select count(*)::int into v_count
  from public.course_level cl
  join public.curriculum_unit u on u.unit_id = cl.unit_id
  where u.semester_id = v_semester
    and cl.level_id <> new.level_id;

  if v_cap is not null and v_count >= v_cap then
    raise exception '这个学期最多 % 节课', v_cap;
  end if;
  return new;
end;
$$;

create trigger course_level_semester_cap
  before insert or update of unit_id on public.course_level
  for each row execute function public.enforce_semester_level_cap();

create table public.learning_record (
  student_id uuid not null references public.student (id),
  level_id text not null references public.course_level (level_id),
  completed boolean not null default false,
  stars integer not null default 0 check (stars between 0 and 3),
  change_done boolean not null default false,
  error_taps integer not null default 0,
  runs integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, level_id)
);

comment on table public.learning_record is
  '学习进度只挂在学生和课时上。主键是 (student_id, level_id)，禁止加入 org_id。换机构或在家登录按 student_id 取回。';

insert into public.learning_record (
  student_id, level_id, completed, stars, change_done, error_taps, runs, updated_at
)
select
  lp.student_id, lp.level_id, lp.completed, lp.stars, lp.change_done, lp.error_taps, lp.runs, lp.updated_at
from public.level_progress lp
where exists (
  select 1 from public.course_level cl where cl.level_id = lp.level_id
)
on conflict (student_id, level_id) do nothing;

comment on table public.level_progress is
  '旧进度表，保留不删。新的读写走 learning_record。';

create or replace function public.student_curriculum_position(p_student_id uuid)
returns table (
  source text,
  completed_count integer,
  current_order integer,
  stage_id text,
  stage_title text,
  stage_sort integer,
  semester_id text,
  semester_title text,
  semester_term text,
  semester_sort integer,
  unit_id text,
  unit_title text,
  unit_sort integer,
  level_id text,
  level_title text,
  level_sort integer,
  level_type text,
  knowledge_tags text[],
  milestone_badge text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_has boolean;
  v_fallback integer;
  v_total integer;
  v_target integer;
  v_completed integer;
  v_level public.course_level%rowtype;
begin
  -- 只接收 student_id。机构从学生行上读，不作为进度的键。
  select exists (
    select 1 from public.learning_record lr where lr.student_id = p_student_id
  ) into v_has;

  select count(*)::int into v_total from public.course_level cl where cl.published;
  v_completed := 0;

  if v_has then
    select count(*)::int into v_completed
    from public.learning_record lr
    join public.course_level cl on cl.level_id = lr.level_id
    where lr.student_id = p_student_id
      and lr.completed
      and cl.published;

    select cl.* into v_level
    from public.course_level cl
    where cl.published
      and not exists (
        select 1 from public.learning_record lr
        where lr.student_id = p_student_id
          and lr.level_id = cl.level_id
          and lr.completed
      )
    order by cl.sort_order
    limit 1;

    if not found then
      select cl.* into v_level
      from public.course_level cl
      where cl.published
      order by cl.sort_order desc
      limit 1;
    end if;
  else
    select coalesce(s.current_level_order, 1) into v_fallback
    from public.student s
    where s.id = p_student_id;
    v_fallback := coalesce(v_fallback, 1);
    v_target := least(greatest(v_fallback, 1), greatest(v_total, 1));
    v_completed := greatest(0, v_target - 1);

    select cl.* into v_level
    from public.course_level cl
    where cl.published
      and cl.sort_order >= v_target
    order by cl.sort_order
    limit 1;

    if not found then
      select cl.* into v_level
      from public.course_level cl
      where cl.published
      order by cl.sort_order desc
      limit 1;
    end if;
  end if;

  if v_level.level_id is null then
    return;
  end if;

  return query
  select
    case when v_has then 'progress' else 'mock' end,
    v_completed,
    v_level.sort_order,
    st.stage_id,
    st.title,
    st.sort_order,
    se.semester_id,
    se.title,
    se.term,
    se.sort_order,
    u.unit_id,
    u.title,
    u.sort_order,
    v_level.level_id,
    v_level.title,
    v_level.sort_order,
    v_level.level_type,
    v_level.knowledge_tags,
    v_level.milestone_badge
  from public.curriculum_unit u
  join public.curriculum_semester se on se.semester_id = u.semester_id
  join public.curriculum_stage st on st.stage_id = se.stage_id
  where u.unit_id = v_level.unit_id;
end;
$$;

comment on function public.student_curriculum_position(uuid) is
  '按 student_id 返回当前学段、学期、单元和课时。没有 learning_record 时才回落到 student.current_level_order。不接收 org_id。';

create trigger curriculum_stage_no_delete before delete on public.curriculum_stage
  for each row execute function public.forbid_business_delete();
create trigger curriculum_semester_no_delete before delete on public.curriculum_semester
  for each row execute function public.forbid_business_delete();
create trigger curriculum_unit_no_delete before delete on public.curriculum_unit
  for each row execute function public.forbid_business_delete();
create trigger learning_record_no_delete before delete on public.learning_record
  for each row execute function public.forbid_business_delete();

alter table public.curriculum_stage enable row level security;
alter table public.curriculum_semester enable row level security;
alter table public.curriculum_unit enable row level security;
alter table public.learning_record enable row level security;

revoke all on public.curriculum_stage from public, anon, authenticated;
revoke all on public.curriculum_semester from public, anon, authenticated;
revoke all on public.curriculum_unit from public, anon, authenticated;
revoke all on public.learning_record from public, anon, authenticated;

revoke all on function public.knowledge_tags_ok(text[]) from public, anon, authenticated;
revoke all on function public.enforce_semester_level_cap() from public, anon, authenticated;
revoke all on function public.student_curriculum_position(uuid) from public, anon, authenticated;
grant execute on function public.knowledge_tags_ok(text[]) to service_role;
grant execute on function public.student_curriculum_position(uuid) to service_role;
