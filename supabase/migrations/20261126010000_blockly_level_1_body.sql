-- 第 9 步：Blockly 首关使用共享关卡 body；标题和目标只保留在外层列。
-- 仅更新已存在的 blk-001，固定值写入可重复执行；本文件不在本次实施中执行。
update public.module_level
set
  title = '认识积木',
  goal = '把“前进”积木拖到工作区，让角色从起点走到终点',
  body = $body${
    "schema_version": 1,
    "available_blocks": [
      {
        "type": "move_forward",
        "label": "前进",
        "category": "动作",
        "kind": "action",
        "args": []
      }
    ],
    "map": {
      "width": 5,
      "height": 1,
      "start": { "x": 0, "y": 0, "heading": "E" },
      "goal": { "x": 1, "y": 0 },
      "actor": { "id": "player", "asset": "grid_robot" },
      "obstacles": [],
      "entities": []
    },
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
      "max_steps": 8,
      "stop_on_success": true,
      "move_duration_ms": 450
    },
    "hints": [
      { "trigger": "initial", "text": "把“前进”拖到工作区，再点运行。" },
      { "trigger": "not_completed", "text": "角色还没有到终点，再检查一下程序。" }
    ],
    "completion": {
      "stars": 3,
      "success_text": "到达终点，完成！"
    }
  }$body$::jsonb
where module_id = 'blockly'
  and level_id = 'blk-001';
