-- 第一学期前 6 关的 v2 正文：直走 → L 型转弯 → 长直道（循环）→ 画正方形（嵌套循环）→ 遇墙转弯（条件）→ 走迷宫（综合）。
--
-- body 统一用 schema_version 2：scene_type 判别场景形态，scene 放场景数据，
-- available_blocks / success_check / workspace / runtime / hints / completion 是两种形态共用的通用字段。
-- schema_version 1 的旧正文（body.map）解析器仍然认，本文件不改动其它关卡。
--
-- workspace.max_blocks 的语义是「工作区积木总数（含嵌套子块）」，不是展开后的执行步数。
-- 下面的标准解都用上了嵌套循环，所以这个口径必须固定下来。
--
-- 每关的标准解（供教研和测试对照，转弯也算一步）：
--   blk-001  前进 ×5
--   blk-002  前进 ×3 → 右转 → 前进 ×3
--   blk-003  重复 6 次 { 前进 }
--   blk-004  重复 3 次 { 重复 2 次 { 前进 } + 右转 } → 重复 2 次 { 前进 } → 前进
--   blk-005  重复 5 次 { 如果前面有墙 { 右转 } + 前进 }
--   blk-006  重复 5 次 { 前进 } → 右转 → 重复 2 次 { 前进 } → 右转 → 重复 5 次 { 前进 }
--            → 左转 → 重复 2 次 { 前进 } → 左转 → 重复 5 次 { 前进 } → 右转 → 前进
--
-- blk-006 的迷宫是蛇形回廊：第 1、3、5 行是墙，只在第 5 列和第 0 列各留一个口子，
-- 所以只能「向右走到头 → 往下 → 向左走到头 → 往下 → 向右走到头 → 往下」地绕，
-- 中间那两次是左转，最后一次才是右转。
--
-- Neon 跨语句没有事务，每条语句都是幂等的固定值写入，重跑即可。


-- blk-001 直走
update public.module_level
set
  title = '直走',
  goal = '把“前进”积木拖到工作区，让机器人从起点走到终点',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u1',
  scene_type = 'grid',
  level_type = 'new',
  knowledge_tags = array['sequence', 'move'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 6,
      "height": 1,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 5, "y": 0 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 5, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 12, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "把 5 块“前进”连起来，机器人就会一路走到绿色终点。" },
      { "trigger": "not_completed", "text": "机器人还没到终点，数一数“前进”积木够不够 5 块。" }
    ],
    "completion": { "stars": 3, "success_text": "走到终点啦！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-001';


-- blk-002 L 型路线
update public.module_level
set
  title = 'L 型路线',
  goal = '向前走三步，右转，再走三步到达终点',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u1',
  scene_type = 'grid',
  level_type = 'new',
  knowledge_tags = array['sequence', 'turn'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 4,
      "height": 4,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 3, "y": 3 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_left", "label": "左转", "category": "动作", "kind": "action", "args": [] },
      { "type": "turn_right", "label": "右转", "category": "动作", "kind": "action", "args": [] }
    ],
    "success_check": { "type": "actor_at_goal", "actor_id": "player" },
    "workspace": { "initial_blocks": [], "max_blocks": 8, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 16, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "先走三步到拐角，转个弯，再走三步。" },
      { "trigger": "not_completed", "text": "检查一下：转弯积木放在三步“前进”后面了吗？" }
    ],
    "completion": { "stars": 3, "success_text": "拐弯成功！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-002';


-- blk-003 长直道（循环）
update public.module_level
set
  title = '长直道',
  goal = '用“重复执行”积木走完一条长直道',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u2',
  scene_type = 'grid',
  level_type = 'new',
  knowledge_tags = array['loop'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 7,
      "height": 1,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 6, "y": 0 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [],
      "entities": []
    },
    "available_blocks": [
      { "type": "move_forward", "label": "前进", "category": "动作", "kind": "action", "args": [] },
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
    "workspace": { "initial_blocks": [], "max_blocks": 4, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 24, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "这条直道很长，试试把“前进”放进“重复执行”里。" },
      { "trigger": "not_completed", "text": "重复的次数不够，数一数一共要走几格。" }
    ],
    "completion": { "stars": 3, "success_text": "循环真省力！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-003';


-- blk-004 画正方形（嵌套循环）
update public.module_level
set
  title = '画正方形',
  goal = '用内外两层循环绕出一个正方形，再走到终点',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u2',
  scene_type = 'grid',
  level_type = 'new',
  knowledge_tags = array['loop', 'nested_loop'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 4,
      "height": 4,
      "start": { "x": 1, "y": 1, "heading": "E" },
      "goal": { "x": 1, "y": 0 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [],
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
    "workspace": { "initial_blocks": [], "max_blocks": 9, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 30, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "正方形有四条一样长的边，每走一条边就右转一次。" },
      { "trigger": "not_completed", "text": "把“重复”放进另一个“重复”里面，就是嵌套循环了。" }
    ],
    "completion": { "stars": 3, "success_text": "正方形画好啦！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-004';


-- blk-005 遇墙转弯（条件）
update public.module_level
set
  title = '遇墙转弯',
  goal = '前面有墙就右转，一直走到终点',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u3',
  scene_type = 'grid',
  level_type = 'new',
  knowledge_tags = array['condition', 'loop'],
  milestone_badge = null,
  estimated_minutes = 15,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 4,
      "height": 4,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 2, "y": 3 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [{ "x": 3, "y": 0 }, { "x": 1, "y": 3 }],
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
    "runtime": { "out_of_bounds": "blocked", "max_steps": 24, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "把“如果前面有墙”放进“重复执行”里，墙挡路时它就右转。" },
      { "trigger": "not_completed", "text": "重复次数要够多，机器人才能一直走到终点。" }
    ],
    "completion": { "stars": 3, "success_text": "遇到墙也不怕！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-005';


-- blk-006 走迷宫（综合）
update public.module_level
set
  title = '走迷宫',
  goal = '用重复和转弯，走出弯弯绕绕的迷宫',
  term_id = 'blk-g1-fall',
  unit_id = 'blk-g1-fall-u3',
  scene_type = 'grid',
  level_type = 'project',
  knowledge_tags = array['sequence', 'turn', 'loop', 'condition'],
  milestone_badge = 'first_maze',
  estimated_minutes = 20,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "grid",
    "scene": {
      "width": 6,
      "height": 6,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 5, "y": 5 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [
        { "x": 0, "y": 1 }, { "x": 1, "y": 1 }, { "x": 2, "y": 1 }, { "x": 3, "y": 1 }, { "x": 4, "y": 1 },
        { "x": 1, "y": 3 }, { "x": 2, "y": 3 }, { "x": 3, "y": 3 }, { "x": 4, "y": 3 }, { "x": 5, "y": 3 },
        { "x": 0, "y": 5 }, { "x": 1, "y": 5 }, { "x": 2, "y": 5 }, { "x": 3, "y": 5 }, { "x": 4, "y": 5 }
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
    "workspace": { "initial_blocks": [], "max_blocks": 20, "require_connected": true },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 40, "stop_on_success": true, "move_duration_ms": 450 },
    "hints": [
      { "trigger": "initial", "text": "先看清迷宫的路线：一条长直道，接着转弯，再一条长直道。" },
      { "trigger": "not_completed", "text": "每段直道用“重复执行”表示，转弯用“右转”，一段一段拼起来。" }
    ],
    "completion": { "stars": 3, "success_text": "走出迷宫啦！" }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-006';


-- 验收 SQL（迁移后逐条跑）
--
-- A. 六关都是 v2 正文
-- select level_id, body->>'schema_version' as version, body->>'scene_type' as scene_type,
--        is_placeholder, unit_id, level_type
-- from public.module_level
-- where module_id = 'blockly' and level_id between 'blk-001' and 'blk-006'
-- order by level_id;
--
-- B. 正文里的 scene_type 与列一致
-- select ml.level_id from public.module_level ml
-- where ml.module_id = 'blockly' and ml.scene_type <> ml.body->>'scene_type';
--
-- C. 六关的积木清单
-- select level_id, jsonb_array_elements(body->'available_blocks')->>'type' as block
-- from public.module_level
-- where module_id = 'blockly' and level_id between 'blk-001' and 'blk-006'
-- order by level_id, block;
