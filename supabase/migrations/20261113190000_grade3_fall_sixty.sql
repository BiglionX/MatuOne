-- 三年级上收成 3 个单元、60 节。L01–L15 保留已有课文，L16–L60 只占结构。
-- 已有的空单元留在库里，不再挂课。业务行不删除。

update public.curriculum_unit set title = '第一单元 开口与海龟' where unit_id = 'G3-fall-u1';
update public.curriculum_unit set title = '第二单元 变量和判断' where unit_id = 'G3-fall-u2';
update public.curriculum_unit set title = '第三单元 循环画图' where unit_id = 'G3-fall-u3';

update public.course_level
set unit_id = 'G3-fall-u1'
where level_id in ('L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09', 'L10', 'L11', 'L12');

update public.course_level
set milestone_badge = 'turtle_hello'
where level_id = 'L03';

insert into public.course_level (
  level_id, sort_order, title, goal, body, published, unit_id, knowledge_tags, level_type, milestone_badge
) values
  (
    'L13', 13, '把 print 打准确', '把打印用过的关键词再打一遍',
    '{"level_id":"L13","order":13,"title":"把 print 打准确","goal":"把打印用过的关键词再打一遍","grade_range":"3-5","level_type":"normal","demo_code":"print(\"你好\")","expected_output":"你好","preview_kind":"text","teach_code_lines":["print(\"你好\")"],"keywords":["print","print()","print(\"\")"],"challenge_params":[],"error_mappings":[],"estimated_minutes":15}'::jsonb,
    true, 'G3-fall-u1', array['print'], 'typing', null
  ),
  (
    'L14', 14, '再练一次正方形', '用已经会的走和转，再画一个正方形',
    '{"level_id":"L14","order":14,"title":"再练一次正方形","goal":"用已经会的走和转，再画一个正方形","grade_range":"3-5","level_type":"normal","demo_code":"t.forward(80)\nt.right(90)\nt.forward(80)\nt.right(90)","expected_output":"一个正方形的一半","preview_kind":"turtle","teach_code_lines":["t.forward(80)","t.right(90)","t.forward(80)","t.right(90)"],"keywords":["t.forward","t.right","t.right(90)"],"challenge_params":[],"error_mappings":[],"estimated_minutes":15}'::jsonb,
    true, 'G3-fall-u1', array['forward', 'right'], 'practice', null
  ),
  (
    'L15', 15, '把重复收成循环', '看到四条边，就知道可以收成 for',
    '{"level_id":"L15","order":15,"title":"把重复收成循环","goal":"看到四条边，就知道可以收成 for","grade_range":"3-5","level_type":"normal","demo_code":"for i in range(4):\n    t.forward(80)\n    t.right(90)","expected_output":"一个正方形","preview_kind":"turtle","teach_code_lines":["for i in range(4):","    t.forward(80)","    t.right(90)"],"keywords":["for","range(4)","t.forward"],"challenge_params":[],"error_mappings":[],"estimated_minutes":15}'::jsonb,
    true, 'G3-fall-u1', array['for_loop', 'range'], 'new', null
  )
on conflict (level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  unit_id = excluded.unit_id,
  knowledge_tags = excluded.knowledge_tags,
  level_type = excluded.level_type,
  milestone_badge = excluded.milestone_badge,
  published = true,
  updated_at = now();

insert into public.course_level (
  level_id, sort_order, title, goal, body, published, unit_id, knowledge_tags, level_type, milestone_badge
)
select
  'L' || lpad(n::text, 2, '0'),
  n,
  '待补充项目实战',
  '这一节的项目还在准备。',
  jsonb_build_object(
    'level_id', 'L' || lpad(n::text, 2, '0'),
    'order', n,
    'title', '待补充项目实战',
    'goal', '这一节的项目还在准备。',
    'grade_range', '3-5',
    'level_type', 'normal',
    'demo_code', 'print("待补充")',
    'expected_output', '待补充',
    'preview_kind', 'text',
    'teach_code_lines', jsonb_build_array('print("待补充")'),
    'keywords', jsonb_build_array('print', 'pass', 'todo'),
    'challenge_params', '[]'::jsonb,
    'error_mappings', '[]'::jsonb,
    'estimated_minutes', 20
  ),
  true,
  case when n <= 20 then 'G3-fall-u1' when n <= 40 then 'G3-fall-u2' else 'G3-fall-u3' end,
  array['project'],
  case
    when n % 20 = 0 then 'project'
    when (n - 1) % 20 = 12 then 'typing'
    when n % 2 = 0 then 'practice'
    else 'new'
  end,
  case n when 20 then 'first_drawing' when 40 then 'variable_box' when 60 then 'loop_picture' else null end
from generate_series(16, 60) as n
on conflict (level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  unit_id = excluded.unit_id,
  knowledge_tags = excluded.knowledge_tags,
  level_type = excluded.level_type,
  milestone_badge = excluded.milestone_badge,
  published = true,
  updated_at = now();
