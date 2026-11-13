-- 把课程顶层从年级、学期改成 Level 1–8。
-- 不删除已有行。旧单元留在表里，课时改挂到 L1_U01 这种编号上。
-- 学习顺序不变：第 1–120 节是 Level 1，每级 6 个单元、120 节。

alter table public.curriculum_semester add column if not exists stage_level integer;
alter table public.curriculum_unit add column if not exists stage_level integer;
alter table public.course_level add column if not exists stage_level integer;

update public.curriculum_stage
set title = '阶段 ' || stage_id
where stage_id in ('G2', 'G3', 'G4', 'G5');

update public.curriculum_semester set stage_level = 1, title = 'Level 1' where semester_id = 'G3-fall';
update public.curriculum_semester set stage_level = 2, title = 'Level 2' where semester_id = 'G3-spring';
update public.curriculum_semester set stage_level = 3, title = 'Level 3' where semester_id = 'G4-fall';
update public.curriculum_semester set stage_level = 4, title = 'Level 4' where semester_id = 'G4-spring';
update public.curriculum_semester set stage_level = 5, title = 'Level 5' where semester_id = 'G5-fall';
update public.curriculum_semester set stage_level = 6, title = 'Level 6' where semester_id = 'G5-spring';
update public.curriculum_semester set stage_level = 7, title = 'Level 7' where semester_id = 'G2-fall';
update public.curriculum_semester set stage_level = 8, title = 'Level 8' where semester_id = 'G2-spring';

update public.curriculum_unit
set sort_order = sort_order + 200
where unit_id !~ '^L[1-8]_U[0-9]{2}$';

insert into public.curriculum_unit (unit_id, semester_id, title, sort_order, stage_level)
select
  'L' || m.stage_level || '_U' || lpad(n.unit_no::text, 2, '0'),
  m.semester_id,
  'Level ' || m.stage_level || ' · 单元 ' || n.unit_no,
  n.unit_no,
  m.stage_level
from (
  values
    (1, 'G3-fall'),
    (2, 'G3-spring'),
    (3, 'G4-fall'),
    (4, 'G4-spring'),
    (5, 'G5-fall'),
    (6, 'G5-spring'),
    (7, 'G2-fall'),
    (8, 'G2-spring')
) as m(stage_level, semester_id)
cross join generate_series(1, 6) as n(unit_no)
on conflict (unit_id) do update set
  semester_id = excluded.semester_id,
  title = excluded.title,
  sort_order = excluded.sort_order,
  stage_level = excluded.stage_level;

update public.course_level
set
  stage_level = ((sort_order - 1) / 120) + 1,
  unit_id = 'L' || (((sort_order - 1) / 120) + 1)::text || '_U' || lpad(((((sort_order - 1) % 120) / 20) + 1)::text, 2, '0')
where sort_order between 1 and 960;

update public.course_level
set
  title = 'Level ' || stage_level || ' · 单元 ' || ((((sort_order - 1) % 120) / 20) + 1) || ' · 第 ' || (((sort_order - 1) % 20) + 1) || ' 关',
  goal = '这一节先熟悉这一阶段的写法，课文还在编写。'
where sort_order > 20
   or sort_order between 16 and 18;

update public.course_level
set body = jsonb_set(coalesce(body, '{}'::jsonb) - 'grade_range', '{title}', to_jsonb(title), true)
where sort_order > 20
   or sort_order between 16 and 18;

update public.course_level
set body = body - 'grade_range'
where body ? 'grade_range';

update public.curriculum_unit
set title = '已归档单元'
where unit_id !~ '^L[1-8]_U[0-9]{2}$';

update public.curriculum_unit
set title = replace(replace(replace(title, '三年级', ''), '四年级', ''), '学期', '阶段')
where title ~ '三年级|四年级|学期';

update public.course_level
set
  title = replace(replace(replace(title, '三年级', ''), '四年级', ''), '学期', '阶段'),
  goal = replace(replace(replace(goal, '三年级', ''), '四年级', ''), '学期', '阶段')
where title ~ '三年级|四年级|学期'
   or goal ~ '三年级|四年级|学期';

update public.course_level
set body = replace(replace(replace(body::text, '三年级', ''), '四年级', ''), '学期', '阶段')::jsonb
where body::text ~ '三年级|四年级|学期';

update public.course_level
set stage_level = 1
where stage_level is null;

alter table public.course_level alter column unit_id set default 'L1_U01';

alter table public.course_level drop constraint if exists course_level_stage_level_chk;
alter table public.course_level
  add constraint course_level_stage_level_chk check (stage_level between 1 and 8);

comment on column public.curriculum_semester.level_cap is
  '一个 Level 最多容纳的课时数。默认 120，八个 Level 合计 960 节。';

comment on column public.curriculum_unit.stage_level is
  '课程阶段，1 到 8。同一 Level 有 6 个单元、120 节。';

comment on column public.course_level.stage_level is
  '课程阶段，1 到 8。由课时序号决定，不跟学校年级绑定。';

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
    raise exception '这个 Level 最多 % 节课', v_cap;
  end if;
  return new;
end;
$$;

comment on function public.student_curriculum_position(uuid) is
  '按 student_id 返回当前 Level、单元和课时。没有 learning_record 时才回落到 student.current_level_order。不接收 org_id。';
