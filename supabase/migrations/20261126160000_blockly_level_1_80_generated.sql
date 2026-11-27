-- Blockly 第一学期扩容到 80 关（blk-001 … blk-080），一次迁移落库。
--
-- 这个文件由 scripts/generate-blockly-80.mjs 生成，不要手工改：
--   npx tsx scripts/generate-blockly-80.mjs
-- 生成器用生产解析器和生产解释器把每关的标准解跑通一遍才写进来。
--
-- 迁移分四步：
--   1. 学期容量从 15 课改成 80 课，单元改成 5 个 × 16 课。
--   2. 后面三个学期的占位关卡挪到预留号段（081-095 / 161-175 / 241-255）。
--      第一学期要用掉 001-080，不挪就会撞号。占位行不删，只改编号。
--   3. learning_record 里的旧编号同步改名，进度不丢。
--   4. 写入 80 关正文。
--
-- Neon 跨语句没有事务，每条语句都写成幂等的固定值，重跑即可。
-- 迁移前请确认已经备份；本文件不执行任何 delete。


-- 1. 学期容量
update public.module_term
set
  weeks = 16,
  level_cap = 80,
  summary = '计算思维启蒙：顺序、转弯、循环、条件。80 课，每天一课。',
  updated_at = now()
where module_id = 'blockly'
  and term_id = 'blk-g1-fall';

-- 2. 单元：5 个单元，每单元 16 课
insert into public.module_unit
  (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
values
  ('blockly', 'blk-g1-fall-u1', 'blk-g1-fall', '走直线',
   '只有一块「前进」积木。学会数步数，让机器人一条直线走到终点。', 'grid',
   array['sequence', 'move'], 16, 1),
  ('blockly', 'blk-g1-fall-u2', 'blk-g1-fall', '转向与路径',
   '加上左转和右转，走出 L 形、之字形和 U 形路线，起点和终点每次都不一样。', 'grid',
   array['sequence', 'turn', 'path'], 16, 2),
  ('blockly', 'blk-g1-fall-u3', 'blk-g1-fall', '循环的威力',
   '用「重复执行」走长道，用内外两层循环绕出正方形和长方形。', 'grid',
   array['loop', 'nested_loop'], 16, 3),
  ('blockly', 'blk-g1-fall-u4', 'blk-g1-fall', '条件与岔路',
   '学会用「如果」让电脑自己判断，遇到墙自己转弯，绕着房间走一圈又一圈。', 'grid',
   array['condition', 'if', 'loop'], 16, 4),
  ('blockly', 'blk-g1-fall-u5', 'blk-g1-fall', '综合大挑战',
   '顺序、循环、条件一起上，连续闯过几个大迷宫，完成学期作品。', 'grid',
   array['project', 'sequence', 'turn', 'loop', 'condition'], 16, 5)
on conflict (module_id, unit_id) do update set
  term_id = excluded.term_id,
  title = excluded.title,
  summary = excluded.summary,
  scene_form = excluded.scene_form,
  knowledge_tags = excluded.knowledge_tags,
  level_cap = excluded.level_cap,
  sort_order = excluded.sort_order,
  updated_at = now();

-- 3. 后面三个学期的占位关卡换号（先挪到临时号段，再换正式号段）
--
-- sort_order 上有唯一约束 (module_id, sort_order)，直接换号会撞车。
-- 先把三组行挪到 10000+ 的临时号段，再一条一条换到预留号段。
-- 每条 update 都带 term_id 守卫：重跑时旧编号已经不存在，条件不匹配，什么也不做。
update public.module_level
set sort_order = sort_order + 10000
where module_id = 'blockly'
  and (
    (term_id = 'blk-g1-spring' and level_id between 'blk-016' and 'blk-030')
    or (term_id = 'blk-g2-fall' and level_id between 'blk-031' and 'blk-045')
    or (term_id = 'blk-g2-spring' and level_id between 'blk-046' and 'blk-060')
  );

-- blk-016 → blk-081
update public.module_level
set
  level_id = 'blk-081',
  sort_order = 81,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-016'
  and term_id = 'blk-g1-spring';

-- blk-017 → blk-082
update public.module_level
set
  level_id = 'blk-082',
  sort_order = 82,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-017'
  and term_id = 'blk-g1-spring';

-- blk-018 → blk-083
update public.module_level
set
  level_id = 'blk-083',
  sort_order = 83,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-018'
  and term_id = 'blk-g1-spring';

-- blk-019 → blk-084
update public.module_level
set
  level_id = 'blk-084',
  sort_order = 84,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-019'
  and term_id = 'blk-g1-spring';

-- blk-020 → blk-085
update public.module_level
set
  level_id = 'blk-085',
  sort_order = 85,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-020'
  and term_id = 'blk-g1-spring';

-- blk-021 → blk-086
update public.module_level
set
  level_id = 'blk-086',
  sort_order = 86,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-021'
  and term_id = 'blk-g1-spring';

-- blk-022 → blk-087
update public.module_level
set
  level_id = 'blk-087',
  sort_order = 87,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-022'
  and term_id = 'blk-g1-spring';

-- blk-023 → blk-088
update public.module_level
set
  level_id = 'blk-088',
  sort_order = 88,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-023'
  and term_id = 'blk-g1-spring';

-- blk-024 → blk-089
update public.module_level
set
  level_id = 'blk-089',
  sort_order = 89,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-024'
  and term_id = 'blk-g1-spring';

-- blk-025 → blk-090
update public.module_level
set
  level_id = 'blk-090',
  sort_order = 90,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-025'
  and term_id = 'blk-g1-spring';

-- blk-026 → blk-091
update public.module_level
set
  level_id = 'blk-091',
  sort_order = 91,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-026'
  and term_id = 'blk-g1-spring';

-- blk-027 → blk-092
update public.module_level
set
  level_id = 'blk-092',
  sort_order = 92,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-027'
  and term_id = 'blk-g1-spring';

-- blk-028 → blk-093
update public.module_level
set
  level_id = 'blk-093',
  sort_order = 93,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-028'
  and term_id = 'blk-g1-spring';

-- blk-029 → blk-094
update public.module_level
set
  level_id = 'blk-094',
  sort_order = 94,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-029'
  and term_id = 'blk-g1-spring';

-- blk-030 → blk-095
update public.module_level
set
  level_id = 'blk-095',
  sort_order = 95,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-030'
  and term_id = 'blk-g1-spring';

-- blk-031 → blk-161
update public.module_level
set
  level_id = 'blk-161',
  sort_order = 161,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-031'
  and term_id = 'blk-g2-fall';

-- blk-032 → blk-162
update public.module_level
set
  level_id = 'blk-162',
  sort_order = 162,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-032'
  and term_id = 'blk-g2-fall';

-- blk-033 → blk-163
update public.module_level
set
  level_id = 'blk-163',
  sort_order = 163,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-033'
  and term_id = 'blk-g2-fall';

-- blk-034 → blk-164
update public.module_level
set
  level_id = 'blk-164',
  sort_order = 164,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-034'
  and term_id = 'blk-g2-fall';

-- blk-035 → blk-165
update public.module_level
set
  level_id = 'blk-165',
  sort_order = 165,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-035'
  and term_id = 'blk-g2-fall';

-- blk-036 → blk-166
update public.module_level
set
  level_id = 'blk-166',
  sort_order = 166,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-036'
  and term_id = 'blk-g2-fall';

-- blk-037 → blk-167
update public.module_level
set
  level_id = 'blk-167',
  sort_order = 167,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-037'
  and term_id = 'blk-g2-fall';

-- blk-038 → blk-168
update public.module_level
set
  level_id = 'blk-168',
  sort_order = 168,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-038'
  and term_id = 'blk-g2-fall';

-- blk-039 → blk-169
update public.module_level
set
  level_id = 'blk-169',
  sort_order = 169,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-039'
  and term_id = 'blk-g2-fall';

-- blk-040 → blk-170
update public.module_level
set
  level_id = 'blk-170',
  sort_order = 170,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-040'
  and term_id = 'blk-g2-fall';

-- blk-041 → blk-171
update public.module_level
set
  level_id = 'blk-171',
  sort_order = 171,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-041'
  and term_id = 'blk-g2-fall';

-- blk-042 → blk-172
update public.module_level
set
  level_id = 'blk-172',
  sort_order = 172,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-042'
  and term_id = 'blk-g2-fall';

-- blk-043 → blk-173
update public.module_level
set
  level_id = 'blk-173',
  sort_order = 173,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-043'
  and term_id = 'blk-g2-fall';

-- blk-044 → blk-174
update public.module_level
set
  level_id = 'blk-174',
  sort_order = 174,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-044'
  and term_id = 'blk-g2-fall';

-- blk-045 → blk-175
update public.module_level
set
  level_id = 'blk-175',
  sort_order = 175,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-045'
  and term_id = 'blk-g2-fall';

-- blk-046 → blk-241
update public.module_level
set
  level_id = 'blk-241',
  sort_order = 241,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-046'
  and term_id = 'blk-g2-spring';

-- blk-047 → blk-242
update public.module_level
set
  level_id = 'blk-242',
  sort_order = 242,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-047'
  and term_id = 'blk-g2-spring';

-- blk-048 → blk-243
update public.module_level
set
  level_id = 'blk-243',
  sort_order = 243,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-048'
  and term_id = 'blk-g2-spring';

-- blk-049 → blk-244
update public.module_level
set
  level_id = 'blk-244',
  sort_order = 244,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-049'
  and term_id = 'blk-g2-spring';

-- blk-050 → blk-245
update public.module_level
set
  level_id = 'blk-245',
  sort_order = 245,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-050'
  and term_id = 'blk-g2-spring';

-- blk-051 → blk-246
update public.module_level
set
  level_id = 'blk-246',
  sort_order = 246,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-051'
  and term_id = 'blk-g2-spring';

-- blk-052 → blk-247
update public.module_level
set
  level_id = 'blk-247',
  sort_order = 247,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-052'
  and term_id = 'blk-g2-spring';

-- blk-053 → blk-248
update public.module_level
set
  level_id = 'blk-248',
  sort_order = 248,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-053'
  and term_id = 'blk-g2-spring';

-- blk-054 → blk-249
update public.module_level
set
  level_id = 'blk-249',
  sort_order = 249,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-054'
  and term_id = 'blk-g2-spring';

-- blk-055 → blk-250
update public.module_level
set
  level_id = 'blk-250',
  sort_order = 250,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-055'
  and term_id = 'blk-g2-spring';

-- blk-056 → blk-251
update public.module_level
set
  level_id = 'blk-251',
  sort_order = 251,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-056'
  and term_id = 'blk-g2-spring';

-- blk-057 → blk-252
update public.module_level
set
  level_id = 'blk-252',
  sort_order = 252,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-057'
  and term_id = 'blk-g2-spring';

-- blk-058 → blk-253
update public.module_level
set
  level_id = 'blk-253',
  sort_order = 253,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-058'
  and term_id = 'blk-g2-spring';

-- blk-059 → blk-254
update public.module_level
set
  level_id = 'blk-254',
  sort_order = 254,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-059'
  and term_id = 'blk-g2-spring';

-- blk-060 → blk-255
update public.module_level
set
  level_id = 'blk-255',
  sort_order = 255,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-060'
  and term_id = 'blk-g2-spring';

-- 4. 学习记录跟着改编号，进度不丢
--
-- learning_record 的主键是 (student_id, level_id)，目标编号已经存在时跳过，
-- 避免主键冲突把整条 update 打断。
--
-- 再加一道守卫：旧编号在 module_level 里已经查不到，才说明它是「被换号换走的
-- 后面几个学期的关卡」。第一次跑迁移时旧编号已经被步骤 3 换掉，这条守卫放行；
-- 以后再重跑这个文件时，第一学期已经占了 blk-016…blk-060，这些编号在
-- module_level 里查得到，守卫会挡住，不会把学生刚做完的一上关卡记录改错号。
with remap(old_id, new_id) as (
  values
    ('blk-016', 'blk-081'),
    ('blk-017', 'blk-082'),
    ('blk-018', 'blk-083'),
    ('blk-019', 'blk-084'),
    ('blk-020', 'blk-085'),
    ('blk-021', 'blk-086'),
    ('blk-022', 'blk-087'),
    ('blk-023', 'blk-088'),
    ('blk-024', 'blk-089'),
    ('blk-025', 'blk-090'),
    ('blk-026', 'blk-091'),
    ('blk-027', 'blk-092'),
    ('blk-028', 'blk-093'),
    ('blk-029', 'blk-094'),
    ('blk-030', 'blk-095'),
    ('blk-031', 'blk-161'),
    ('blk-032', 'blk-162'),
    ('blk-033', 'blk-163'),
    ('blk-034', 'blk-164'),
    ('blk-035', 'blk-165'),
    ('blk-036', 'blk-166'),
    ('blk-037', 'blk-167'),
    ('blk-038', 'blk-168'),
    ('blk-039', 'blk-169'),
    ('blk-040', 'blk-170'),
    ('blk-041', 'blk-171'),
    ('blk-042', 'blk-172'),
    ('blk-043', 'blk-173'),
    ('blk-044', 'blk-174'),
    ('blk-045', 'blk-175'),
    ('blk-046', 'blk-241'),
    ('blk-047', 'blk-242'),
    ('blk-048', 'blk-243'),
    ('blk-049', 'blk-244'),
    ('blk-050', 'blk-245'),
    ('blk-051', 'blk-246'),
    ('blk-052', 'blk-247'),
    ('blk-053', 'blk-248'),
    ('blk-054', 'blk-249'),
    ('blk-055', 'blk-250'),
    ('blk-056', 'blk-251'),
    ('blk-057', 'blk-252'),
    ('blk-058', 'blk-253'),
    ('blk-059', 'blk-254'),
    ('blk-060', 'blk-255')
)
update public.learning_record lr
set level_id = r.new_id
from remap r
where lr.module_id = 'blockly'
  and lr.level_id = r.old_id
  and not exists (
    select 1 from public.learning_record t
    where t.student_id = lr.student_id
      and t.level_id = r.new_id
  )
  and not exists (
    select 1 from public.module_level ml
    where ml.module_id = 'blockly'
      and ml.level_id = r.old_id
  );

-- 5. 第一学期 80 关正文
--
-- workspace.max_blocks 的语义是「工作区积木总数（含嵌套子块）」，不是展开后的执行步数。
-- U3 的关卡把上限卡死在循环解的积木数上，逼学生必须用循环；U4 同理必须用条件。

-- blk-001 小小出发
-- 把 1 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-001', 1,
   '小小出发',
   '把 1 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 4,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 2,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 1
      },
      {
        "x": 2,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 1,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 4,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 1 格，把 1 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 1 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎来到代码闯关！我是小精灵，从今天起我陪你一起让机器人走路。"
    },
    {
      "type": "image_text",
      "image": "robot_wave",
      "speaker": "机器人",
      "content": "你好呀！这一关的路很短，只要 1 格，我一步就能走到小旗子那里。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "看，这是「前进」积木。把它拖到工作区，再点绿色的「运行」按钮，我就出发啦！"
    }
  ]
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-002 再走一步
-- 把 2 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-002', 2,
   '再走一步',
   '把 2 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 5,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 3,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 3,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "coin-2-1",
        "type": "coin",
        "x": 2,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 2,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 4,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 2 格，把 2 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 2 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "上一关你让机器人走了一步，真棒！今天我们再走远一点点。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "「前进」积木就是这样：拖一块，我走一格。"
    },
    {
      "type": "image_text",
      "image": "run_button",
      "speaker": "机器人",
      "content": "今天要走到 2 格，所以要 2 块「前进」连在一起，再点「运行」。"
    }
  ],
  "review": {
    "question": "上一关我们拖的是哪一块积木呀？",
    "answer": "「前进」积木！",
    "hint": "就是那个绿色的方块，拖一次我就走一格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-003 三格直线
-- 把 3 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-003', 3,
   '三格直线',
   '把 3 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 4,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 4,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "coin-3-1",
        "type": "coin",
        "x": 2,
        "y": 1
      },
      {
        "id": "coin-3-2",
        "type": "star",
        "x": 3,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 3,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 5,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 3 格，把 3 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 3 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "今天这条路有 3 格，比昨天长一点点。"
    },
    {
      "type": "image_text",
      "image": "path",
      "speaker": "机器人",
      "content": "我从起点数了数：1、2、3，一共 3 格才到我爱的小旗子。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "数出几格就拖几块「前进」，一块都不能少。"
    }
  ],
  "review": {
    "question": "「前进」积木走一格，那走 3 格要几块？",
    "answer": "3 块「前进」积木。",
    "hint": "一格一块，数一数路上有几格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-004 四格不回头
-- 把 4 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-004', 4,
   '四格不回头',
   '把 4 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 5,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 5,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 6,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 4 格，把 4 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 4 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "这一关是练习关，我们把「前进」再练熟一点。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "机器人",
      "content": "今天是 4 格，我一口气就能走到底。"
    },
    {
      "type": "image_text",
      "image": "run_button",
      "speaker": "小精灵",
      "content": "拖 4 块「前进」连成一条，再点「运行」。"
    }
  ],
  "review": {
    "question": "上一关走 3 格用了几块「前进」？",
    "answer": "3 块。",
    "hint": "一格一块。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'practice',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-005 五格长廊
-- 把 5 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-005', 5,
   '五格长廊',
   '把 5 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 6,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 5,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 7,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 5 格，把 5 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 5 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "qwert asdfg"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "五格长廊！这是我们走过的最长的路啦。"
    },
    {
      "type": "image_text",
      "image": "robot_run",
      "speaker": "机器人",
      "content": "我最喜欢长路了，一口气跑完 5 格也不费劲。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "别着急，一块一块拖，5 块「前进」排好队。"
    },
    {
      "type": "image_text",
      "image": "goal",
      "speaker": "机器人",
      "content": "排好队点「运行」，我一口气跑到小旗子那里！"
    }
  ],
  "review": {
    "question": "积木要怎么排，机器人才能一直往前走？",
    "answer": "一块接一块，连成一条。",
    "hint": "下一块要贴在上一块的下面。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'typing',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-006 六格前进
-- 把 6 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-006', 6,
   '六格前进',
   '把 6 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 7,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 8,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 8,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 6 格，把 6 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 6 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "六格啦！数字变大了一点，办法还是老办法。"
    },
    {
      "type": "image_text",
      "image": "path",
      "speaker": "机器人",
      "content": "六格路看着长，其实就是 6 块「前进」。"
    },
    {
      "type": "image_text",
      "image": "run_button",
      "speaker": "小精灵",
      "content": "排好队再点「运行」，稳稳当当。"
    }
  ],
  "review": {
    "question": "走 5 格要几块「前进」？",
    "answer": "5 块。",
    "hint": "一格一块。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-007 七格通道
-- 把 7 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-007', 7,
   '七格通道',
   '把 7 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 10,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 8,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 9,
        "y": 1
      },
      {
        "x": 8,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "coin-7-1",
        "type": "coin",
        "x": 5,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 7,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 9,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 7 格，把 7 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 7 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "七格通道！窄窄的通道，走起来像在探险。"
    },
    {
      "type": "image_text",
      "image": "robot_run",
      "speaker": "机器人",
      "content": "通道两边的墙我不用担心，我只会一直往前。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "7 块「前进」，一块都不能少哦。"
    }
  ],
  "review": {
    "question": "积木和格子是什么关系？",
    "answer": "一格配一块「前进」。",
    "hint": "数一数格子就知道要几块。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-008 八格长道
-- 把 8 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-008', 8,
   '八格长道',
   '把 8 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 9,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 10,
        "y": 1
      },
      {
        "x": 9,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "coin-8-1",
        "type": "coin",
        "x": 3,
        "y": 1
      },
      {
        "id": "coin-8-2",
        "type": "star",
        "x": 7,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 8,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 10,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 8 格，把 8 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 8 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "八格长道！这一关开始会画出我走过的路线。"
    },
    {
      "type": "image_text",
      "image": "path",
      "speaker": "机器人",
      "content": "我会一边走一边留下脚印，你看看是不是一条直线。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "8 块「前进」排成一条直线，走出来的脚印才不会歪。"
    }
  ],
  "review": {
    "question": "走过的路线是怎么画出来的？",
    "answer": "机器人每走一格就留下一个脚印点。",
    "hint": "跑完以后看看舞台上的小点。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-009 九格冲刺
-- 把 9 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-009', 9,
   '九格冲刺',
   '把 9 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 12,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 10,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 11,
        "y": 1
      },
      {
        "x": 10,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 11,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 9 格，把 9 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 9 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "九格冲刺！数起来有点长了，我们一起数。"
    },
    {
      "type": "image_text",
      "image": "robot_run",
      "speaker": "机器人",
      "content": "1、2、3……一直数到 9，我就站在旗子旁边啦。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "数错了也没关系，跑一次看看脚印就知道差几格。"
    }
  ],
  "review": {
    "question": "上一关的路有几格？",
    "answer": "8 格。",
    "hint": "数字每次加 1。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'practice',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-010 十格挑战
-- 把 10 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-010', 10,
   '十格挑战',
   '把 10 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 13,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 11,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 12,
        "y": 1
      },
      {
        "x": 11,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 10,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 12,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 10 格，把 10 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 10 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "qwert asdfg"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "十格挑战！两位数的路啦，别数乱了。"
    },
    {
      "type": "image_text",
      "image": "robot_run",
      "speaker": "机器人",
      "content": "十格路有点长，我会一步一步慢慢走到底。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "分成两小段数：先 5 块，再 5 块，就不乱了。"
    }
  ],
  "review": {
    "question": "十格可以怎么数才不乱？",
    "answer": "分成两小段数，比如 5 加 5。",
    "hint": "先数到 5，再接着数 5。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'typing',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-011 十一格直行
-- 把 11 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-011', 11,
   '十一格直行',
   '把 11 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 14,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 12,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 11,
        "y": 2
      },
      {
        "x": 12,
        "y": 0
      },
      {
        "x": 13,
        "y": 1
      },
      {
        "x": 12,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 11,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 13,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 11 格，把 11 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 11 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "十一格直行！继续练习数格子。"
    },
    {
      "type": "image_text",
      "image": "path",
      "speaker": "机器人",
      "content": "11 格，中间没有弯，只要一直往前。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "拖 11 块「前进」，连成一条长队。"
    }
  ],
  "review": {
    "question": "一格配几块「前进」？",
    "answer": "一格一块。",
    "hint": "格子数就是积木数。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-012 十二格大道
-- 把 12 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-012', 12,
   '十二格大道',
   '把 12 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 15,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 13,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 11,
        "y": 2
      },
      {
        "x": 12,
        "y": 0
      },
      {
        "x": 12,
        "y": 2
      },
      {
        "x": 13,
        "y": 0
      },
      {
        "x": 14,
        "y": 1
      },
      {
        "x": 13,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "coin-12-1",
        "type": "coin",
        "x": 7,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 14,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 12 格，把 12 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 12 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "十二格大道！这一关的大道特别宽，特别长。"
    },
    {
      "type": "image_text",
      "image": "path",
      "speaker": "机器人",
      "content": "我要一步一步走过这条宽宽的大道。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "12 块「前进」，排好队再运行。"
    }
  ],
  "review": {
    "question": "这条大道要放几块「前进」？",
    "answer": "12 块，一格一块。",
    "hint": "数一数大道上有几格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-013 十三格远征
-- 把 13 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-013', 13,
   '十三格远征',
   '把 13 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 16,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 14,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 11,
        "y": 2
      },
      {
        "x": 12,
        "y": 0
      },
      {
        "x": 12,
        "y": 2
      },
      {
        "x": 13,
        "y": 0
      },
      {
        "x": 13,
        "y": 2
      },
      {
        "x": 14,
        "y": 0
      },
      {
        "x": 15,
        "y": 1
      },
      {
        "x": 14,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "coin-13-1",
        "type": "coin",
        "x": 5,
        "y": 1
      },
      {
        "id": "coin-13-2",
        "type": "star",
        "x": 11,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 15,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 13 格，把 13 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 13 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "十三格远征！像小蚂蚁搬家一样遥远。"
    },
    {
      "type": "image_text",
      "image": "robot_run",
      "speaker": "机器人",
      "content": "我会一步一步稳稳走到底。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "这次试试边拖边数，看能不能一次排对 13 块。"
    }
  ],
  "review": {
    "question": "上一关的大道有几格？",
    "answer": "12 格。",
    "hint": "13 比 12 多 1。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-014 十四格长跑
-- 把 14 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-014', 14,
   '十四格长跑',
   '把 14 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 17,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 15,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 11,
        "y": 2
      },
      {
        "x": 12,
        "y": 0
      },
      {
        "x": 12,
        "y": 2
      },
      {
        "x": 13,
        "y": 0
      },
      {
        "x": 13,
        "y": 2
      },
      {
        "x": 14,
        "y": 0
      },
      {
        "x": 14,
        "y": 2
      },
      {
        "x": 15,
        "y": 0
      },
      {
        "x": 16,
        "y": 1
      },
      {
        "x": 15,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 16,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 14 格，把 14 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 14 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "十四格长跑！准备好大长腿了吗？"
    },
    {
      "type": "image_text",
      "image": "goal",
      "speaker": "机器人",
      "content": "跑过 14 格，小旗子就在终点等我。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "14 块「前进」排成一条直线，点「运行」！"
    }
  ],
  "review": {
    "question": "「前进」积木放在哪里最合适？",
    "answer": "放在工作区里，一块接一块连起来。",
    "hint": "连成一条，机器人才能一直走。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'practice',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-015 十五格耐力赛
-- 把 15 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-015', 15,
   '十五格耐力赛',
   '把 15 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 18,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 16,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 11,
        "y": 2
      },
      {
        "x": 12,
        "y": 0
      },
      {
        "x": 12,
        "y": 2
      },
      {
        "x": 13,
        "y": 0
      },
      {
        "x": 13,
        "y": 2
      },
      {
        "x": 14,
        "y": 0
      },
      {
        "x": 14,
        "y": 2
      },
      {
        "x": 15,
        "y": 0
      },
      {
        "x": 15,
        "y": 2
      },
      {
        "x": 16,
        "y": 0
      },
      {
        "x": 17,
        "y": 1
      },
      {
        "x": 16,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 17,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 15 格，把 15 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 15 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "qwert asdfg"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "十五格耐力赛！这是我们第一单元的最后一关。"
    },
    {
      "type": "image_text",
      "image": "robot_run",
      "speaker": "机器人",
      "content": "这一关是本单元最长的一条路，15 格呢！"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "15 块「前进」，排好队，点「运行」，我们一起冲过去！"
    }
  ],
  "review": {
    "question": "这一单元我们学会了什么呀？",
    "answer": "用「前进」积木让机器人一条直线走到终点。",
    "hint": "一格一块，连成一条。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'typing',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-016 十六格终点线
-- 把 16 块「前进」积木连起来，让机器人一条直线走到终点
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-016', 16,
   '十六格终点线',
   '把 16 块「前进」积木连起来，让机器人一条直线走到终点',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 19,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 17,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 11,
        "y": 2
      },
      {
        "x": 12,
        "y": 0
      },
      {
        "x": 12,
        "y": 2
      },
      {
        "x": 13,
        "y": 0
      },
      {
        "x": 13,
        "y": 2
      },
      {
        "x": 14,
        "y": 0
      },
      {
        "x": 14,
        "y": 2
      },
      {
        "x": 15,
        "y": 0
      },
      {
        "x": 15,
        "y": 2
      },
      {
        "x": 16,
        "y": 0
      },
      {
        "x": 16,
        "y": 2
      },
      {
        "x": 17,
        "y": 0
      },
      {
        "x": 18,
        "y": 1
      },
      {
        "x": 17,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 18,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路一共 16 格，把 16 块「前进」积木拖到工作区，一块接一块连好。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人还没到终点，这条路一共 16 格，再数一遍还差几格。",
      "focus": {
        "target": "block",
        "blockType": "move_forward"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "走到终点啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：把 16 块「前进」积木连起来，让机器人一条直线走到终点。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "小精灵",
      "content": "今天请「数格子」来帮忙：一格一步，数清楚格数就能一次走对。"
    },
    {
      "type": "image_text",
      "image": "block_move",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「前进」。这条路一共 16 格，把 16 块「前进」积木拖到工作区，一块接一块连好。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「数格子」，还记得怎么用吗？",
    "answer": "一格一步，数清楚格数就能一次走对。",
    "hint": "上一关是一条直路，走 15 格就到终点。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u1', 'grid', 'new',
   array['sequence', 'move'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-017 第一个拐角
-- 走一条 L形路线：2 步 + 2 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-017', 17,
   '第一个拐角',
   '走一条 L形路线：2 步 + 2 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 5,
    "height": 5,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 3,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 7,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 2 格，放一块「右转」，最后走 2 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：走一条 L形路线：2 步 + 2 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「右转」。先走 2 格，放一块「右转」，最后走 2 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「数格子」，还记得怎么用吗？",
    "answer": "一格一步，数清楚格数就能一次走对。",
    "hint": "上一关是一条直路，走 16 格就到终点。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-018 直角路口
-- 走一条 L形路线：2 步 + 3 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-018', 18,
   '直角路口',
   '走一条 L形路线：2 步 + 3 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 5,
    "start": {
      "x": 4,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 3,
        "y": 1
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 1,
        "y": 4
      },
      {
        "x": 0,
        "y": 3
      }
    ],
    "entities": [
      {
        "id": "coin-18-1",
        "type": "coin",
        "x": 3,
        "y": 3
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 7,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 8,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 2 格，放一块「右转」，最后走 3 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：走一条 L形路线：2 步 + 3 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「右转」。先走 2 格，放一块「右转」，最后走 3 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 1 个弯，每段分别走 2、2 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-019 长一点的 L
-- 走一条 L形路线：3 步 + 3 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-019', 19,
   '长一点的 L',
   '走一条 L形路线：3 步 + 3 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 6,
    "start": {
      "x": 4,
      "y": 4,
      "heading": "N"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-19-1",
        "type": "coin",
        "x": 4,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 8,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 9,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 3 格，放一块「左转」，最后走 3 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：走一条 L形路线：3 步 + 3 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「左转」。先走 3 格，放一块「左转」，最后走 3 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 1 个弯，每段分别走 2、3 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-020 大 L 弯
-- 走一条 L形路线：3 步 + 4 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-020', 20,
   '大 L 弯',
   '走一条 L形路线：3 步 + 4 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 6,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 5,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 10,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 3 格，放一块「左转」，最后走 4 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：走一条 L形路线：3 步 + 4 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「左转」。先走 3 格，放一块「左转」，最后走 4 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 1 个弯，每段分别走 3、3 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'practice',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-021 之字形起步
-- 走一条 Z形路线：3 步 + 2 步 + 3 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-021', 21,
   '之字形起步',
   '走一条 Z形路线：3 步 + 2 步 + 3 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 5,
    "height": 9,
    "start": {
      "x": 1,
      "y": 7,
      "heading": "N"
    },
    "goal": {
      "x": 3,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 8
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 2,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 11,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 12,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 3 格，放一块「右转」，再走 2 格，放一块「左转」，最后走 3 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "go home"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：走一条 Z形路线：3 步 + 2 步 + 3 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「右转」。先走 3 格，放一块「右转」，再走 2 格，放一块「左转」，最后走 3 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 1 个弯，每段分别走 3、4 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'typing',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-022 小 Z 字
-- 走一条 Z形路线：4 步 + 2 步 + 4 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-022', 22,
   '小 Z 字',
   '走一条 Z形路线：4 步 + 2 步 + 4 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 5,
    "height": 11,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 3,
      "y": 9
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 4,
        "y": 9
      },
      {
        "x": 3,
        "y": 10
      },
      {
        "x": 2,
        "y": 9
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 14,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 4 格，放一块「左转」，再走 2 格，放一块「右转」，最后走 4 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：走一条 Z形路线：4 步 + 2 步 + 4 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「左转」。先走 4 格，放一块「左转」，再走 2 格，放一块「右转」，最后走 4 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 2 个弯，每段分别走 3、2、3 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-023 标准之字
-- 走一条 Z形路线：4 步 + 3 步 + 4 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-023', 23,
   '标准之字',
   '走一条 Z形路线：4 步 + 3 步 + 4 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 6,
    "start": {
      "x": 9,
      "y": 1,
      "heading": "W"
    },
    "goal": {
      "x": 1,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 10,
        "y": 1
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      }
    ],
    "entities": [
      {
        "id": "coin-23-1",
        "type": "coin",
        "x": 5,
        "y": 3
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 15,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 4 格，放一块「左转」，再走 3 格，放一块「右转」，最后走 4 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：走一条 Z形路线：4 步 + 3 步 + 4 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「左转」。先走 4 格，放一块「左转」，再走 3 格，放一块「右转」，最后走 4 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 2 个弯，每段分别走 4、2、4 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-024 长之字
-- 走一条 Z形路线：5 步 + 3 步 + 5 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-024', 24,
   '长之字',
   '走一条 Z形路线：5 步 + 3 步 + 5 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 13,
    "start": {
      "x": 1,
      "y": 11,
      "heading": "N"
    },
    "goal": {
      "x": 4,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 11
      },
      {
        "x": 1,
        "y": 12
      },
      {
        "x": 0,
        "y": 11
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 0,
        "y": 10
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 3,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-24-1",
        "type": "coin",
        "x": 3,
        "y": 6
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 17,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 5 格，放一块「右转」，再走 3 格，放一块「左转」，最后走 5 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：走一条 Z形路线：5 步 + 3 步 + 5 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「右转」。先走 5 格，放一块「右转」，再走 3 格，放一块「左转」，最后走 5 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 2 个弯，每段分别走 4、3、4 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-025 U 型大道
-- 走一条 U形路线：3 步 + 3 步 + 3 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-025', 25,
   'U 型大道',
   '走一条 U形路线：3 步 + 3 步 + 3 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 6,
    "start": {
      "x": 4,
      "y": 4,
      "heading": "W"
    },
    "goal": {
      "x": 4,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 4,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 13,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 3 格，放一块「右转」，再走 3 格，放一块「右转」，最后走 3 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：走一条 U形路线：3 步 + 3 步 + 3 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「右转」。先走 3 格，放一块「右转」，再走 3 格，放一块「右转」，最后走 3 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 2 个弯，每段分别走 5、3、5 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'practice',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-026 U 型转弯
-- 走一条 U形路线：4 步 + 3 步 + 4 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-026', 26,
   'U 型转弯',
   '走一条 U形路线：4 步 + 3 步 + 4 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 6,
    "start": {
      "x": 5,
      "y": 4,
      "heading": "W"
    },
    "goal": {
      "x": 5,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 5,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 15,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 4 格，放一块「右转」，再走 3 格，放一块「右转」，最后走 4 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "go home"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：走一条 U形路线：4 步 + 3 步 + 4 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「右转」。先走 4 格，放一块「右转」，再走 3 格，放一块「右转」，最后走 4 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 2 个弯，每段分别走 3、3、3 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'typing',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-027 宽 U 型
-- 走一条 U形路线：4 步 + 4 步 + 4 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-027', 27,
   '宽 U 型',
   '走一条 U形路线：4 步 + 4 步 + 4 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 7,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 5,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 4,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 16,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 4 格，放一块「左转」，再走 4 格，放一块「左转」，最后走 4 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：走一条 U形路线：4 步 + 4 步 + 4 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「左转」。先走 4 格，放一块「左转」，再走 4 格，放一块「左转」，最后走 4 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 2 个弯，每段分别走 4、3、4 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-028 大 U 型
-- 走一条 U形路线：5 步 + 4 步 + 5 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-028', 28,
   '大 U 型',
   '走一条 U形路线：5 步 + 4 步 + 5 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 7,
    "start": {
      "x": 1,
      "y": 5,
      "heading": "E"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 4
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-28-1",
        "type": "coin",
        "x": 6,
        "y": 3
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 17,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 18,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 5 格，放一块「左转」，再走 4 格，放一块「左转」，最后走 5 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：走一条 U形路线：5 步 + 4 步 + 5 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「左转」。先走 5 格，放一块「左转」，再走 4 格，放一块「左转」，最后走 5 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 2 个弯，每段分别走 4、4、4 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-029 四段小路
-- 走一条 S形路线：4 步 + 2 步 + 3 步 + 2 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-029', 29,
   '四段小路',
   '走一条 S形路线：4 步 + 2 步 + 3 步 + 2 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 10,
    "start": {
      "x": 5,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 8
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 3,
        "y": 9
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 1,
        "y": 9
      },
      {
        "x": 0,
        "y": 8
      }
    ],
    "entities": [
      {
        "id": "coin-29-1",
        "type": "coin",
        "x": 3,
        "y": 5
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 16,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 4 格，放一块「右转」，再走 2 格，放一块「左转」，再走 3 格，放一块「右转」，最后走 2 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：走一条 S形路线：4 步 + 2 步 + 3 步 + 2 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「右转」。先走 4 格，放一块「右转」，再走 2 格，放一块「左转」，再走 3 格，放一块「右转」，最后走 2 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 2 个弯，每段分别走 5、4、5 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-030 四段长路
-- 走一条 S形路线：3 步 + 4 步 + 3 步 + 5 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-030', 30,
   '四段长路',
   '走一条 S形路线：3 步 + 4 步 + 3 步 + 5 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 12,
    "start": {
      "x": 7,
      "y": 10,
      "heading": "W"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 7,
        "y": 9
      },
      {
        "x": 8,
        "y": 10
      },
      {
        "x": 7,
        "y": 11
      },
      {
        "x": 6,
        "y": 9
      },
      {
        "x": 6,
        "y": 11
      },
      {
        "x": 5,
        "y": 9
      },
      {
        "x": 5,
        "y": 11
      },
      {
        "x": 4,
        "y": 11
      },
      {
        "x": 3,
        "y": 10
      },
      {
        "x": 3,
        "y": 9
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 3,
        "y": 8
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 19,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 20,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 3 格，放一块「右转」，再走 4 格，放一块「左转」，再走 3 格，放一块「右转」，最后走 5 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_right"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：走一条 S形路线：3 步 + 4 步 + 3 步 + 5 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「右转」。先走 3 格，放一块「右转」，再走 4 格，放一块「左转」，再走 3 格，放一块「右转」，最后走 5 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 3 个弯，每段分别走 4、2、3、2 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'practice',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-031 复杂折线
-- 走一条 S形路线：5 步 + 3 步 + 5 步 + 3 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-031', 31,
   '复杂折线',
   '走一条 S形路线：5 步 + 3 步 + 5 步 + 3 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 13,
    "height": 9,
    "start": {
      "x": 1,
      "y": 7,
      "heading": "E"
    },
    "goal": {
      "x": 11,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 1,
        "y": 8
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 3,
        "y": 8
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 6,
        "y": 8
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 8,
        "y": 3
      },
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 9,
        "y": 3
      },
      {
        "x": 9,
        "y": 5
      },
      {
        "x": 10,
        "y": 3
      },
      {
        "x": 10,
        "y": 5
      },
      {
        "x": 12,
        "y": 4
      },
      {
        "x": 11,
        "y": 5
      },
      {
        "x": 12,
        "y": 3
      },
      {
        "x": 12,
        "y": 2
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 12,
        "y": 1
      },
      {
        "x": 10,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 20,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 21,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 5 格，放一块「左转」，再走 3 格，放一块「右转」，再走 5 格，放一块「左转」，最后走 3 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "go home"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：走一条 S形路线：5 步 + 3 步 + 5 步 + 3 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「左转」。先走 5 格，放一块「左转」，再走 3 格，放一块「右转」，再走 5 格，放一块「左转」，最后走 3 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 3 个弯，每段分别走 3、4、3、5 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'typing',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-032 终极折线
-- 走一条 S形路线：4 步 + 5 步 + 4 步 + 6 步
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-032', 32,
   '终极折线',
   '走一条 S形路线：4 步 + 5 步 + 4 步 + 6 步',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 14,
    "start": {
      "x": 9,
      "y": 1,
      "heading": "W"
    },
    "goal": {
      "x": 1,
      "y": 12
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 10,
        "y": 1
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 0,
        "y": 10
      },
      {
        "x": 2,
        "y": 11
      },
      {
        "x": 0,
        "y": 11
      },
      {
        "x": 2,
        "y": 12
      },
      {
        "x": 1,
        "y": 13
      },
      {
        "x": 0,
        "y": 12
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 23,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 24,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先走 4 格，放一块「左转」，再走 5 格，放一块「右转」，再走 4 格，放一块「左转」，最后走 6 格。",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    },
    {
      "trigger": "not_completed",
      "text": "机器人走偏了？每一段要走几格、转弯积木放在对的位置了吗？",
      "focus": {
        "target": "block",
        "blockType": "turn_left"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "拐弯成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：走一条 S形路线：4 步 + 5 步 + 4 步 + 6 步。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "小精灵",
      "content": "今天请「转弯」来帮忙：转弯会让机器人换一个方向，几段路就要几段走法。"
    },
    {
      "type": "image_text",
      "image": "block_turn",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「左转」。先走 4 格，放一块「左转」，再走 5 格，放一块「右转」，再走 4 格，放一块「左转」，最后走 6 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 3 个弯，每段分别走 5、3、5、3 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u2', 'grid', 'new',
   array['sequence', 'turn', 'path'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-033 长直道
-- 用「重复执行」一次走完 8 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-033', 33,
   '长直道',
   '用「重复执行」一次走完 8 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 9,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 10,
        "y": 1
      },
      {
        "x": 9,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 2,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 10,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「前进」放进「重复执行」里，把次数改成 8。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数还不对，这条路一共 8 格，再数一遍。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用「重复执行」一次走完 8 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「循环」来帮忙：把同一件事交给循环，重复做好多次。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。把「前进」放进「重复执行」里，把次数改成 8。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「转弯」，还记得怎么用吗？",
    "answer": "转弯会让机器人换一个方向，几段路就要几段走法。",
    "hint": "上一关的路要拐 3 个弯，每段分别走 4、5、4、6 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-034 更长直道
-- 用「重复执行」一次走完 10 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-034', 34,
   '更长直道',
   '用「重复执行」一次走完 10 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 13,
    "start": {
      "x": 1,
      "y": 11,
      "heading": "N"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 11
      },
      {
        "x": 1,
        "y": 12
      },
      {
        "x": 0,
        "y": 11
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 0,
        "y": 10
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-34-1",
        "type": "coin",
        "x": 1,
        "y": 8
      },
      {
        "id": "coin-34-2",
        "type": "star",
        "x": 1,
        "y": 4
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 2,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 12,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「前进」放进「重复执行」里，把次数改成 10。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数还不对，这条路一共 10 格，再数一遍。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用「重复执行」一次走完 10 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「循环」来帮忙：把同一件事交给循环，重复做好多次。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。把「前进」放进「重复执行」里，把次数改成 10。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「循环」，还记得怎么用吗？",
    "answer": "把同一件事交给循环，重复做好多次。",
    "hint": "上一关用循环一次走完 8 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-035 超长直道
-- 用「重复执行」一次走完 12 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-035', 35,
   '超长直道',
   '用「重复执行」一次走完 12 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 15,
    "height": 3,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 13,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 9,
        "y": 0
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
        "y": 2
      },
      {
        "x": 11,
        "y": 0
      },
      {
        "x": 11,
        "y": 2
      },
      {
        "x": 12,
        "y": 0
      },
      {
        "x": 12,
        "y": 2
      },
      {
        "x": 13,
        "y": 0
      },
      {
        "x": 14,
        "y": 1
      },
      {
        "x": 13,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "coin-35-1",
        "type": "coin",
        "x": 4,
        "y": 1
      },
      {
        "id": "coin-35-2",
        "type": "star",
        "x": 10,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 2,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 14,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「前进」放进「重复执行」里，把次数改成 12。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数还不对，这条路一共 12 格，再数一遍。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用「重复执行」一次走完 12 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「循环」来帮忙：把同一件事交给循环，重复做好多次。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。把「前进」放进「重复执行」里，把次数改成 12。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「循环」，还记得怎么用吗？",
    "answer": "把同一件事交给循环，重复做好多次。",
    "hint": "上一关用循环一次走完 10 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-036 极限直道
-- 用「重复执行」一次走完 14 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-036', 36,
   '极限直道',
   '用「重复执行」一次走完 14 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 17,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 15
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 0,
        "y": 10
      },
      {
        "x": 2,
        "y": 11
      },
      {
        "x": 0,
        "y": 11
      },
      {
        "x": 2,
        "y": 12
      },
      {
        "x": 0,
        "y": 12
      },
      {
        "x": 2,
        "y": 13
      },
      {
        "x": 0,
        "y": 13
      },
      {
        "x": 2,
        "y": 14
      },
      {
        "x": 0,
        "y": 14
      },
      {
        "x": 2,
        "y": 15
      },
      {
        "x": 1,
        "y": 16
      },
      {
        "x": 0,
        "y": 15
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 2,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 16,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「前进」放进「重复执行」里，把次数改成 14。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数还不对，这条路一共 14 格，再数一遍。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用「重复执行」一次走完 14 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「循环」来帮忙：把同一件事交给循环，重复做好多次。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。把「前进」放进「重复执行」里，把次数改成 14。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「循环」，还记得怎么用吗？",
    "answer": "把同一件事交给循环，重复做好多次。",
    "hint": "上一关用循环一次走完 12 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'practice',
   array['loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-037 画正方形
-- 用两层循环绕出边长 2 的正方形
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-037', 37,
   '画正方形',
   '用两层循环绕出边长 2 的正方形',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 5,
    "start": {
      "x": 3,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 4,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 1,
        "y": 4
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 7,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 14,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "外层「重复执行」做 3 次，每次先走 2 格再放一块「右转」；最后一条边用「重复执行」走 2 格，再走 1 步到终点。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "把「重复执行」放进另一个「重复执行」里面，就是两层循环了：外层做 3 次，每次走 2 格再转弯。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "eieio"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用两层循环绕出边长 2 的正方形。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「两层循环」来帮忙：循环套循环，就能绕出四条一样长的边。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。外层「重复执行」做 3 次，每次先走 2 格再放一块「右转」；最后一条边用「重复执行」走 2 格，再走 1 步到终点。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「循环」，还记得怎么用吗？",
    "answer": "把同一件事交给循环，重复做好多次。",
    "hint": "上一关用循环一次走完 14 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'typing',
   array['loop', 'nested_loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-038 大一点的正方形
-- 用两层循环绕出边长 3 的正方形
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-038', 38,
   '大一点的正方形',
   '用两层循环绕出边长 3 的正方形',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 7,
    "start": {
      "x": 1,
      "y": 4,
      "heading": "E"
    },
    "goal": {
      "x": 1,
      "y": 5
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 7,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 18,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "外层「重复执行」做 3 次，每次先走 3 格再放一块「左转」；最后一条边用「重复执行」走 3 格，再走 1 步到终点。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "把「重复执行」放进另一个「重复执行」里面，就是两层循环了：外层做 3 次，每次走 3 格再转弯。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用两层循环绕出边长 3 的正方形。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「两层循环」来帮忙：循环套循环，就能绕出四条一样长的边。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。外层「重复执行」做 3 次，每次先走 3 格再放一块「左转」；最后一条边用「重复执行」走 3 格，再走 1 步到终点。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「两层循环」，还记得怎么用吗？",
    "answer": "循环套循环，就能绕出四条一样长的边。",
    "hint": "上一关用两层循环绕出四条一样长的边，每条 2 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop', 'nested_loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-039 正方形花园
-- 用两层循环绕出边长 4 的正方形
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-039', 39,
   '正方形花园',
   '用两层循环绕出边长 4 的正方形',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 7,
    "start": {
      "x": 2,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 1,
        "y": 4
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-39-1",
        "type": "coin",
        "x": 3,
        "y": 5
      },
      {
        "id": "coin-39-2",
        "type": "star",
        "x": 5,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 7,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 22,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "外层「重复执行」做 3 次，每次先走 4 格再放一块「左转」；最后一条边用「重复执行」走 4 格，再走 1 步到终点。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "把「重复执行」放进另一个「重复执行」里面，就是两层循环了：外层做 3 次，每次走 4 格再转弯。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用两层循环绕出边长 4 的正方形。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「两层循环」来帮忙：循环套循环，就能绕出四条一样长的边。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。外层「重复执行」做 3 次，每次先走 4 格再放一块「左转」；最后一条边用「重复执行」走 4 格，再走 1 步到终点。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「两层循环」，还记得怎么用吗？",
    "answer": "循环套循环，就能绕出四条一样长的边。",
    "hint": "上一关用两层循环绕出四条一样长的边，每条 3 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop', 'nested_loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-040 巨型正方形
-- 用两层循环绕出边长 5 的正方形
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-040', 40,
   '巨型正方形',
   '用两层循环绕出边长 5 的正方形',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 8,
    "start": {
      "x": 6,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 7,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 8,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-40-1",
        "type": "coin",
        "x": 5,
        "y": 6
      },
      {
        "id": "coin-40-2",
        "type": "star",
        "x": 2,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 7,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 26,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "外层「重复执行」做 3 次，每次先走 5 格再放一块「右转」；最后一条边用「重复执行」走 5 格，再走 1 步到终点。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "把「重复执行」放进另一个「重复执行」里面，就是两层循环了：外层做 3 次，每次走 5 格再转弯。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用两层循环绕出边长 5 的正方形。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「两层循环」来帮忙：循环套循环，就能绕出四条一样长的边。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。外层「重复执行」做 3 次，每次先走 5 格再放一块「右转」；最后一条边用「重复执行」走 5 格，再走 1 步到终点。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「两层循环」，还记得怎么用吗？",
    "answer": "循环套循环，就能绕出四条一样长的边。",
    "hint": "上一关用两层循环绕出四条一样长的边，每条 4 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop', 'nested_loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-041 长方形
-- 用循环绕出 4×2 的长方形
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-041', 41,
   '长方形',
   '用循环绕出 4×2 的长方形',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 6,
    "start": {
      "x": 5,
      "y": 3,
      "heading": "W"
    },
    "goal": {
      "x": 5,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 1,
        "y": 4
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 18,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "宽边走 4 格、窄边走 2 格：「重复执行」里依次放「走 4 格 → 「右转」 → 走 2 格 → 「右转」 → 走 4 格 → 「右转」」，最后一条窄边用「重复执行」走 2 格，再走 1 步到终点。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "外层「重复执行」做 1 次：先走宽的一边（4 格）再走窄的一边（2 格），三条边走完还差最后一条。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用循环绕出 4×2 的长方形。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「长方形循环」来帮忙：长边和短边不一样长，要用不同的次数。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。宽边走 4 格、窄边走 2 格：「重复执行」里依次放「走 4 格 → 「右转」 → 走 2 格 → 「右转」 → 走 4 格 → 「右转」」，最后一条窄边用「重复执行」走 2 格，再走 1 步到终点。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「两层循环」，还记得怎么用吗？",
    "answer": "循环套循环，就能绕出四条一样长的边。",
    "hint": "上一关用两层循环绕出四条一样长的边，每条 5 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'practice',
   array['loop', 'nested_loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-042 瘦长方形
-- 用循环绕出 5×2 的长方形
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-042', 42,
   '瘦长方形',
   '用循环绕出 5×2 的长方形',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 8,
    "start": {
      "x": 2,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 1,
        "y": 4
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 20,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "宽边走 5 格、窄边走 2 格：「重复执行」里依次放「走 5 格 → 「左转」 → 走 2 格 → 「左转」 → 走 5 格 → 「左转」」，最后一条窄边用「重复执行」走 2 格，再走 1 步到终点。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "外层「重复执行」做 1 次：先走宽的一边（5 格）再走窄的一边（2 格），三条边走完还差最后一条。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "eieio"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用循环绕出 5×2 的长方形。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「长方形循环」来帮忙：长边和短边不一样长，要用不同的次数。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。宽边走 5 格、窄边走 2 格：「重复执行」里依次放「走 5 格 → 「左转」 → 走 2 格 → 「左转」 → 走 5 格 → 「左转」」，最后一条窄边用「重复执行」走 2 格，再走 1 步到终点。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「长方形循环」，还记得怎么用吗？",
    "answer": "长边和短边不一样长，要用不同的次数。",
    "hint": "上一关用循环绕出 4×2 的长方形。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'typing',
   array['loop', 'nested_loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-043 宽长方形
-- 用循环绕出 4×3 的长方形
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-043', 43,
   '宽长方形',
   '用循环绕出 4×3 的长方形',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 7,
    "start": {
      "x": 5,
      "y": 2,
      "heading": "W"
    },
    "goal": {
      "x": 5,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 3,
        "y": 1
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 1,
        "y": 1
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 20,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "宽边走 4 格、窄边走 3 格：「重复执行」里依次放「走 4 格 → 「左转」 → 走 3 格 → 「左转」 → 走 4 格 → 「左转」」，最后一条窄边用「重复执行」走 3 格，再走 1 步到终点。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "外层「重复执行」做 1 次：先走宽的一边（4 格）再走窄的一边（3 格），三条边走完还差最后一条。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用循环绕出 4×3 的长方形。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「长方形循环」来帮忙：长边和短边不一样长，要用不同的次数。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。宽边走 4 格、窄边走 3 格：「重复执行」里依次放「走 4 格 → 「左转」 → 走 3 格 → 「左转」 → 走 4 格 → 「左转」」，最后一条窄边用「重复执行」走 3 格，再走 1 步到终点。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「长方形循环」，还记得怎么用吗？",
    "answer": "长边和短边不一样长，要用不同的次数。",
    "hint": "上一关用循环绕出 5×2 的长方形。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop', 'nested_loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-044 大长方形
-- 用循环绕出 6×3 的长方形
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-044', 44,
   '大长方形',
   '用循环绕出 6×3 的长方形',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 7,
    "start": {
      "x": 7,
      "y": 4,
      "heading": "W"
    },
    "goal": {
      "x": 7,
      "y": 5
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 8,
        "y": 4
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 8,
        "y": 1
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 8,
        "y": 3
      },
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 7,
        "y": 6
      }
    ],
    "entities": [
      {
        "id": "coin-44-1",
        "type": "coin",
        "x": 2,
        "y": 4
      },
      {
        "id": "coin-44-2",
        "type": "star",
        "x": 6,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 24,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "宽边走 6 格、窄边走 3 格：「重复执行」里依次放「走 6 格 → 「右转」 → 走 3 格 → 「右转」 → 走 6 格 → 「右转」」，最后一条窄边用「重复执行」走 3 格，再走 1 步到终点。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "外层「重复执行」做 1 次：先走宽的一边（6 格）再走窄的一边（3 格），三条边走完还差最后一条。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用循环绕出 6×3 的长方形。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「长方形循环」来帮忙：长边和短边不一样长，要用不同的次数。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。宽边走 6 格、窄边走 3 格：「重复执行」里依次放「走 6 格 → 「右转」 → 走 3 格 → 「右转」 → 走 6 格 → 「右转」」，最后一条窄边用「重复执行」走 3 格，再走 1 步到终点。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「长方形循环」，还记得怎么用吗？",
    "answer": "长边和短边不一样长，要用不同的次数。",
    "hint": "上一关用循环绕出 4×3 的长方形。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop', 'nested_loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-045 循环 U 型
-- 用 3 段「重复执行」走出U形大路：分别走 4、3、2 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-045', 45,
   '循环 U 型',
   '用 3 段「重复执行」走出U形大路：分别走 4、3、2 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 7,
    "start": {
      "x": 1,
      "y": 5,
      "heading": "N"
    },
    "goal": {
      "x": 4,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 3,
        "y": 3
      }
    ],
    "entities": [
      {
        "id": "coin-45-1",
        "type": "coin",
        "x": 1,
        "y": 2
      },
      {
        "id": "coin-45-2",
        "type": "star",
        "x": 4,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 8,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 13,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 3 段：「重复执行」走 4 格，放一块「右转」，「重复执行」走 3 格，放一块「右转」，「重复执行」走 2 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 4、3、2 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用 3 段「重复执行」走出U形大路：分别走 4、3、2 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 4 格，放一块「右转」，「重复执行」走 3 格，放一块「右转」，「重复执行」走 2 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「长方形循环」，还记得怎么用吗？",
    "answer": "长边和短边不一样长，要用不同的次数。",
    "hint": "上一关用循环绕出 6×3 的长方形。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop', 'sequence'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-046 循环大 U 型
-- 用 3 段「重复执行」走出U形大路：分别走 2、3、5 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-046', 46,
   '循环大 U 型',
   '用 3 段「重复执行」走出U形大路：分别走 2、3、5 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 6,
    "start": {
      "x": 4,
      "y": 4,
      "heading": "E"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 8,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 14,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 3 段：「重复执行」走 2 格，放一块「左转」，「重复执行」走 3 格，放一块「左转」，「重复执行」走 5 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 2、3、5 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用 3 段「重复执行」走出U形大路：分别走 2、3、5 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 2 格，放一块「左转」，「重复执行」走 3 格，放一块「左转」，「重复执行」走 5 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 3 段，分别走 4、3、2 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'practice',
   array['loop', 'sequence'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-047 三段循环
-- 用 3 段「重复执行」走出U形大路：分别走 5、4、2 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-047', 47,
   '三段循环',
   '用 3 段「重复执行」走出U形大路：分别走 5、4、2 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 8,
    "start": {
      "x": 5,
      "y": 6,
      "heading": "N"
    },
    "goal": {
      "x": 1,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 1,
        "y": 4
      },
      {
        "x": 0,
        "y": 3
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 8,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 15,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 3 段：「重复执行」走 5 格，放一块「左转」，「重复执行」走 4 格，放一块「左转」，「重复执行」走 2 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 5、4、2 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "eieio"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用 3 段「重复执行」走出U形大路：分别走 5、4、2 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 5 格，放一块「左转」，「重复执行」走 4 格，放一块「左转」，「重复执行」走 2 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 3 段，分别走 2、3、5 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'typing',
   array['loop', 'sequence'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-048 循环组合技
-- 用 3 段「重复执行」走出U形大路：分别走 3、4、6 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-048', 48,
   '循环组合技',
   '用 3 段「重复执行」走出U形大路：分别走 3、4、6 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 7,
    "start": {
      "x": 4,
      "y": 5,
      "heading": "W"
    },
    "goal": {
      "x": 7,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 8,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 8,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 17,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 3 段：「重复执行」走 3 格，放一块「右转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 3、4、6 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "循环真省力！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用 3 段「重复执行」走出U形大路：分别走 3、4、6 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 3 格，放一块「右转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 3 段，分别走 5、4、2 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u3', 'grid', 'new',
   array['loop', 'sequence'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-049 第一个拐角
-- 沿着走廊走 11 格，拐 2 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-049', 49,
   '第一个拐角',
   '沿着走廊走 11 格，拐 2 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 6,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 1,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 15,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 11（这条路一共 11 格）。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：11 格路，一共 11 次。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：沿着走廊走 11 格，拐 2 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 11（这条路一共 11 格）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 3 段，分别走 3、4、6 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-050 第二个拐角
-- 沿着走廊走 13 格，拐 2 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-050', 50,
   '第二个拐角',
   '沿着走廊走 13 格，拐 2 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 8,
    "start": {
      "x": 4,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 3,
        "y": 1
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-50-1",
        "type": "coin",
        "x": 4,
        "y": 5
      },
      {
        "id": "coin-50-2",
        "type": "star",
        "x": 1,
        "y": 4
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 17,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 13（这条路一共 13 格）。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：13 格路，一共 13 次。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：沿着走廊走 13 格，拐 2 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 13（这条路一共 13 格）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 11 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-051 长一点的走廊
-- 沿着走廊走 14 格，拐 2 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-051', 51,
   '长一点的走廊',
   '沿着走廊走 14 格，拐 2 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 7,
    "start": {
      "x": 6,
      "y": 5,
      "heading": "W"
    },
    "goal": {
      "x": 6,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "coin-51-1",
        "type": "coin",
        "x": 2,
        "y": 5
      },
      {
        "id": "coin-51-2",
        "type": "star",
        "x": 2,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 18,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 14（这条路一共 14 格）。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：14 格路，一共 14 次。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：沿着走廊走 14 格，拐 2 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 14（这条路一共 14 格）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 13 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-052 大 L 走廊
-- 沿着走廊走 16 格，拐 2 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-052', 52,
   '大 L 走廊',
   '沿着走廊走 16 格，拐 2 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 9,
    "start": {
      "x": 1,
      "y": 7,
      "heading": "N"
    },
    "goal": {
      "x": 5,
      "y": 7
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 8
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 4,
        "y": 7
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 20,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 16（这条路一共 16 格）。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：16 格路，一共 16 次。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：沿着走廊走 16 格，拐 2 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 16（这条路一共 16 格）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 14 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'practice',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-053 三弯走廊
-- 沿着走廊走 18 格，拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-053', 53,
   '三弯走廊',
   '沿着走廊走 18 格，拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 8,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 3,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 8,
        "y": 1
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 8,
        "y": 3
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 8,
        "y": 4
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 8,
        "y": 6
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 2,
        "y": 3
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 23,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 18（这条路一共 18 格）。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：18 格路，一共 18 次。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "forward"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：沿着走廊走 18 格，拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 18（这条路一共 18 格）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 16 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'typing',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-054 回形长廊
-- 沿着走廊走 19 格，拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-054', 54,
   '回形长廊',
   '沿着走廊走 19 格，拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 10,
    "start": {
      "x": 6,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 4,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 7,
        "y": 8
      },
      {
        "x": 6,
        "y": 9
      },
      {
        "x": 5,
        "y": 9
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 4,
        "y": 9
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 3,
        "y": 9
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 1,
        "y": 9
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 4,
        "y": 5
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 24,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 19（这条路一共 19 格）。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：19 格路，一共 19 次。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：沿着走廊走 19 格，拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 19（这条路一共 19 格）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 18 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-055 越绕越深
-- 沿着走廊走 18 格，拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-055', 55,
   '越绕越深',
   '沿着走廊走 18 格，拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 10,
    "height": 8,
    "start": {
      "x": 8,
      "y": 6,
      "heading": "W"
    },
    "goal": {
      "x": 5,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 9,
        "y": 6
      },
      {
        "x": 8,
        "y": 7
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 4,
        "y": 3
      }
    ],
    "entities": [
      {
        "id": "coin-55-1",
        "type": "coin",
        "x": 3,
        "y": 6
      },
      {
        "id": "coin-55-2",
        "type": "star",
        "x": 2,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 23,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 18（这条路一共 18 格）。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：18 格路，一共 18 次。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：沿着走廊走 18 格，拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 18（这条路一共 18 格）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 19 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-056 螺旋走廊
-- 沿着走廊走 19 格，拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-056', 56,
   '螺旋走廊',
   '沿着走廊走 19 格，拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 11,
    "start": {
      "x": 1,
      "y": 9,
      "heading": "N"
    },
    "goal": {
      "x": 4,
      "y": 5
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 1,
        "y": 10
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 5
      }
    ],
    "entities": [
      {
        "id": "coin-56-1",
        "type": "coin",
        "x": 1,
        "y": 4
      },
      {
        "id": "coin-56-2",
        "type": "star",
        "x": 6,
        "y": 2
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 24,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 19（这条路一共 19 格）。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：19 格路，一共 19 次。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：沿着走廊走 19 格，拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。把「如果前面有墙」放进「重复执行」里，撞到墙就放一块「右转」，然后往前迈一步。次数改成 19（这条路一共 19 格）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 18 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-057 有路就直走
-- 沿着走廊走 11 格，拐 2 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-057', 57,
   '有路就直走',
   '沿着走廊走 11 格，拐 2 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 6,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 1,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_path_ahead",
      "label": "如果前面有路",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 15,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「右转」。次数改成 13（11 格路要加上 2 个拐角）。",
      "focus": {
        "target": "block",
        "blockType": "if_path_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：11 格路要加上 2 个拐角，一共 13 次。",
      "focus": {
        "target": "block",
        "blockType": "if_path_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：沿着走廊走 11 格，拐 2 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有路」。把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「右转」。次数改成 13（11 格路要加上 2 个拐角）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 19 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'practice',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-058 有路就直走 2
-- 沿着走廊走 13 格，拐 2 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-058', 58,
   '有路就直走 2',
   '沿着走廊走 13 格，拐 2 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 8,
    "start": {
      "x": 4,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 3,
        "y": 1
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_path_ahead",
      "label": "如果前面有路",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 17,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「右转」。次数改成 15（13 格路要加上 2 个拐角）。",
      "focus": {
        "target": "block",
        "blockType": "if_path_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：13 格路要加上 2 个拐角，一共 15 次。",
      "focus": {
        "target": "block",
        "blockType": "if_path_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "forward"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：沿着走廊走 13 格，拐 2 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有路」。把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「右转」。次数改成 15（13 格路要加上 2 个拐角）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 13 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'typing',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-059 有路就直走 3
-- 沿着走廊走 14 格，拐 2 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-059', 59,
   '有路就直走 3',
   '沿着走廊走 14 格，拐 2 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 7,
    "start": {
      "x": 6,
      "y": 5,
      "heading": "W"
    },
    "goal": {
      "x": 6,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_path_ahead",
      "label": "如果前面有路",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 18,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「右转」。次数改成 16（14 格路要加上 2 个拐角）。",
      "focus": {
        "target": "block",
        "blockType": "if_path_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：14 格路要加上 2 个拐角，一共 16 次。",
      "focus": {
        "target": "block",
        "blockType": "if_path_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：沿着走廊走 14 格，拐 2 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有路」。把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「右转」。次数改成 16（14 格路要加上 2 个拐角）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 15 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-060 有路就直走 4
-- 沿着走廊走 16 格，拐 2 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-060', 60,
   '有路就直走 4',
   '沿着走廊走 16 格，拐 2 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 9,
    "start": {
      "x": 1,
      "y": 7,
      "heading": "N"
    },
    "goal": {
      "x": 5,
      "y": 7
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 8
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 4,
        "y": 7
      }
    ],
    "entities": [
      {
        "id": "coin-60-1",
        "type": "coin",
        "x": 1,
        "y": 3
      },
      {
        "id": "coin-60-2",
        "type": "star",
        "x": 5,
        "y": 3
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_path_ahead",
      "label": "如果前面有路",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 20,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「右转」。次数改成 18（16 格路要加上 2 个拐角）。",
      "focus": {
        "target": "block",
        "blockType": "if_path_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：16 格路要加上 2 个拐角，一共 18 次。",
      "focus": {
        "target": "block",
        "blockType": "if_path_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：沿着走廊走 16 格，拐 2 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有路」。把「如果前面有路」放进「重复执行」里：有路就往前迈一步，没路就放一块「右转」。次数改成 18（16 格路要加上 2 个拐角）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 16 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-061 如果否则
-- 沿着走廊走 18 格，拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-061', 61,
   '如果否则',
   '沿着走廊走 18 格，拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 8,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 3,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 8,
        "y": 1
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 8,
        "y": 3
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 8,
        "y": 4
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 8,
        "y": 6
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 2,
        "y": 3
      }
    ],
    "entities": [
      {
        "id": "coin-61-1",
        "type": "coin",
        "x": 6,
        "y": 1
      },
      {
        "id": "coin-61-2",
        "type": "star",
        "x": 5,
        "y": 6
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_else",
      "label": "如果…否则…",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "condition",
          "label": "条件",
          "type": "select",
          "default": "wall_ahead",
          "options": [
            {
              "value": "wall_ahead",
              "label": "前面有墙"
            },
            {
              "value": "path_ahead",
              "label": "前面有路"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 23,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果…否则…」放进「重复执行」里，条件选「前面有墙」：前面有墙就放一块「右转」，没墙就往前迈一步。次数改成 21（18 格路要加上 3 个拐角）。",
      "focus": {
        "target": "block",
        "blockType": "if_else"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：18 格路要加上 3 个拐角，一共 21 次。",
      "focus": {
        "target": "block",
        "blockType": "if_else"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：沿着走廊走 18 格，拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果…否则…」。把「如果…否则…」放进「重复执行」里，条件选「前面有墙」：前面有墙就放一块「右转」，没墙就往前迈一步。次数改成 21（18 格路要加上 3 个拐角）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 18 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-062 如果否则 2
-- 沿着走廊走 19 格，拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-062', 62,
   '如果否则 2',
   '沿着走廊走 19 格，拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 10,
    "start": {
      "x": 6,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 4,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 7,
        "y": 8
      },
      {
        "x": 6,
        "y": 9
      },
      {
        "x": 5,
        "y": 9
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 4,
        "y": 9
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 3,
        "y": 9
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 1,
        "y": 9
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 4,
        "y": 5
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_else",
      "label": "如果…否则…",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "condition",
          "label": "条件",
          "type": "select",
          "default": "wall_ahead",
          "options": [
            {
              "value": "wall_ahead",
              "label": "前面有墙"
            },
            {
              "value": "path_ahead",
              "label": "前面有路"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 24,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果…否则…」放进「重复执行」里，条件选「前面有墙」：前面有墙就放一块「右转」，没墙就往前迈一步。次数改成 22（19 格路要加上 3 个拐角）。",
      "focus": {
        "target": "block",
        "blockType": "if_else"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：19 格路要加上 3 个拐角，一共 22 次。",
      "focus": {
        "target": "block",
        "blockType": "if_else"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：沿着走廊走 19 格，拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果…否则…」。把「如果…否则…」放进「重复执行」里，条件选「前面有墙」：前面有墙就放一块「右转」，没墙就往前迈一步。次数改成 22（19 格路要加上 3 个拐角）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 21 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'practice',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-063 如果否则 3
-- 沿着走廊走 18 格，拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-063', 63,
   '如果否则 3',
   '沿着走廊走 18 格，拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 10,
    "height": 8,
    "start": {
      "x": 8,
      "y": 6,
      "heading": "W"
    },
    "goal": {
      "x": 5,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 9,
        "y": 6
      },
      {
        "x": 8,
        "y": 7
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 4,
        "y": 3
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_else",
      "label": "如果…否则…",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "condition",
          "label": "条件",
          "type": "select",
          "default": "wall_ahead",
          "options": [
            {
              "value": "wall_ahead",
              "label": "前面有墙"
            },
            {
              "value": "path_ahead",
              "label": "前面有路"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 23,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果…否则…」放进「重复执行」里，条件选「前面有墙」：前面有墙就放一块「右转」，没墙就往前迈一步。次数改成 21（18 格路要加上 3 个拐角）。",
      "focus": {
        "target": "block",
        "blockType": "if_else"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：18 格路要加上 3 个拐角，一共 21 次。",
      "focus": {
        "target": "block",
        "blockType": "if_else"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "forward"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：沿着走廊走 18 格，拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果…否则…」。把「如果…否则…」放进「重复执行」里，条件选「前面有墙」：前面有墙就放一块「右转」，没墙就往前迈一步。次数改成 21（18 格路要加上 3 个拐角）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 22 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'typing',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-064 如果否则 4
-- 沿着走廊走 19 格，拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-064', 64,
   '如果否则 4',
   '沿着走廊走 19 格，拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 11,
    "start": {
      "x": 1,
      "y": 9,
      "heading": "N"
    },
    "goal": {
      "x": 4,
      "y": 5
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 1,
        "y": 10
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 5
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_else",
      "label": "如果…否则…",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "condition",
          "label": "条件",
          "type": "select",
          "default": "wall_ahead",
          "options": [
            {
              "value": "wall_ahead",
              "label": "前面有墙"
            },
            {
              "value": "path_ahead",
              "label": "前面有路"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 4,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 24,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "把「如果…否则…」放进「重复执行」里，条件选「前面有墙」：前面有墙就放一块「右转」，没墙就往前迈一步。次数改成 22（19 格路要加上 3 个拐角）。",
      "focus": {
        "target": "block",
        "blockType": "if_else"
      }
    },
    {
      "trigger": "not_completed",
      "text": "次数要数对：19 格路要加上 3 个拐角，一共 22 次。",
      "focus": {
        "target": "block",
        "blockType": "if_else"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "电脑自己做选择！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：沿着走廊走 19 格，拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件判断」来帮忙：让电脑先看情况再决定，机器人就能自己转弯。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果…否则…」。把「如果…否则…」放进「重复执行」里，条件选「前面有墙」：前面有墙就放一块「右转」，没墙就往前迈一步。次数改成 22（19 格路要加上 3 个拐角）。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 21 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u4', 'grid', 'new',
   array['condition', 'if', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-065 三段大路
-- 用 3 段「重复执行」走出Z形大路：分别走 4、3、4 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-065', 65,
   '三段大路',
   '用 3 段「重复执行」走出Z形大路：分别走 4、3、4 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 6,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 9,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 8,
        "y": 3
      },
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 9,
        "y": 3
      },
      {
        "x": 10,
        "y": 4
      },
      {
        "x": 9,
        "y": 5
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 15,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 3 段：「重复执行」走 4 格，放一块「右转」，「重复执行」走 3 格，放一块「左转」，「重复执行」走 4 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 4、3、4 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用 3 段「重复执行」走出Z形大路：分别走 4、3、4 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 4 格，放一块「右转」，「重复执行」走 3 格，放一块「左转」，「重复执行」走 4 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件判断」，还记得怎么用吗？",
    "answer": "让电脑先看情况再决定，机器人就能自己转弯。",
    "hint": "上一关用条件判断让机器人自己转弯，循环要做 22 次。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'turn', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-066 三段长路
-- 用 3 段「重复执行」走出Z形大路：分别走 5、3、5 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-066', 66,
   '三段长路',
   '用 3 段「重复执行」走出Z形大路：分别走 5、3、5 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 13,
    "start": {
      "x": 4,
      "y": 11,
      "heading": "N"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 5,
        "y": 11
      },
      {
        "x": 4,
        "y": 12
      },
      {
        "x": 3,
        "y": 11
      },
      {
        "x": 5,
        "y": 10
      },
      {
        "x": 3,
        "y": 10
      },
      {
        "x": 5,
        "y": 9
      },
      {
        "x": 3,
        "y": 9
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 3,
        "y": 8
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-66-1",
        "type": "coin",
        "x": 4,
        "y": 7
      },
      {
        "id": "coin-66-2",
        "type": "star",
        "x": 1,
        "y": 4
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 17,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 3 段：「重复执行」走 5 格，放一块「左转」，「重复执行」走 3 格，放一块「右转」，「重复执行」走 5 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 5、3、5 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用 3 段「重复执行」走出Z形大路：分别走 5、3、5 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 5 格，放一块「左转」，「重复执行」走 3 格，放一块「右转」，「重复执行」走 5 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 3 段，分别走 4、3、4 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'turn', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-067 三段回环
-- 用 3 段「重复执行」走出Z形大路：分别走 5、4、5 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-067', 67,
   '三段回环',
   '用 3 段「重复执行」走出Z形大路：分别走 5、4、5 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 13,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 5,
      "y": 11
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 2,
        "y": 1
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 6,
        "y": 8
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 6,
        "y": 9
      },
      {
        "x": 4,
        "y": 9
      },
      {
        "x": 6,
        "y": 10
      },
      {
        "x": 4,
        "y": 10
      },
      {
        "x": 6,
        "y": 11
      },
      {
        "x": 5,
        "y": 12
      },
      {
        "x": 4,
        "y": 11
      }
    ],
    "entities": [
      {
        "id": "coin-67-1",
        "type": "coin",
        "x": 1,
        "y": 5
      },
      {
        "id": "coin-67-2",
        "type": "star",
        "x": 5,
        "y": 7
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 18,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 3 段：「重复执行」走 5 格，放一块「左转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 5 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 5、4、5 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用 3 段「重复执行」走出Z形大路：分别走 5、4、5 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 5 格，放一块「左转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 5 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 3 段，分别走 5、3、5 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'turn', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-068 三段远行
-- 用 3 段「重复执行」走出Z形大路：分别走 6、4、6 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-068', 68,
   '三段远行',
   '用 3 段「重复执行」走出Z形大路：分别走 6、4、6 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 15,
    "start": {
      "x": 1,
      "y": 13,
      "heading": "N"
    },
    "goal": {
      "x": 5,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 13
      },
      {
        "x": 1,
        "y": 14
      },
      {
        "x": 0,
        "y": 13
      },
      {
        "x": 2,
        "y": 12
      },
      {
        "x": 0,
        "y": 12
      },
      {
        "x": 2,
        "y": 11
      },
      {
        "x": 0,
        "y": 11
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 0,
        "y": 10
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 1,
        "y": 6
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 3,
        "y": 8
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 4,
        "y": 1
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 20,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 3 段：「重复执行」走 6 格，放一块「右转」，「重复执行」走 4 格，放一块「左转」，「重复执行」走 6 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 6、4、6 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用 3 段「重复执行」走出Z形大路：分别走 6、4、6 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 6 格，放一块「右转」，「重复执行」走 4 格，放一块「左转」，「重复执行」走 6 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 3 段，分别走 5、4、5 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'practice',
   array['project', 'sequence', 'turn', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-069 四段大路
-- 用 4 段「重复执行」走出S形大路：分别走 5、4、5、3 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-069', 69,
   '四段大路',
   '用 4 段「重复执行」走出S形大路：分别走 5、4、5、3 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 10,
    "height": 13,
    "start": {
      "x": 1,
      "y": 11,
      "heading": "N"
    },
    "goal": {
      "x": 8,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 11
      },
      {
        "x": 1,
        "y": 12
      },
      {
        "x": 0,
        "y": 11
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 0,
        "y": 10
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 1,
        "y": 5
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 9,
        "y": 1
      },
      {
        "x": 8,
        "y": 2
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 22,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 4 段：「重复执行」走 5 格，放一块「右转」，「重复执行」走 4 格，放一块「左转」，「重复执行」走 5 格，放一块「右转」，「重复执行」走 3 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 5、4、5、3 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "turn left",
        "qwert asdfg"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用 4 段「重复执行」走出S形大路：分别走 5、4、5、3 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 4 段：「重复执行」走 5 格，放一块「右转」，「重复执行」走 4 格，放一块「左转」，「重复执行」走 5 格，放一块「右转」，「重复执行」走 3 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 3 段，分别走 6、4、6 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'typing',
   array['project', 'sequence', 'turn', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-070 四段长路
-- 用 4 段「重复执行」走出S形大路：分别走 4、6、4、6 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-070', 70,
   '四段长路',
   '用 4 段「重复执行」走出S形大路：分别走 4、6、4、6 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 15,
    "height": 11,
    "start": {
      "x": 13,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 9
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 13,
        "y": 0
      },
      {
        "x": 14,
        "y": 1
      },
      {
        "x": 12,
        "y": 1
      },
      {
        "x": 14,
        "y": 2
      },
      {
        "x": 12,
        "y": 2
      },
      {
        "x": 14,
        "y": 3
      },
      {
        "x": 12,
        "y": 3
      },
      {
        "x": 14,
        "y": 4
      },
      {
        "x": 12,
        "y": 4
      },
      {
        "x": 14,
        "y": 5
      },
      {
        "x": 13,
        "y": 6
      },
      {
        "x": 12,
        "y": 6
      },
      {
        "x": 11,
        "y": 4
      },
      {
        "x": 11,
        "y": 6
      },
      {
        "x": 10,
        "y": 4
      },
      {
        "x": 10,
        "y": 6
      },
      {
        "x": 9,
        "y": 4
      },
      {
        "x": 9,
        "y": 6
      },
      {
        "x": 8,
        "y": 4
      },
      {
        "x": 8,
        "y": 6
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 8,
        "y": 7
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 8,
        "y": 8
      },
      {
        "x": 6,
        "y": 8
      },
      {
        "x": 8,
        "y": 9
      },
      {
        "x": 7,
        "y": 10
      },
      {
        "x": 6,
        "y": 10
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 5,
        "y": 10
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 4,
        "y": 10
      },
      {
        "x": 3,
        "y": 8
      },
      {
        "x": 3,
        "y": 10
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 1,
        "y": 8
      },
      {
        "x": 1,
        "y": 10
      },
      {
        "x": 0,
        "y": 9
      }
    ],
    "entities": []
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 25,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 4 段：「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格，放一块「左转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 4、6、4、6 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用 4 段「重复执行」走出S形大路：分别走 4、6、4、6 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 4 段：「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格，放一块「左转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 4 段，分别走 5、4、5、3 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'turn', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-071 四段回环
-- 用 4 段「重复执行」走出S形大路：分别走 6、5、7、4 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-071', 71,
   '四段回环',
   '用 4 段「重复执行」走出S形大路：分别走 6、5、7、4 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 16,
    "height": 12,
    "start": {
      "x": 1,
      "y": 10,
      "heading": "E"
    },
    "goal": {
      "x": 14,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 9
      },
      {
        "x": 1,
        "y": 11
      },
      {
        "x": 0,
        "y": 10
      },
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 2,
        "y": 11
      },
      {
        "x": 3,
        "y": 9
      },
      {
        "x": 3,
        "y": 11
      },
      {
        "x": 4,
        "y": 9
      },
      {
        "x": 4,
        "y": 11
      },
      {
        "x": 5,
        "y": 9
      },
      {
        "x": 5,
        "y": 11
      },
      {
        "x": 6,
        "y": 9
      },
      {
        "x": 6,
        "y": 11
      },
      {
        "x": 8,
        "y": 10
      },
      {
        "x": 7,
        "y": 11
      },
      {
        "x": 8,
        "y": 9
      },
      {
        "x": 8,
        "y": 8
      },
      {
        "x": 6,
        "y": 8
      },
      {
        "x": 8,
        "y": 7
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 8,
        "y": 6
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 8,
        "y": 4
      },
      {
        "x": 9,
        "y": 4
      },
      {
        "x": 9,
        "y": 6
      },
      {
        "x": 10,
        "y": 4
      },
      {
        "x": 10,
        "y": 6
      },
      {
        "x": 11,
        "y": 4
      },
      {
        "x": 11,
        "y": 6
      },
      {
        "x": 12,
        "y": 4
      },
      {
        "x": 12,
        "y": 6
      },
      {
        "x": 13,
        "y": 4
      },
      {
        "x": 13,
        "y": 6
      },
      {
        "x": 15,
        "y": 5
      },
      {
        "x": 14,
        "y": 6
      },
      {
        "x": 15,
        "y": 4
      },
      {
        "x": 15,
        "y": 3
      },
      {
        "x": 13,
        "y": 3
      },
      {
        "x": 15,
        "y": 2
      },
      {
        "x": 13,
        "y": 2
      },
      {
        "x": 14,
        "y": 0
      },
      {
        "x": 15,
        "y": 1
      },
      {
        "x": 13,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-71-1",
        "type": "coin",
        "x": 7,
        "y": 10
      },
      {
        "id": "coin-71-2",
        "type": "star",
        "x": 12,
        "y": 5
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 27,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 4 段：「重复执行」走 6 格，放一块「左转」，「重复执行」走 5 格，放一块「右转」，「重复执行」走 7 格，放一块「左转」，「重复执行」走 4 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 6、5、7、4 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用 4 段「重复执行」走出S形大路：分别走 6、5、7、4 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 4 段：「重复执行」走 6 格，放一块「左转」，「重复执行」走 5 格，放一块「右转」，「重复执行」走 7 格，放一块「左转」，「重复执行」走 4 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 4 段，分别走 4、6、4、6 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'turn', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-072 四段远行
-- 用 4 段「重复执行」走出S形大路：分别走 5、7、5、7 格
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-072', 72,
   '四段远行',
   '用 4 段「重复执行」走出S形大路：分别走 5、7、5、7 格',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 17,
    "height": 13,
    "start": {
      "x": 15,
      "y": 11,
      "heading": "N"
    },
    "goal": {
      "x": 1,
      "y": 1
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 16,
        "y": 11
      },
      {
        "x": 15,
        "y": 12
      },
      {
        "x": 14,
        "y": 11
      },
      {
        "x": 16,
        "y": 10
      },
      {
        "x": 14,
        "y": 10
      },
      {
        "x": 16,
        "y": 9
      },
      {
        "x": 14,
        "y": 9
      },
      {
        "x": 16,
        "y": 8
      },
      {
        "x": 14,
        "y": 8
      },
      {
        "x": 16,
        "y": 7
      },
      {
        "x": 14,
        "y": 7
      },
      {
        "x": 15,
        "y": 5
      },
      {
        "x": 16,
        "y": 6
      },
      {
        "x": 14,
        "y": 5
      },
      {
        "x": 13,
        "y": 5
      },
      {
        "x": 13,
        "y": 7
      },
      {
        "x": 12,
        "y": 5
      },
      {
        "x": 12,
        "y": 7
      },
      {
        "x": 11,
        "y": 5
      },
      {
        "x": 11,
        "y": 7
      },
      {
        "x": 10,
        "y": 5
      },
      {
        "x": 10,
        "y": 7
      },
      {
        "x": 9,
        "y": 5
      },
      {
        "x": 9,
        "y": 7
      },
      {
        "x": 8,
        "y": 7
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 9,
        "y": 4
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 9,
        "y": 3
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 9,
        "y": 1
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "coin-72-1",
        "type": "coin",
        "x": 14,
        "y": 6
      },
      {
        "id": "coin-72-2",
        "type": "star",
        "x": 7,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_left",
      "label": "左转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 29,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "这条路分成 4 段：「重复执行」走 5 格，放一块「左转」，「重复执行」走 7 格，放一块「右转」，「重复执行」走 5 格，放一块「左转」，「重复执行」走 7 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 5、7、5、7 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用 4 段「重复执行」走出S形大路：分别走 5、7、5、7 格。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "小精灵",
      "content": "今天请「分段循环」来帮忙：把长路分成几段，每段交给循环走。"
    },
    {
      "type": "image_text",
      "image": "block_repeat",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「重复执行」。这条路分成 4 段：「重复执行」走 5 格，放一块「左转」，「重复执行」走 7 格，放一块「右转」，「重复执行」走 5 格，放一块「左转」，「重复执行」走 7 格。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 4 段，分别走 6、5、7、4 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'turn', 'loop'], null,
   15, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-073 先走再绕
-- 先直走 5 格，再自动拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-073', 73,
   '先走再绕',
   '先直走 5 格，再自动拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 7,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 3,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 2,
        "y": 3
      }
    ],
    "entities": [
      {
        "id": "coin-73-1",
        "type": "coin",
        "x": 4,
        "y": 1
      },
      {
        "id": "coin-73-2",
        "type": "star",
        "x": 6,
        "y": 3
      },
      {
        "id": "coin-73-3",
        "type": "coin",
        "x": 4,
        "y": 5
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 27,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "前面 5 格自己走：把「前进」放进「重复执行」，次数改成 5；剩下 9 格交给「如果前面有墙」自动转弯，那一段的次数也改成 9。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "前半段自己走（5 次），后半段靠条件转弯（9 次），两段的次数都要数对。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：先直走 5 格，再自动拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「组合运用」来帮忙：自己先走一段，剩下的交给条件判断。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。前面 5 格自己走：把「前进」放进「重复执行」，次数改成 5；剩下 9 格交给「如果前面有墙」自动转弯，那一段的次数也改成 9。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「分段循环」，还记得怎么用吗？",
    "answer": "把长路分成几段，每段交给循环走。",
    "hint": "上一关把路分成 4 段，分别走 5、7、5、7 格。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'practice',
   array['project', 'sequence', 'loop', 'condition'], null,
   20, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-074 走一步再绕
-- 先直走 6 格，再自动拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-074', 74,
   '走一步再绕',
   '先直走 6 格，再自动拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 9,
    "start": {
      "x": 5,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 3,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 4,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 3,
        "y": 8
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 1,
        "y": 8
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 1,
        "y": 3
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 3,
        "y": 5
      }
    ],
    "entities": [
      {
        "id": "coin-74-1",
        "type": "coin",
        "x": 5,
        "y": 4
      },
      {
        "id": "coin-74-2",
        "type": "star",
        "x": 3,
        "y": 7
      },
      {
        "id": "coin-74-3",
        "type": "coin",
        "x": 1,
        "y": 5
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 28,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "前面 6 格自己走：把「前进」放进「重复执行」，次数改成 6；剩下 9 格交给「如果前面有墙」自动转弯，那一段的次数也改成 9。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "前半段自己走（6 次），后半段靠条件转弯（9 次），两段的次数都要数对。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "turn left",
        "qwert asdfg"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：先直走 6 格，再自动拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「组合运用」来帮忙：自己先走一段，剩下的交给条件判断。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。前面 6 格自己走：把「前进」放进「重复执行」，次数改成 6；剩下 9 格交给「如果前面有墙」自动转弯，那一段的次数也改成 9。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「组合运用」，还记得怎么用吗？",
    "answer": "自己先走一段，剩下的交给条件判断。",
    "hint": "上一关先自己走 5 格，剩下的路交给条件自动转弯。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'loop', 'condition'], null,
   20, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-075 边走边判断
-- 先直走 6 格，再自动拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-075', 75,
   '边走边判断',
   '先直走 6 格，再自动拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 8,
    "start": {
      "x": 7,
      "y": 6,
      "heading": "W"
    },
    "goal": {
      "x": 4,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 8,
        "y": 6
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 3,
        "y": 7
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 3,
        "y": 3
      }
    ],
    "entities": [
      {
        "id": "coin-75-1",
        "type": "coin",
        "x": 4,
        "y": 6
      },
      {
        "id": "coin-75-2",
        "type": "star",
        "x": 1,
        "y": 4
      },
      {
        "id": "coin-75-3",
        "type": "coin",
        "x": 3,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 29,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "前面 6 格自己走：把「前进」放进「重复执行」，次数改成 6；剩下 10 格交给「如果前面有墙」自动转弯，那一段的次数也改成 10。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "前半段自己走（6 次），后半段靠条件转弯（10 次），两段的次数都要数对。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：先直走 6 格，再自动拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「组合运用」来帮忙：自己先走一段，剩下的交给条件判断。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。前面 6 格自己走：把「前进」放进「重复执行」，次数改成 6；剩下 10 格交给「如果前面有墙」自动转弯，那一段的次数也改成 10。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「组合运用」，还记得怎么用吗？",
    "answer": "自己先走一段，剩下的交给条件判断。",
    "hint": "上一关先自己走 6 格，剩下的路交给条件自动转弯。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'loop', 'condition'], null,
   20, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-076 综合一
-- 先直走 7 格，再自动拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-076', 76,
   '综合一',
   '先直走 7 格，再自动拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 10,
    "start": {
      "x": 1,
      "y": 8,
      "heading": "N"
    },
    "goal": {
      "x": 4,
      "y": 5
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 1,
        "y": 9
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 5
      }
    ],
    "entities": [
      {
        "id": "coin-76-1",
        "type": "coin",
        "x": 1,
        "y": 5
      },
      {
        "id": "coin-76-2",
        "type": "star",
        "x": 3,
        "y": 1
      },
      {
        "id": "coin-76-3",
        "type": "coin",
        "x": 6,
        "y": 4
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 31,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "前面 7 格自己走：把「前进」放进「重复执行」，次数改成 7；剩下 11 格交给「如果前面有墙」自动转弯，那一段的次数也改成 11。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "前半段自己走（7 次），后半段靠条件转弯（11 次），两段的次数都要数对。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：先直走 7 格，再自动拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「组合运用」来帮忙：自己先走一段，剩下的交给条件判断。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。前面 7 格自己走：把「前进」放进「重复执行」，次数改成 7；剩下 11 格交给「如果前面有墙」自动转弯，那一段的次数也改成 11。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「组合运用」，还记得怎么用吗？",
    "answer": "自己先走一段，剩下的交给条件判断。",
    "hint": "上一关先自己走 6 格，剩下的路交给条件自动转弯。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'loop', 'condition'], null,
   20, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-077 综合二
-- 先直走 7 格，再自动拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-077', 77,
   '综合二',
   '先直走 7 格，再自动拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 10,
    "height": 8,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 4,
      "y": 3
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 1,
        "y": 2
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 8,
        "y": 0
      },
      {
        "x": 9,
        "y": 1
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 9,
        "y": 3
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 9,
        "y": 4
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 9,
        "y": 5
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 9,
        "y": 6
      },
      {
        "x": 8,
        "y": 7
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 3,
        "y": 5
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 3,
        "y": 3
      }
    ],
    "entities": [
      {
        "id": "coin-77-1",
        "type": "coin",
        "x": 5,
        "y": 1
      },
      {
        "id": "coin-77-2",
        "type": "star",
        "x": 8,
        "y": 4
      },
      {
        "id": "coin-77-3",
        "type": "coin",
        "x": 4,
        "y": 6
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 32,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "前面 7 格自己走：把「前进」放进「重复执行」，次数改成 7；剩下 12 格交给「如果前面有墙」自动转弯，那一段的次数也改成 12。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "前半段自己走（7 次），后半段靠条件转弯（12 次），两段的次数都要数对。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：先直走 7 格，再自动拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「组合运用」来帮忙：自己先走一段，剩下的交给条件判断。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。前面 7 格自己走：把「前进」放进「重复执行」，次数改成 7；剩下 12 格交给「如果前面有墙」自动转弯，那一段的次数也改成 12。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「组合运用」，还记得怎么用吗？",
    "answer": "自己先走一段，剩下的交给条件判断。",
    "hint": "上一关先自己走 7 格，剩下的路交给条件自动转弯。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'loop', 'condition'], null,
   20, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-078 综合三
-- 先直走 8 格，再自动拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-078', 78,
   '综合三',
   '先直走 8 格，再自动拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 11,
    "start": {
      "x": 6,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 4,
      "y": 5
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      },
      {
        "x": 5,
        "y": 1
      },
      {
        "x": 7,
        "y": 2
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 7,
        "y": 3
      },
      {
        "x": 5,
        "y": 3
      },
      {
        "x": 7,
        "y": 4
      },
      {
        "x": 5,
        "y": 4
      },
      {
        "x": 7,
        "y": 5
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 7,
        "y": 8
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 7,
        "y": 9
      },
      {
        "x": 6,
        "y": 10
      },
      {
        "x": 5,
        "y": 10
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 4,
        "y": 10
      },
      {
        "x": 3,
        "y": 8
      },
      {
        "x": 3,
        "y": 10
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 1,
        "y": 10
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 1,
        "y": 4
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 4,
        "y": 4
      },
      {
        "x": 4,
        "y": 6
      }
    ],
    "entities": [
      {
        "id": "coin-78-1",
        "type": "coin",
        "x": 6,
        "y": 5
      },
      {
        "id": "coin-78-2",
        "type": "star",
        "x": 4,
        "y": 9
      },
      {
        "id": "coin-78-3",
        "type": "coin",
        "x": 1,
        "y": 6
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 33,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "前面 8 格自己走：把「前进」放进「重复执行」，次数改成 8；剩下 12 格交给「如果前面有墙」自动转弯，那一段的次数也改成 12。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "前半段自己走（8 次），后半段靠条件转弯（12 次），两段的次数都要数对。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：先直走 8 格，再自动拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「组合运用」来帮忙：自己先走一段，剩下的交给条件判断。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。前面 8 格自己走：把「前进」放进「重复执行」，次数改成 8；剩下 12 格交给「如果前面有墙」自动转弯，那一段的次数也改成 12。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「组合运用」，还记得怎么用吗？",
    "answer": "自己先走一段，剩下的交给条件判断。",
    "hint": "上一关先自己走 7 格，剩下的路交给条件自动转弯。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'practice',
   array['project', 'sequence', 'loop', 'condition'], null,
   20, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-079 综合四
-- 先直走 8 格，再自动拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-079', 79,
   '综合四',
   '先直走 8 格，再自动拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 9,
    "start": {
      "x": 9,
      "y": 7,
      "heading": "W"
    },
    "goal": {
      "x": 5,
      "y": 4
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 9,
        "y": 6
      },
      {
        "x": 10,
        "y": 7
      },
      {
        "x": 9,
        "y": 8
      },
      {
        "x": 8,
        "y": 6
      },
      {
        "x": 8,
        "y": 8
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 7,
        "y": 8
      },
      {
        "x": 6,
        "y": 6
      },
      {
        "x": 6,
        "y": 8
      },
      {
        "x": 5,
        "y": 6
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 4,
        "y": 8
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 3,
        "y": 8
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 1,
        "y": 8
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 4,
        "y": 3
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 4
      }
    ],
    "entities": [
      {
        "id": "coin-79-1",
        "type": "coin",
        "x": 5,
        "y": 7
      },
      {
        "id": "coin-79-2",
        "type": "star",
        "x": 1,
        "y": 4
      },
      {
        "id": "coin-79-3",
        "type": "coin",
        "x": 4,
        "y": 1
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 34,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "前面 8 格自己走：把「前进」放进「重复执行」，次数改成 8；剩下 13 格交给「如果前面有墙」自动转弯，那一段的次数也改成 13。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "前半段自己走（8 次），后半段靠条件转弯（13 次），两段的次数都要数对。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "闯关成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "activities": {
    "typing": {
      "targets": [
        "turn left",
        "qwert asdfg"
      ],
      "required": false
    }
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：先直走 8 格，再自动拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「组合运用」来帮忙：自己先走一段，剩下的交给条件判断。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。前面 8 格自己走：把「前进」放进「重复执行」，次数改成 8；剩下 13 格交给「如果前面有墙」自动转弯，那一段的次数也改成 13。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「组合运用」，还记得怎么用吗？",
    "answer": "自己先走一段，剩下的交给条件判断。",
    "hint": "上一关先自己走 8 格，剩下的路交给条件自动转弯。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'new',
   array['project', 'sequence', 'loop', 'condition'], null,
   20, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- blk-080 学期大挑战
-- 先直走 8 格，再自动拐 3 个弯
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- 线上原本只有 blk-001…blk-015 是真实关卡，blk-016…blk-060 是占位（上面已挪到预留号段），
-- blk-061…blk-080 压根不存在。纯 update 会让这些关卡匹配 0 行、静默跳过，
-- 迁移"成功"了但一关都没写进去。on conflict 让"已存在就改正文、不存在就新建"两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-080', 80,
   '学期大挑战',
   '先直走 8 格，再自动拐 3 个弯',
   $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 11,
    "start": {
      "x": 1,
      "y": 9,
      "heading": "N"
    },
    "goal": {
      "x": 4,
      "y": 6
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 2,
        "y": 9
      },
      {
        "x": 1,
        "y": 10
      },
      {
        "x": 0,
        "y": 9
      },
      {
        "x": 2,
        "y": 8
      },
      {
        "x": 0,
        "y": 8
      },
      {
        "x": 2,
        "y": 7
      },
      {
        "x": 0,
        "y": 7
      },
      {
        "x": 2,
        "y": 6
      },
      {
        "x": 0,
        "y": 6
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 0,
        "y": 5
      },
      {
        "x": 2,
        "y": 4
      },
      {
        "x": 0,
        "y": 4
      },
      {
        "x": 2,
        "y": 3
      },
      {
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 2
      },
      {
        "x": 0,
        "y": 2
      },
      {
        "x": 1,
        "y": 0
      },
      {
        "x": 0,
        "y": 1
      },
      {
        "x": 2,
        "y": 0
      },
      {
        "x": 3,
        "y": 0
      },
      {
        "x": 3,
        "y": 2
      },
      {
        "x": 4,
        "y": 0
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 5,
        "y": 0
      },
      {
        "x": 5,
        "y": 2
      },
      {
        "x": 6,
        "y": 0
      },
      {
        "x": 6,
        "y": 2
      },
      {
        "x": 7,
        "y": 0
      },
      {
        "x": 8,
        "y": 1
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 8,
        "y": 3
      },
      {
        "x": 6,
        "y": 3
      },
      {
        "x": 8,
        "y": 4
      },
      {
        "x": 6,
        "y": 4
      },
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 6,
        "y": 5
      },
      {
        "x": 8,
        "y": 6
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 6,
        "y": 7
      },
      {
        "x": 5,
        "y": 5
      },
      {
        "x": 5,
        "y": 7
      },
      {
        "x": 4,
        "y": 5
      },
      {
        "x": 4,
        "y": 7
      },
      {
        "x": 3,
        "y": 6
      }
    ],
    "entities": [
      {
        "id": "coin-80-1",
        "type": "coin",
        "x": 1,
        "y": 5
      },
      {
        "id": "coin-80-2",
        "type": "star",
        "x": 4,
        "y": 1
      },
      {
        "id": "coin-80-3",
        "type": "coin",
        "x": 7,
        "y": 5
      }
    ]
  },
  "available_blocks": [
    {
      "type": "move_forward",
      "label": "前进",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "turn_right",
      "label": "右转",
      "category": "动作",
      "kind": "action",
      "args": []
    },
    {
      "type": "repeat",
      "label": "重复执行",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "times",
          "label": "次数",
          "type": "number",
          "default": 2,
          "min": 1,
          "max": 20,
          "step": 1
        }
      ]
    },
    {
      "type": "if_wall_ahead",
      "label": "如果前面有墙",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "actor_at_goal",
    "actor_id": "player"
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 6,
    "require_connected": true
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 35,
    "stop_on_success": true,
    "move_duration_ms": 450
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "前面 8 格自己走：把「前进」放进「重复执行」，次数改成 8；剩下 14 格交给「如果前面有墙」自动转弯，那一段的次数也改成 14。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    },
    {
      "trigger": "not_completed",
      "text": "前半段自己走（8 次），后半段靠条件转弯（14 次），两段的次数都要数对。",
      "focus": {
        "target": "block",
        "blockType": "if_wall_ahead"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "学期大挑战通关！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：先直走 8 格，再自动拐 3 个弯。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「组合运用」来帮忙：自己先走一段，剩下的交给条件判断。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果前面有墙」。前面 8 格自己走：把「前进」放进「重复执行」，次数改成 8；剩下 14 格交给「如果前面有墙」自动转弯，那一段的次数也改成 14。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「组合运用」，还记得怎么用吗？",
    "answer": "自己先走一段，剩下的交给条件判断。",
    "hint": "上一关先自己走 8 格，剩下的路交给条件自动转弯。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g1-fall', 'blk-g1-fall-u5', 'grid', 'project',
   array['project', 'sequence', 'loop', 'condition'], 'term1_master',
   20, false)
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  body = excluded.body,
  published = excluded.published,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  is_placeholder = excluded.is_placeholder,
  updated_at = now();

-- 验收 SQL（迁移后逐条跑）
--
-- A. 第一学期 80 关，都是真实正文
-- select count(*) from public.module_level
-- where module_id = 'blockly' and term_id = 'blk-g1-fall' and is_placeholder = false;
--
-- B. 编号连续 1-80，没有重复也没有占位
-- select min(sort_order), max(sort_order), count(*)
-- from public.module_level where module_id = 'blockly' and term_id = 'blk-g1-fall';
--
-- C. 后面三个学期换号成功，号段互不重叠
-- select term_id, min(sort_order), max(sort_order), count(*)
-- from public.module_level where module_id = 'blockly'
-- group by term_id order by min(sort_order);
--
-- D. 没有关卡游离在单元之外
-- select count(*) from public.module_level
-- where module_id = 'blockly' and (term_id is null or unit_id is null);
--
-- E. 正文里的 scene_type 与列一致
-- select level_id from public.module_level ml
-- where ml.module_id = 'blockly' and ml.scene_type <> ml.body->>'scene_type';
--
-- F. 学习记录没有指向不存在关卡的行（换号失败会在这里露出来）
-- select lr.level_id, count(*) from public.learning_record lr
-- where lr.module_id = 'blockly'
--   and not exists (select 1 from public.module_level ml
--                   where ml.module_id = 'blockly' and ml.level_id = lr.level_id)
-- group by lr.level_id;
