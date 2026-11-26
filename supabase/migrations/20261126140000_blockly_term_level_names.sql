-- Blockly 的学期展示名从「一年级上 / 一年级下 / 二年级上 / 二年级下」改成 Level 序列，
-- 与 Python 侧的 Level 1–8 同一套口径：课程线内的顺序编号，不跟学校年级绑定。
--
-- 只改展示名：
--   term_id、term_code、sort_order、level_cap 与单元、关卡的归属全部不动，
--   learning_record 等业务数据也不受影响，解锁链路照旧。
--
-- stage_label 原本是「一年级 / 二年级」这种学段名，现在统一成课程线名，
-- 地图上标题上方那一行改显示「Blockly 课程线」，不再出现年级语义。
--
-- Neon 跨语句没有事务，每条语句都写成幂等的，重跑即可。

update public.module_term
set title = 'Level 0', stage_label = 'Blockly 课程线'
where module_id = 'blockly' and term_id = 'blk-g1-fall';

update public.module_term
set title = 'Level 1', stage_label = 'Blockly 课程线'
where module_id = 'blockly' and term_id = 'blk-g1-spring';

update public.module_term
set title = 'Level 2', stage_label = 'Blockly 课程线'
where module_id = 'blockly' and term_id = 'blk-g2-fall';

update public.module_term
set title = 'Level 3', stage_label = 'Blockly 课程线'
where module_id = 'blockly' and term_id = 'blk-g2-spring';

comment on table public.module_term is
  '模块课程线的学期表。与 Python 的 curriculum_semester 物理隔离：一行是「某模块的某个学期」，例如 blockly 的「Level 0」。';

comment on column public.module_term.title is
  '学期展示名，例如「Level 0」。课程线内的顺序编号，不跟学校年级绑定。';

comment on column public.module_term.stage_label is
  '课程线展示名，例如「Blockly 课程线」。';

comment on column public.module_term.term_code is
  '季节：fall / spring。用于按上下学期排序展示，展示名已不再体现上下学期。';


-- 验收 SQL（迁移后逐条跑）
--
-- A. 四个学期都是 Level 序列
-- select term_id, title, stage_label from public.module_term where module_id = 'blockly' order by sort_order;
--
-- B. 单元与关卡的归属没变
-- select count(*) from public.module_unit where module_id = 'blockly';
-- select count(*) from public.module_level where module_id = 'blockly';
