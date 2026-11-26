-- Blockly Level 0 的第 7 到 15 关：把 level 0（blk-g1-fall）补满成一个完整的 15 周课程。
--
-- 正文统一用 schema_version 2（scene_type 判别场景形态，scene 放场景数据），
-- 和 20261126130000_blockly_level_1_6_body_v2.sql 的前 6 关同一套结构。
--
-- 单元切分也按本文件重新对齐（原来 007-011 在 u4、012-015 在 u5）：
--   u1 走和转            001-002   2 关
--   u2 循环、条件和迷宫  003-006   4 关   （005、006 从 u3 挪过来）
--   u3 重复的小秘密      007-009   3 关
--   u4 让电脑做选择      010-012   3 关
--   u5 闯关大挑战        013-015   3 关
-- 005、006 的正文不动，只改归属单元；关卡的解锁顺序按 sort_order 线性排，不受单元影响。
--
-- 本关新增两个积木，积木定义表（moduleLevelBody.ts 的 BLOCK_BRANCH_SHAPES）里
-- 固定了它们的分支形状，正文里的 "branches" 只是把形状写明，解析器会校验一致性：
--   if_path_ahead  如果前面有路 … 否则 …   两支分支：成立走 BODY，不成立走 ELSE
--   if_else        如果 条件[前面有墙/前面有路] … 否则 …   通用条件，本步只支持环境判断
--
-- 步数与积木数的口径：
--   workspace.max_blocks  工作区积木总数（含嵌套子块），写成长段路会超限，逼迫用循环。
--   runtime.max_steps     展开后的执行步数（前进和转弯各算一步），留一点点余量。
-- 每关的标准解（转弯也算一步）：
--   blk-007  重复 2 次 { 重复 5 次 { 前进 } + 右转 + 重复 3 次 { 前进 } + 右转 }       15 步
--   blk-008  前进 + 重复 4 次 { 重复 3 次 { 前进 } + 右转 }（画完正方形回到原点）    17 步
--   blk-009  重复 2 次 { 重复 2 次 { 前进 } + 右转 + 重复 2 次 { 前进 } + 左转 }      11 步
--   blk-010  重复 7 次 { 如果前面有墙 { 右转 } + 前进 }                               7 步
--   blk-011  重复 7 次 { 如果前面有路 { 前进 } 否则 { 左转 } }                         7 步
--   blk-012  重复 13 次 { 如果前面有路 { 前进 } 否则 { 右转 } }                      13 步
--   blk-013  重复 5 次 { 前进 } + 重复 4 次 { 如果前面有墙 { 右转 } + 前进 } + 前进
--             + 左转 + 重复 2 次 { 前进 } + 左转 + 重复 2 次 { 前进 }                18 步
--   blk-014  重复 4 次 { 前进 } + 重复 3 次 { 如果前面有路 { 前进 } 否则 { 右转 } }
--             + 右转 + 重复 3 次 { 前进 } + 左转 + 重复 2 次 { 前进 } + 右转 + 前进   16 步
--   blk-015  重复 5 次 { 前进 } + 重复 4 次 { 如果[前面有墙] { 右转 } 否则 { 前进 } }
--             + 右转 + 重复 5 次 { 前进 } + 左转 + 重复 2 次 { 前进 }                18 步
--
-- Neon 跨语句没有事务，每条语句都写成幂等的固定值写入，重跑即可。


-- 1. 单元重新切分：只改标题、简介、知识点和容量，unit_id 和 sort_order 不动。
insert into public.module_unit
  (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
values
  ('blockly', 'blk-g1-fall-u2', 'blk-g1-fall', '循环、条件和迷宫',
   '用重复执行走长道、绕出正方形，再学遇墙转弯，最后走出迷宫。', 'grid',
   array['loop', 'nested_loop', 'condition'], 4, 2),
  ('blockly', 'blk-g1-fall-u3', 'blk-g1-fall', '重复的小秘密',
   '用嵌套循环走 U 型大路、画正方形、爬转角楼梯。', 'grid',
   array['loop', 'nested_loop', 'sequence'], 3, 3),
  ('blockly', 'blk-g1-fall-u4', 'blk-g1-fall', '让电脑做选择',
   '学会用“如果”让电脑自己判断，遇到岔路口和陷阱都能绕过去。', 'grid',
   array['condition', 'if', 'loop'], 3, 4),
  ('blockly', 'blk-g1-fall-u5', 'blk-g1-fall', '闯关大挑战',
   '顺序、循环、条件一起上，连续闯过三个大迷宫。', 'grid',
   array['sequence', 'turn', 'loop', 'condition', 'project'], 3, 5)
on conflict (module_id, unit_id) do update set
  term_id = excluded.term_id,
  title = excluded.title,
  summary = excluded.summary,
  scene_form = excluded.scene_form,
  knowledge_tags = excluded.knowledge_tags,
  level_cap = excluded.level_cap,
  sort_order = excluded.sort_order,
  updated_at = now();


-- 2. 005、006 挪进 u2，正文保持原样。
update public.module_level
set unit_id = 'blk-g1-fall-u2', updated_at = now()
where module_id = 'blockly'
  and level_id in ('blk-005', 'blk-006');


-- 3. blk-007 U 型大路（嵌套循环）
-- 地图是一条 U 形回廊：上排往东、右侧往南、下排往西，中间全是墙，只能绕着走。
update public.module_level
set
  title = 'U 型大路',
  goal = '用两层循环走完一条长长的 U 型路',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u3',
  scene_type = 'grid',
  level_type = 'practice',
  knowledge_tags = array['loop', 'nested_loop'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 6,
      "height": 4,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 0, "y": 3 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 0, "y": 1 }, { "x": 1, "y": 1 }, { "x": 2, "y": 1 }, { "x": 3, "y": 1 }, { "x": 4, "y": 1 },
        { "x": 0, "y": 2 }, { "x": 1, "y": 2 }, { "x": 2, "y": 2 }, { "x": 3, "y": 2 }, { "x": 4, "y": 2 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 8, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 18, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "这条路是 U 形的：先往东走到头，右转往下走，再右转往西。" },
      { "trigger": "not_completed", "text": "两条长直道一样长，用“重复”套“重复”最省积木。" }
    ],
    "completion": { "stars": 3, "success_text": "U 型大路走通啦！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-007';


-- 4. blk-008 画正方形回到原点（嵌套循环）
-- 地图是一个 5×5 的方形回廊：中间 2×2 是墙，四周是一条绕圈的窄路。
-- 起点在 (0,0)，正方形的起点（原点）在 (1,0)，所以机器人先往右一步站到原点，
-- 再绕一圈回到原点。中途也会踩到原点，这一关的 stop_on_success 关掉，跑到终点才算通关。
update public.module_level
set
  title = '画正方形回到原点',
  goal = '用嵌套循环画一个正方形，再走回原点',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u3',
  scene_type = 'grid',
  level_type = 'practice',
  knowledge_tags = array['loop', 'nested_loop'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 5,
      "height": 5,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 1, "y": 0 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 0, "y": 1 }, { "x": 0, "y": 2 }, { "x": 0, "y": 3 }, { "x": 0, "y": 4 },
        { "x": 1, "y": 4 }, { "x": 2, "y": 4 }, { "x": 3, "y": 4 }, { "x": 4, "y": 4 },
        { "x": 2, "y": 1 }, { "x": 3, "y": 1 },
        { "x": 2, "y": 2 }, { "x": 3, "y": 2 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 6, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 20, "stop_on_success": false, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "先往右一步站到正方形的起点，再一圈绕回来。" },
      { "trigger": "not_completed", "text": "四条边一样长：外层重复 4 次转方向，内层重复 3 次前进。" }
    ],
    "completion": { "stars": 3, "success_text": "正方形画好，还回到原点啦！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-008';


-- 5. blk-009 转角楼梯（循环 + 转弯）
-- 地图是一段“之”字楼梯：往东 2 格、往南 2 格、往东 2 格、往南 2 格。
update public.module_level
set
  title = '转角楼梯',
  goal = '用循环和转弯，走出层层叠叠的转角楼梯',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u3',
  scene_type = 'grid',
  level_type = 'practice',
  knowledge_tags = array['loop', 'turn', 'nested_loop'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 5,
      "height": 5,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 4, "y": 4 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 3, "y": 0 }, { "x": 4, "y": 0 },
        { "x": 0, "y": 1 }, { "x": 1, "y": 1 }, { "x": 3, "y": 1 }, { "x": 4, "y": 1 },
        { "x": 0, "y": 2 }, { "x": 1, "y": 2 },
        { "x": 0, "y": 3 }, { "x": 1, "y": 3 }, { "x": 2, "y": 3 }, { "x": 3, "y": 3 },
        { "x": 0, "y": 4 }, { "x": 1, "y": 4 }, { "x": 2, "y": 4 }, { "x": 3, "y": 4 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_left", "label": "左转", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 8, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 14, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "楼梯是一层一层叠上去的：走 2 格、右转、走 2 格、左转。" },
      { "trigger": "not_completed", "text": "两段楼梯长得一模一样，把它们放进同一个“重复”里。" }
    ],
    "completion": { "stars": 3, "success_text": "爬到楼梯顶啦！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-009';


-- 6. blk-010 走到尽头（条件入门）
-- 一条横着的长走廊，走到最右边就是地图边界，机器人只能右转往下走。
update public.module_level
set
  title = '走到尽头',
  goal = '前面有墙就右转，一直走到终点',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u4',
  scene_type = 'grid',
  level_type = 'practice',
  knowledge_tags = array['condition', 'loop'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 5,
      "height": 5,
      "start": { "x": 0, "y": 2, "heading": "E" },
      "goal": { "x": 4, "y": 4 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 0, "y": 0 }, { "x": 1, "y": 0 }, { "x": 2, "y": 0 }, { "x": 3, "y": 0 }, { "x": 4, "y": 0 },
        { "x": 0, "y": 1 }, { "x": 1, "y": 1 }, { "x": 2, "y": 1 }, { "x": 3, "y": 1 }, { "x": 4, "y": 1 },
        { "x": 0, "y": 3 }, { "x": 1, "y": 3 }, { "x": 2, "y": 3 }, { "x": 3, "y": 3 },
        { "x": 0, "y": 4 }, { "x": 1, "y": 4 }, { "x": 2, "y": 4 }, { "x": 3, "y": 4 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      },
      { "type": "if_wall_ahead", "label": "如果前面有墙", "category": "控制", "kind": "control", "args": [] }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 6, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 10, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "把“如果前面有墙”放进“重复执行”里，撞到墙时它就右转。" },
      { "trigger": "not_completed", "text": "重复次数要够多，机器人才能一直走到尽头。" }
    ],
    "completion": { "stars": 3, "success_text": "走到尽头啦！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-010';


-- 7. blk-011 岔路口（如果前面有路 … 否则 …）
-- 走廊往东走到头，正前方是地图边界，右边是墙，只能往左（北）拐进另一条走廊。
update public.module_level
set
  title = '岔路口',
  goal = '前面有路就往前走，没路就左转',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u4',
  scene_type = 'grid',
  level_type = 'new',
  knowledge_tags = array['condition', 'if', 'loop'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 4,
      "height": 4,
      "start": { "x": 0, "y": 3, "heading": "E" },
      "goal": { "x": 3, "y": 0 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 0, "y": 0 }, { "x": 1, "y": 0 }, { "x": 2, "y": 0 },
        { "x": 0, "y": 1 }, { "x": 1, "y": 1 }, { "x": 2, "y": 1 },
        { "x": 0, "y": 2 }, { "x": 1, "y": 2 }, { "x": 2, "y": 2 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_left", "label": "左转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      },
      {
        "type": "if_path_ahead",
        "label": "如果前面有路",
        "category": "控制",
        "kind": "control",
        "branches": "then_else",
        "args": []
      }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 5, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 9, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "新积木“如果前面有路”有两支：有路走上面，没路走下面。" },
      { "trigger": "not_completed", "text": "岔路口上没路了，就用“否则”那支左转。" }
    ],
    "completion": { "stars": 3, "success_text": "岔路口选对啦！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-011';


-- 8. blk-012 陷阱通道（条件 + 循环）
-- 地图是一个 S 型回廊，中间那条横道往北还挂着一个小格子 (4,1)：
-- 那是个只能进不能出的死胡同，在最右边那个拐角往左转就等于走进了陷阱，
-- 正确做法是往右（南）转，沿下排走到 (1,3)，再往北拐进终点 (1,1)。
update public.module_level
set
  title = '陷阱通道',
  goal = '用条件和循环走完一条带陷阱的通道',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u4',
  scene_type = 'grid',
  level_type = 'practice',
  knowledge_tags = array['condition', 'loop', 'sequence'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 6,
      "height": 5,
      "start": { "x": 0, "y": 2, "heading": "E" },
      "goal": { "x": 1, "y": 1 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 0, "y": 0 }, { "x": 1, "y": 0 }, { "x": 2, "y": 0 }, { "x": 3, "y": 0 }, { "x": 4, "y": 0 }, { "x": 5, "y": 0 },
        { "x": 0, "y": 1 }, { "x": 2, "y": 1 }, { "x": 3, "y": 1 }, { "x": 5, "y": 1 },
        { "x": 5, "y": 2 },
        { "x": 0, "y": 3 }, { "x": 5, "y": 3 },
        { "x": 0, "y": 4 }, { "x": 1, "y": 4 }, { "x": 2, "y": 4 }, { "x": 3, "y": 4 }, { "x": 4, "y": 4 }, { "x": 5, "y": 4 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_left", "label": "左转", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      },
      { "type": "if_wall_ahead", "label": "如果前面有墙", "category": "控制", "kind": "control", "args": [] },
      {
        "type": "if_path_ahead",
        "label": "如果前面有路",
        "category": "控制",
        "kind": "control",
        "branches": "then_else",
        "args": []
      }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 6, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 15, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "走到最右边时，上面那个小格子是死胡同，往下拐才能继续往终点走。" },
      { "trigger": "not_completed", "text": "有路就往前，没路才转弯；别在假路口拐弯。" }
    ],
    "completion": { "stars": 3, "success_text": "避开陷阱，到达终点！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-012';


-- 9. blk-013 之字迷宫（顺序 + 循环 + 条件）
-- 之字形回廊：往东 → 往南 → 往西 → 再往南 → 往东。
-- 中间那一段要往南（面对西时是左转），所以光靠“如果前面有墙就右转”会走进死路。
update public.module_level
set
  title = '之字迷宫',
  goal = '顺序、循环和条件一起上，走出之字迷宫',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u5',
  scene_type = 'grid',
  level_type = 'project',
  knowledge_tags = array['sequence', 'turn', 'loop', 'condition'],
  milestone_badge = null,
  estimated_minutes = 20,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 7,
      "height": 5,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 4, "y": 4 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 6, "y": 0 },
        { "x": 0, "y": 1 }, { "x": 1, "y": 1 }, { "x": 2, "y": 1 }, { "x": 3, "y": 1 }, { "x": 4, "y": 1 }, { "x": 6, "y": 1 },
        { "x": 0, "y": 2 }, { "x": 1, "y": 2 }, { "x": 6, "y": 2 },
        { "x": 0, "y": 3 }, { "x": 1, "y": 3 }, { "x": 3, "y": 3 }, { "x": 4, "y": 3 }, { "x": 5, "y": 3 }, { "x": 6, "y": 3 },
        { "x": 0, "y": 4 }, { "x": 1, "y": 4 }, { "x": 5, "y": 4 }, { "x": 6, "y": 4 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_left", "label": "左转", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      },
      { "type": "if_wall_ahead", "label": "如果前面有墙", "category": "控制", "kind": "control", "args": [] }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 15, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 21, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "先看清路线：往东、往南、往西、往南、往东，一段一段拼起来。" },
      { "trigger": "not_completed", "text": "长直道用“重复”表示，拐弯的地方别忘了区分左转和右转。" }
    ],
    "completion": { "stars": 3, "success_text": "之字迷宫闯过了！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-013';


-- 10. blk-014 回字迷宫（条件 + 循环）
-- 回廊绕成一个“回”字：往东、往南、往西、往南、往西。
update public.module_level
set
  title = '回字迷宫',
  goal = '用“如果前面有路”拐弯，走出回字迷宫',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u5',
  scene_type = 'grid',
  level_type = 'project',
  knowledge_tags = array['sequence', 'turn', 'loop', 'condition'],
  milestone_badge = null,
  estimated_minutes = 20,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 6,
      "height": 5,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 0, "y": 4 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 5, "y": 0 },
        { "x": 0, "y": 1 }, { "x": 1, "y": 1 }, { "x": 2, "y": 1 }, { "x": 3, "y": 1 }, { "x": 5, "y": 1 },
        { "x": 0, "y": 2 }, { "x": 5, "y": 2 },
        { "x": 0, "y": 3 }, { "x": 2, "y": 3 }, { "x": 3, "y": 3 }, { "x": 4, "y": 3 }, { "x": 5, "y": 3 },
        { "x": 2, "y": 4 }, { "x": 3, "y": 4 }, { "x": 4, "y": 4 }, { "x": 5, "y": 4 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_left", "label": "左转", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      },
      {
        "type": "if_path_ahead",
        "label": "如果前面有路",
        "category": "控制",
        "kind": "control",
        "branches": "then_else",
        "args": []
      }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 16, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 19, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "路线是往东、往南、往西、往南、往西，先把这五段记下来。" },
      { "trigger": "not_completed", "text": "“如果前面有路”里，有路走上面，没路走“否则”那支转弯。" }
    ],
    "completion": { "stars": 3, "success_text": "回字迷宫闯过了！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-014';


-- 11. blk-015 期末大挑战（通用条件 + 顺序 + 循环）
-- 最后一关用通用条件积木“如果…否则…”，条件可以在“前面有墙”和“前面有路”之间选。
-- 路线是往东走到头、往南走到头、往西走到头、再往南到终点，
-- 中间那条横道往下还挂着一个小格子 (3,4)，那是个死胡同，转错方向就出不来。
update public.module_level
set
  title = '期末大挑战',
  goal = '在限定积木数量内闯过期末大迷宫',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u5',
  scene_type = 'grid',
  level_type = 'project',
  knowledge_tags = array['sequence', 'turn', 'loop', 'condition', 'project'],
  milestone_badge = 'term1_master',
  estimated_minutes = 25,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 7,
      "height": 6,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 0, "y": 5 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 6, "y": 0 },
        { "x": 0, "y": 1 }, { "x": 1, "y": 1 }, { "x": 2, "y": 1 }, { "x": 3, "y": 1 }, { "x": 4, "y": 1 }, { "x": 6, "y": 1 },
        { "x": 0, "y": 2 }, { "x": 1, "y": 2 }, { "x": 2, "y": 2 }, { "x": 3, "y": 2 }, { "x": 4, "y": 2 }, { "x": 6, "y": 2 },
        { "x": 6, "y": 3 },
        { "x": 1, "y": 4 }, { "x": 2, "y": 4 }, { "x": 4, "y": 4 }, { "x": 5, "y": 4 }, { "x": 6, "y": 4 },
        { "x": 1, "y": 5 }, { "x": 2, "y": 5 }, { "x": 3, "y": 5 }, { "x": 4, "y": 5 }, { "x": 5, "y": 5 }, { "x": 6, "y": 5 }
      ],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_left", "label": "左转", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] },
      {
        "type": "repeat",
        "label": "重复执行",
        "category": "控制",
        "kind": "control",
        "args": [
          { "name": "times", "label": "次数", "type": "number", "default": 2, "min": 1, "max": 20, "step": 1 }
        ]
      },
      {
        "type": "if_else",
        "label": "如果",
        "category": "控制",
        "kind": "control",
        "branches": "then_else",
        "args": [
          {
            "name": "condition",
            "label": "条件",
            "type": "select",
            "default": "wall_ahead",
            "options": [
              { "value": "wall_ahead", "label": "前面有墙" },
              { "value": "path_ahead", "label": "前面有路" }
            ]
          }
        ]
      }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 14, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 21, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "最后一关：路线是往东走到头、往南走到头、往西走到头，再往南到终点。" },
      { "trigger": "not_completed", "text": "通用条件积木的“条件”可以选“前面有墙”，选对了就能转弯。" }
    ],
    "completion": { "stars": 3, "success_text": "Level 0 全部通关，恭喜！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-015';


-- 验收 SQL（迁移后逐条跑）
--
-- A. Level 0 的 15 关都是 v2 正文、都不再是占位
-- select level_id, body->>'schema_version' as version, is_placeholder, unit_id, level_type, milestone_badge
-- from public.module_level
-- where module_id = 'blockly' and level_id between 'blk-001' and 'blk-015'
-- order by level_id;
--
-- B. 单元归属：u3 = 007-009，u4 = 010-012，u5 = 013-015
-- select unit_id, count(*) as levels, min(level_id) as first_level, max(level_id) as last_level
-- from public.module_level
-- where module_id = 'blockly' and level_id between 'blk-001' and 'blk-015'
-- group by unit_id order by min(sort_order);
--
-- C. 新积木已经登记（分支形状和解析器一致）
-- select level_id, jsonb_array_elements(body->'available_blocks')->>'type' as block
-- from public.module_level
-- where module_id = 'blockly' and level_id between 'blk-007' and 'blk-015'
-- order by level_id, block;
--
-- D. 正文的 scene_type 与列一致
-- select ml.level_id from public.module_level ml
-- where ml.module_id = 'blockly' and ml.scene_type <> ml.body->>'scene_type';
