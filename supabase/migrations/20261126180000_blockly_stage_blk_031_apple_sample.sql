-- Stage 引擎样板：二上第一关「接苹果」。
--
-- 早期 60 关大纲里这一关叫 blk-031；后续第一学期扩容到 80 关时，
-- 二上的舞台占位关改号为 blk-161。这里用 term_id 守卫同时兼容两种库状态：
--   - 旧库：更新 blk-031 的 stage 正文；
--   - 新库：更新 blk-161 的 stage 正文。
-- 第一学期扩容后的 blk-031 属于 blk-g1-fall，不会被这条语句误改成舞台关。
--
-- 固定值写入，重跑即可；本文件只提供迁移，不在本次任务中执行。

update public.module_level
set
  title = '接苹果',
  goal = '用“无限循环”和“如果碰到”让小猫左右移动，接住 3 个下落的苹果，并把 score 增加到 3',
  term_id = 'blk-g2-fall',
  unit_id = 'blk-g2-fall-u1',
  scene_type = 'stage',
  level_type = 'new',
  knowledge_tags = array['stage', 'collision', 'variable', 'score'],
  milestone_badge = null,
  estimated_minutes = 20,
  is_placeholder = false,
  body = $body${
    "schema_version": 2,
    "scene_type": "stage",
    "scene": {
      "backdrop": "sky",
      "stage_size": { "width": 480, "height": 360 },
      "sprites": [
        { "id": "player", "asset": "player", "x": 160, "y": 300, "direction": 90, "size": 100 },
        { "id": "apple", "asset": "apple", "x": 210, "y": 250, "direction": 180, "size": 100, "collectible": true },
        { "id": "apple-2", "asset": "apple", "x": 250, "y": 230, "direction": 180, "size": 100, "collectible": true },
        { "id": "apple-3", "asset": "apple", "x": 290, "y": 210, "direction": 180, "size": 100, "collectible": true }
      ],
      "clones": [],
      "variables": [
        { "id": "score", "name": "score", "initial": 0, "scope": "global" }
      ],
      "broadcasts": [],
      "initial_scripts": [
        {
          "id": "apple-fall",
          "target_sprite_id": "apple",
          "block": {
            "id": "apple-fall-forever",
            "type": "forever",
            "args": {},
            "children": [{ "id": "apple-fall-move", "type": "move_steps", "args": { "steps": 4 } }]
          }
        },
        {
          "id": "apple-2-fall",
          "target_sprite_id": "apple-2",
          "block": {
            "id": "apple-2-fall-forever",
            "type": "forever",
            "args": {},
            "children": [{ "id": "apple-2-fall-move", "type": "move_steps", "args": { "steps": 4 } }]
          }
        },
        {
          "id": "apple-3-fall",
          "target_sprite_id": "apple-3",
          "block": {
            "id": "apple-3-fall-forever",
            "type": "forever",
            "args": {},
            "children": [{ "id": "apple-3-fall-move", "type": "move_steps", "args": { "steps": 4 } }]
          }
        }
      ]
    },
    "available_blocks": [
      {
        "type": "move_steps",
        "label": "移动",
        "category": "动作",
        "kind": "action",
        "args": [
          { "name": "steps", "label": "步数", "type": "number", "default": 10, "min": -100, "max": 100, "step": 1 }
        ]
      },
      {
        "type": "change_variable",
        "label": "变量增加",
        "category": "变量",
        "kind": "action",
        "args": [
          { "name": "variable_id", "label": "变量", "type": "variable", "default": "score" },
          { "name": "value", "label": "增加", "type": "number", "default": 1, "min": -100, "max": 100, "step": 1 }
        ]
      },
      {
        "type": "if_touching",
        "label": "如果碰到",
        "category": "控制",
        "kind": "control",
        "args": [
          {
            "name": "target_sprite_id",
            "label": "精灵",
            "type": "select",
            "default": "apple",
            "options": [
              { "value": "apple", "label": "苹果 1" },
              { "value": "apple-2", "label": "苹果 2" },
              { "value": "apple-3", "label": "苹果 3" }
            ]
          }
        ]
      },
      { "type": "forever", "label": "无限循环", "category": "控制", "kind": "control", "args": [] }
    ],
    "success_check": {
      "type": "all",
      "conditions": [
        { "type": "variable_value", "variable_id": "score", "op": "==", "value": 3 },
        { "type": "sprite_hidden", "sprite_id": "apple" },
        { "type": "sprite_hidden", "sprite_id": "apple-2" },
        { "type": "sprite_hidden", "sprite_id": "apple-3" }
      ]
    },
    "workspace": { "initial_blocks": [], "max_blocks": 8, "require_connected": false },
    "runtime": { "out_of_bounds": "blocked", "max_steps": 120, "stop_on_success": true, "move_duration_ms": 0 },
    "hints": [
      {
        "trigger": "initial",
        "text": "把“无限循环”放到工作区，里面先放“移动”，再分别为 3 个苹果放“如果碰到”和“变量增加”。苹果会自己下落，移动步数改成 -10，小猫就会向左走。",
        "focus": { "target": "block", "blockType": "forever" }
      },
      {
        "trigger": "not_completed",
        "text": "3 个苹果都要碰到，score 才会正好等于 3。检查每个“如果碰到”是否选了不同苹果，并让 score 每次增加 1。苹果落到底部后不会重新出现，可以点“重新开始”再试。",
        "focus": { "target": "block", "blockType": "if_touching" }
      },
      { "trigger": "idle", "text": "变量像一个小盒子，score 会记住接到的苹果数量。", "focus": { "target": "workspace" } }
    ],
    "intro_story": [
      {
        "type": "image_text",
        "image": "apple",
        "speaker": "小精灵",
        "content": "欢迎来到自由舞台！舞台上有 3 个苹果，小猫咪在下面。苹果会自己往下掉，今天我们要左右移动小猫，接住 3 个苹果。"
      },
      {
        "type": "image_text",
        "image": "variable_box",
        "speaker": "小精灵",
        "content": "变量像一个有名字的小盒子。这个盒子叫 score，开始的时候装着 0，专门记住接到了几个苹果。"
      },
      {
        "type": "image_text",
        "image": "block_if",
        "speaker": "小精灵",
        "content": "每次移动后，用“如果碰到”分别检查 3 个苹果。真的碰到时，执行里面的“变量增加”，让 score 加 1，苹果也会消失。移动步数是正数就向右，改成负数就向左。"
      },
      {
        "type": "image_text",
        "image": "score",
        "speaker": "小精灵",
        "content": "把这些积木放进“无限循环”，程序就会反复检查。3 个苹果都接住、score 正好等于 3，这一关就完成啦！"
      }
    ],
    "review": {
      "question": "接到一个苹果时，score 应该怎样变化？",
      "answer": "使用“变量增加”，把 score 增加 1。",
      "hint": "变量增加里面的数字要选 1，可不要选成 0 哦。"
    },
    "completion": { "stars": 3, "success_text": "接到 3 个苹果，score 记对啦！" }
  }$body$::jsonb,
  updated_at = now()
where module_id = 'blockly'
  and level_id in ('blk-031', 'blk-161')
  and term_id = 'blk-g2-fall';


-- 验收 SQL（迁移后逐条跑）
-- select level_id, title, scene_type, body->>'scene_type' as body_scene_type,
--        body->'scene'->'variables'->0->>'name' as variable_name,
--        body->'success_check'->>'value' as target_score
-- from public.module_level
-- where module_id = 'blockly' and level_id in ('blk-031', 'blk-161');
