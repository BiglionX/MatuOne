-- Blockly / Easy Robot 首关占位数据：只有 title + goal，真实正文留到后续步骤覆盖。
-- Neon 跨语句没有事务，两条 insert 都按 (module_id, level_id) 幂等，可重复执行。

insert into public.module_level (module_id, level_id, sort_order, title, goal, body)
values (
  'blockly',
  'blk-001',
  1,
  '第一关（占位）',
  '目标是让角色走一步',
  '{"title":"第一关（占位）","goal":"让角色走一步"}'::jsonb
)
on conflict (module_id, level_id) do nothing;

insert into public.module_level (module_id, level_id, sort_order, title, goal, body)
values (
  'easy-robot',
  'robot-001',
  1,
  '第一关（占位）',
  '目标是让舵机转一下',
  '{"title":"第一关（占位）","goal":"让舵机转一下"}'::jsonb
)
on conflict (module_id, level_id) do nothing;
