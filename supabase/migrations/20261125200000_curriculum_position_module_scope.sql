-- 把 student_curriculum_position() 的学习记录查询限定在 Python 模块。
--
-- 背景：learning_record 已在 20261125130000 加上 module_id 列（default 'python'），
-- blockly / easy-robot 即将开始往这张表写进度。这个函数体里有三处读 learning_record，
-- 都没带 module_id 过滤，模块一开课就会串味。
--
-- 这个函数是 Python 课程位置函数：返回的整棵树全是 Python 课程表的字段
-- （course_level / curriculum_unit / curriculum_semester / curriculum_stage），
-- 调用方也是 Python 学习首页和家长端。所以这里"有没有学习记录"的正确含义就是
-- "有没有 Python 的学习记录"，按模块过滤不是改变语义，是把语义写对。
--
--
-- 精确的影响范围（排查时看这段，别搞混了）：
--
--   A 处（exists -> v_has）真正的 bug 场景只有一个：
--     「有 blockly 记录、但还没有 Python 记录」的学生，会被当成已有进度。
--     这类学生 v_has 从 false 变 true，函数从 mock 分支跳到 progress 分支，
--     结果是 completed_count 归零、current_order 被打回第 1 关，
--     机构在 student.current_level_order 上给他排的位置直接失效。
--
--   已经有 Python 记录的学生不受影响：A 处的 exists 本来就是 true，
--   加不加 module_id = 'python' 结果一样。
--
--   也就是说：老学生测不出这个 bug。
--   要复现必须用一个「只有 blockly 记录、没有 Python 记录」的新学生：
--   他在 Python 侧一节课都没上，位置本该走 student.current_level_order 的 mock 分支。
--
--
-- 三处分别为什么改：
--
--   A（第 298-300 行）必须改。这是真 bug 修复，行为会变。
--       select exists (
--         select 1 from public.learning_record lr where lr.student_id = p_student_id
--       ) into v_has;
--     v_has 同时决定 source 字段（progress / mock）和走哪个分支，
--     不过滤的话 blockly 记录会把 blockly-only 学生的 Python 位置打回第 1 关。
--
--   B（第 306-311 行）今天等价，加过滤只为把语义写显式。
--     select count(*)::int into v_completed
--     from public.learning_record lr
--     join public.course_level cl on cl.level_id = lr.level_id
--     ...
--     inner join course_level 已经把不在 course_level 里的 level_id（blk-001 之类）排除了，
--     所以现在加不加过滤结果完全一样。加它是为了挡住将来 module_level 的 level_id
--     和 course_level 撞号的情况。
--
--   C（第 316-321 行）今天等价，加过滤只为把语义写显式。
--     not exists (select 1 from public.learning_record lr where lr.student_id = ... and lr.level_id = cl.level_id and lr.completed)
--     外层遍历的是 Python 关卡，内层按 level_id 匹配；
--     blockly 用 blk- / robot- 前缀不会撞，而且 learning_record 主键是 (student_id, level_id)，
--     同一学生同一 level_id 只存得下一行。加过滤是显式化，不是必需。
--
--
-- 本文件只重写这一个函数，函数体其余部分逐行照抄 20261113180000_curriculum_hierarchy.sql
-- 的定义，不顺手重构。函数签名、返回表的 19 个字段、language plpgsql / stable /
-- security definer / set search_path = public 全部保持原样，不动其他 SQL 函数，
-- 不改表结构，不写任何数据回填。
--
-- create or replace 本身幂等，Neon 跨语句没有事务也不怕，重跑即可。


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
  -- 这里只看 Python 的学习记录：blockly / easy-robot 的进度不算 Python 的进度。
  select exists (
    select 1 from public.learning_record lr where lr.student_id = p_student_id and lr.module_id = 'python'
  ) into v_has;

  select count(*)::int into v_total from public.course_level cl where cl.published;
  v_completed := 0;

  if v_has then
    select count(*)::int into v_completed
    from public.learning_record lr
    join public.course_level cl on cl.level_id = lr.level_id
    where lr.student_id = p_student_id
      and lr.module_id = 'python'
      and lr.completed
      and cl.published;

    select cl.* into v_level
    from public.course_level cl
    where cl.published
      and not exists (
        select 1 from public.learning_record lr
        where lr.student_id = p_student_id
          and lr.module_id = 'python'
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
  '按 student_id 返回当前 Level、单元和课时。只看 Python 模块（module_id = ''python''）的学习记录；没有 Python 学习记录时才回落到 student.current_level_order。不接收 org_id。';


-- 验收 SQL（迁移后逐条跑）
--
-- A. 改前改后返回值必须逐列一致
-- select * from public.student_curriculum_position('<student_id>');
--
-- B. 库里现有 learning_record 全部是 python，所以本次改写是等价改写
-- select module_id, count(*) from public.learning_record group by module_id;
--
-- C. 复现 A 处 bug 的学生（改完后这条应为 false，has_python 为 false）
-- select exists (select 1 from public.learning_record lr where lr.student_id = '<sid>' and lr.module_id = 'python') as has_python,
--        exists (select 1 from public.learning_record lr where lr.student_id = '<sid>') as has_any;
