-- Blockly Level 1 补齐到 80 关（blk-081 … blk-160）。
-- 由 scripts/generate-blockly-level-1-80.mjs 生成；每关都用生产解析器和解释器自校验。
-- 原 blk-081 … blk-095 占位行由 on conflict 原位替换为正式正文，不删除数据，不改学习记录编号。
-- Neon 跨语句没有事务，所有语句均可重复执行。

update public.module_term
set weeks = 16,
    level_cap = 80,
    summary = '逻辑进阶：路线拆解、嵌套循环、条件判断与综合调试。80 课网格闯关。',
    updated_at = now()
where module_id = 'blockly' and term_id = 'blk-g1-spring';

insert into public.module_unit
  (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
values
  ('blockly', 'blk-g1-spring-u1', 'blk-g1-spring', '路线规划师',
   '把长路线拆成小段，数清步数，再用顺序积木稳稳走完。', 'grid', array['sequence', 'path', 'planning'], 16, 1),
  ('blockly', 'blk-g1-spring-u2', 'blk-g1-spring', '转向与对称',
   '从不同方向观察路线，练习左右转、镜像和反向行走。', 'grid', array['turn', 'mirror', 'path'], 16, 2),
  ('blockly', 'blk-g1-spring-u3', 'blk-g1-spring', '嵌套循环进阶',
   '把重复动作装进更大的重复里，用更少积木完成复杂路线。', 'grid', array['loop', 'nested_loop'], 16, 3),
  ('blockly', 'blk-g1-spring-u4', 'blk-g1-spring', '条件判断进阶',
   '根据前方有路还是有墙自动选择动作，比较不同条件写法。', 'grid', array['condition', 'if', 'loop'], 16, 4),
  ('blockly', 'blk-g1-spring-u5', 'blk-g1-spring', '综合调试挑战',
   '组合顺序、循环和条件，检查朝向、次数与分支，完成学期作品。', 'grid', array['project', 'debug', 'sequence', 'loop', 'condition'], 16, 5)
on conflict (module_id, unit_id) do update set
  term_id = excluded.term_id,
  title = excluded.title,
  summary = excluded.summary,
  scene_form = excluded.scene_form,
  knowledge_tags = excluded.knowledge_tags,
  level_cap = excluded.level_cap,
  sort_order = excluded.sort_order,
  updated_at = now();

-- blk-081 拆解路线 · 小小出发
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-081', 81,
   '拆解路线 · 小小出发', '把 1 块「前进」积木连起来，让机器人一条直线走到终点', $body$
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
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：把 1 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 1 格，把 1 块「前进」积木拖到工作区，一块接一块连好。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-082 拆解路线 · 再走一步
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-082', 82,
   '拆解路线 · 再走一步', '把 2 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 5,
    "start": {
      "x": 1,
      "y": 3,
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
        "y": 3
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
        "id": "level1-blk-082-1",
        "type": "coin",
        "x": 1,
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
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：把 2 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 2 格，把 2 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 1 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-083 拆解路线 · 三格直线
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-083', 83,
   '拆解路线 · 三格直线', '把 3 块「前进」积木连起来，让机器人一条直线走到终点', $body$
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
        "id": "level1-blk-083-1",
        "type": "coin",
        "x": 2,
        "y": 1
      },
      {
        "id": "level1-blk-083-2",
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
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：把 3 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 3 格，把 3 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 2 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-084 拆解路线 · 四格不回头
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-084', 84,
   '拆解路线 · 四格不回头', '把 4 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 7,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
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
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：把 4 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 4 格，把 4 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 3 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'practice',
   array['sequence', 'path', 'planning'], null,
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

-- blk-085 拆解路线 · 五格长廊
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-085', 85,
   '拆解路线 · 五格长廊', '把 5 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 8,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 6
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
        "x": 1,
        "y": 7
      },
      {
        "x": 0,
        "y": 6
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
    "success_text": "路线调试成功！"
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
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：把 5 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 5 格，把 5 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 4 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'typing',
   array['sequence', 'path', 'planning'], null,
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

-- blk-086 拆解路线 · 六格前进
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-086', 86,
   '拆解路线 · 六格前进', '把 6 块「前进」积木连起来，让机器人一条直线走到终点', $body$
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
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：把 6 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 6 格，把 6 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 5 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-087 拆解路线 · 七格通道
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-087', 87,
   '拆解路线 · 七格通道', '把 7 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 10,
    "start": {
      "x": 1,
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
        "id": "level1-blk-087-1",
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
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：把 7 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 7 格，把 7 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 6 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-088 拆解路线 · 八格长道
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-088', 88,
   '拆解路线 · 八格长道', '把 8 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 3,
    "start": {
      "x": 9,
      "y": 1,
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
        "id": "level1-blk-088-1",
        "type": "coin",
        "x": 7,
        "y": 1
      },
      {
        "id": "level1-blk-088-2",
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
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：把 8 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 8 格，把 8 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 7 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-089 拆解路线 · 九格冲刺
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-089', 89,
   '拆解路线 · 九格冲刺', '把 9 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 12,
    "height": 3,
    "start": {
      "x": 10,
      "y": 1,
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
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：把 9 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 9 格，把 9 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 8 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'practice',
   array['sequence', 'path', 'planning'], null,
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

-- blk-090 拆解路线 · 十格挑战
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-090', 90,
   '拆解路线 · 十格挑战', '把 10 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 13,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
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
        "x": 1,
        "y": 12
      },
      {
        "x": 0,
        "y": 11
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
    "success_text": "路线调试成功！"
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
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：把 10 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 10 格，把 10 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 9 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'typing',
   array['sequence', 'path', 'planning'], null,
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

-- blk-091 拆解路线 · 十一格直行
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-091', 91,
   '拆解路线 · 十一格直行', '把 11 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 14,
    "height": 3,
    "start": {
      "x": 12,
      "y": 1,
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
        "x": 10,
        "y": 0
      },
      {
        "x": 10,
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
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：把 11 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 11 格，把 11 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 10 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-092 拆解路线 · 十二格大道
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-092', 92,
   '拆解路线 · 十二格大道', '把 12 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 15,
    "start": {
      "x": 1,
      "y": 13,
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
        "id": "level1-blk-092-1",
        "type": "coin",
        "x": 1,
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
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：把 12 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 12 格，把 12 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 11 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-093 拆解路线 · 十三格远征
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-093', 93,
   '拆解路线 · 十三格远征', '把 13 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 16,
    "start": {
      "x": 1,
      "y": 14,
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
        "y": 14
      },
      {
        "x": 1,
        "y": 15
      },
      {
        "x": 0,
        "y": 14
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
        "id": "level1-blk-093-1",
        "type": "coin",
        "x": 1,
        "y": 10
      },
      {
        "id": "level1-blk-093-2",
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
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：把 13 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 13 格，把 13 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 12 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-094 拆解路线 · 十四格长跑
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-094', 94,
   '拆解路线 · 十四格长跑', '把 14 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 17,
    "height": 3,
    "start": {
      "x": 15,
      "y": 1,
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
        "x": 13,
        "y": 0
      },
      {
        "x": 13,
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
        "x": 11,
        "y": 0
      },
      {
        "x": 11,
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
        "x": 9,
        "y": 0
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
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：把 14 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 14 格，把 14 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 13 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'practice',
   array['sequence', 'path', 'planning'], null,
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

-- blk-095 拆解路线 · 十五格耐力赛
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-095', 95,
   '拆解路线 · 十五格耐力赛', '把 15 块「前进」积木连起来，让机器人一条直线走到终点', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 3,
    "height": 18,
    "start": {
      "x": 1,
      "y": 16,
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
        "y": 16
      },
      {
        "x": 1,
        "y": 17
      },
      {
        "x": 0,
        "y": 16
      },
      {
        "x": 2,
        "y": 15
      },
      {
        "x": 0,
        "y": 15
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
        "y": 13
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
    "success_text": "路线调试成功！"
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
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：把 15 块「前进」积木连起来，让机器人一条直线走到终点。"
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
      "content": "这一关真正要用的就是「前进」。这条路一共 15 格，把 15 块「前进」积木拖到工作区，一块接一块连好。"
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
    "hint": "上一关是一条直路，走 14 格就到终点。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'typing',
   array['sequence', 'path', 'planning'], null,
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

-- blk-096 拆解路线 · 十六格终点线
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-096', 96,
   '拆解路线 · 十六格终点线', '把 16 块「前进」积木连起来，让机器人一条直线走到终点', $body$
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
    "success_text": "路线调试成功！"
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
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u1', 'grid', 'new',
   array['sequence', 'path', 'planning'], null,
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

-- blk-097 换方向走 · 第一个拐角
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-097', 97,
   '换方向走 · 第一个拐角', '走一条 L形路线：2 步 + 2 步', $body$
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 2 块「前进」，再放 1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 2,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 2 块「前进」和1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 2 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 4
        }
      },
      "fail_text": "前进积木应该是 4 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-098 换方向走 · 直角路口
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-098', 98,
   '换方向走 · 直角路口', '走一条 L形路线：3 步 + 2 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 5,
    "start": {
      "x": 1,
      "y": 3,
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
        "y": 2
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
        "x": 2,
        "y": 2
      },
      {
        "x": 2,
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
        "x": 5,
        "y": 3
      },
      {
        "x": 4,
        "y": 4
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
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "level1-blk-098-1",
        "type": "coin",
        "x": 4,
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
      "text": "先走 3 格，放一块「左转」，最后走 2 格。",
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
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：走一条 L形路线：3 步 + 2 步。"
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
      "content": "这一关真正要用的就是「左转」。先走 3 格，放一块「左转」，最后走 2 格。"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 3 块「前进」，再放 1 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 3,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 3 块「前进」和1 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 2 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 5
        }
      },
      "fail_text": "前进积木应该是 5 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-099 换方向走 · 长一点的 L
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-099', 99,
   '换方向走 · 长一点的 L', '走一条 L形路线：3 步 + 3 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 6,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
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
        "x": 5,
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
        "x": 4,
        "y": 5
      },
      {
        "x": 3,
        "y": 4
      }
    ],
    "entities": [
      {
        "id": "level1-blk-099-1",
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
      "text": "先走 3 格，放一块「右转」，最后走 3 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「右转」。先走 3 格，放一块「右转」，最后走 3 格。"
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
    "hint": "上一关的路要拐 1 个弯，每段分别走 3、2 格。"
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 3 块「前进」，再放 1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 3,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 3 块「前进」和1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 3 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 6
        }
      },
      "fail_text": "前进积木应该是 6 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-100 换方向走 · 大 L 弯
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-100', 100,
   '换方向走 · 大 L 弯', '走一条 L形路线：4 步 + 3 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 6,
    "start": {
      "x": 5,
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
        "x": 0,
        "y": 3
      },
      {
        "x": 2,
        "y": 4
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
      "text": "先走 4 格，放一块「左转」，最后走 3 格。",
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
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：走一条 L形路线：4 步 + 3 步。"
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
      "content": "这一关真正要用的就是「左转」。先走 4 格，放一块「左转」，最后走 3 格。"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 4 块「前进」，再放 1 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 4,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 4 块「前进」和1 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 3 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 7
        }
      },
      "fail_text": "前进积木应该是 7 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'practice',
   array['turn', 'mirror', 'path'], null,
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

-- blk-101 换方向走 · 之字形起步
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-101', 101,
   '换方向走 · 之字形起步', '走一条 Z形路线：3 步 + 2 步 + 3 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 5,
    "height": 9,
    "start": {
      "x": 3,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 7
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
        "y": 1
      },
      {
        "x": 2,
        "y": 1
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
        "x": 2,
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
        "x": 1,
        "y": 8
      },
      {
        "x": 0,
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
    "success_text": "路线调试成功！"
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
    "hint": "上一关的路要拐 1 个弯，每段分别走 4、3 格。"
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 3 块「前进」，再放 1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 3,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 3 块「前进」和1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 5 块「前进」，再放 1 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 5,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 5 块「前进」和1 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 3 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 8
        }
      },
      "fail_text": "前进积木应该是 8 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'typing',
   array['turn', 'mirror', 'path'], null,
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

-- blk-102 换方向走 · 小 Z 字
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-102', 102,
   '换方向走 · 小 Z 字', '走一条 Z形路线：4 步 + 2 步 + 4 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 5,
    "start": {
      "x": 1,
      "y": 3,
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
        "y": 2
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
        "x": 2,
        "y": 2
      },
      {
        "x": 2,
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
        "x": 4,
        "y": 2
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
        "x": 5,
        "y": 4
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 4 块「前进」，再放 1 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 4,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 4 块「前进」和1 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 6 块「前进」，再放 1 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 6,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 6 块「前进」和1 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 4 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 10
        }
      },
      "fail_text": "前进积木应该是 10 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-103 换方向走 · 标准之字
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-103', 103,
   '换方向走 · 标准之字', '走一条 Z形路线：4 步 + 3 步 + 4 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 11,
    "start": {
      "x": 4,
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
        "x": 4,
        "y": 6
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
        "y": 4
      },
      {
        "x": 0,
        "y": 5
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
        "x": 1,
        "y": 10
      },
      {
        "x": 0,
        "y": 9
      }
    ],
    "entities": [
      {
        "id": "level1-blk-103-1",
        "type": "coin",
        "x": 2,
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
      "text": "先走 4 格，放一块「右转」，再走 3 格，放一块「左转」，最后走 4 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「右转」。先走 4 格，放一块「右转」，再走 3 格，放一块「左转」，最后走 4 格。"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 4 块「前进」，再放 1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 4,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 4 块「前进」和1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 7 块「前进」，再放 1 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 7,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 7 块「前进」和1 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 4 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 11
        }
      },
      "fail_text": "前进积木应该是 11 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-104 换方向走 · 长之字
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-104', 104,
   '换方向走 · 长之字', '走一条 Z形路线：5 步 + 3 步 + 5 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 13,
    "height": 6,
    "start": {
      "x": 11,
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
        "x": 9,
        "y": 0
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
        "x": 5,
        "y": 1
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
        "x": 6,
        "y": 5
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
        "id": "level1-blk-104-1",
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
      "text": "先走 5 格，放一块「左转」，再走 3 格，放一块「右转」，最后走 5 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「左转」。先走 5 格，放一块「左转」，再走 3 格，放一块「右转」，最后走 5 格。"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 5 块「前进」，再放 1 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 5,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 5 块「前进」和1 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 8 块「前进」，再放 1 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 8,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 8 块「前进」和1 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 5 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 13
        }
      },
      "fail_text": "前进积木应该是 13 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-105 换方向走 · U 型大道
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-105', 105,
   '换方向走 · U 型大道', '走一条 U形路线：3 步 + 3 步 + 3 步', $body$
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 3 块「前进」，再放 1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 3,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 3 块「前进」和1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 6 块「前进」，再放 2 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 6,
              "atLeast": true
            }
          },
          {
            "count": {
              "type": "turn_right",
              "value": 2,
              "atLeast": true
            }
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 6 块「前进」和2 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 3 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 9
        }
      },
      "fail_text": "前进积木应该是 9 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'practice',
   array['turn', 'mirror', 'path'], null,
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

-- blk-106 换方向走 · U 型转弯
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-106', 106,
   '换方向走 · U 型转弯', '走一条 U形路线：4 步 + 3 步 + 4 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 7,
    "start": {
      "x": 4,
      "y": 5,
      "heading": "N"
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
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
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
      "text": "先走 4 格，放一块「左转」，再走 3 格，放一块「左转」，最后走 4 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「左转」。先走 4 格，放一块「左转」，再走 3 格，放一块「左转」，最后走 4 格。"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 4 块「前进」，再放 1 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 4,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 4 块「前进」和1 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 7 块「前进」，再放 2 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 7,
              "atLeast": true
            }
          },
          {
            "count": {
              "type": "turn_left",
              "value": 2,
              "atLeast": true
            }
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 7 块「前进」和2 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 4 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 11
        }
      },
      "fail_text": "前进积木应该是 11 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'typing',
   array['turn', 'mirror', 'path'], null,
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

-- blk-107 换方向走 · 宽 U 型
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-107', 107,
   '换方向走 · 宽 U 型', '走一条 U形路线：4 步 + 4 步 + 4 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 7,
    "start": {
      "x": 5,
      "y": 5,
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
      "text": "先走 4 格，放一块「右转」，再走 4 格，放一块「右转」，最后走 4 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「右转」。先走 4 格，放一块「右转」，再走 4 格，放一块「右转」，最后走 4 格。"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 4 块「前进」，再放 1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 4,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 4 块「前进」和1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 8 块「前进」，再放 2 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 8,
              "atLeast": true
            }
          },
          {
            "count": {
              "type": "turn_right",
              "value": 2,
              "atLeast": true
            }
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 8 块「前进」和2 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 4 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 12
        }
      },
      "fail_text": "前进积木应该是 12 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-108 换方向走 · 大 U 型
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-108', 108,
   '换方向走 · 大 U 型', '走一条 U形路线：5 步 + 4 步 + 5 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 8,
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
        "x": 6,
        "y": 1
      },
      {
        "x": 4,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "level1-blk-108-1",
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 5 块「前进」，再放 1 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 5,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 5 块「前进」和1 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 9 块「前进」，再放 2 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 9,
              "atLeast": true
            }
          },
          {
            "count": {
              "type": "turn_left",
              "value": 2,
              "atLeast": true
            }
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 9 块「前进」和2 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 5 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 14
        }
      },
      "fail_text": "前进积木应该是 14 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-109 换方向走 · 四段小路
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-109', 109,
   '换方向走 · 四段小路', '走一条 S形路线：4 步 + 2 步 + 3 步 + 2 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 10,
    "start": {
      "x": 1,
      "y": 8,
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
        "x": 2,
        "y": 1
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
        "x": 5,
        "y": 2
      }
    ],
    "entities": [
      {
        "id": "level1-blk-109-1",
        "type": "coin",
        "x": 3,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 4 块「前进」，再放 1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 4,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 4 块「前进」和1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 6 块「前进」，再放 1 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 6,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 6 块「前进」和1 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 3 段：放 9 块「前进」，再放 1 块「左转」、2 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 9,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "count": {
              "type": "turn_right",
              "value": 2,
              "atLeast": true
            }
          }
        ]
      },
      "fail_text": "第 3 段还不对：工作区要有 9 块「前进」和1 块「左转」、2 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 2 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 11
        }
      },
      "fail_text": "前进积木应该是 11 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-110 换方向走 · 四段长路
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-110', 110,
   '换方向走 · 四段长路', '走一条 S形路线：5 步 + 3 步 + 4 步 + 3 步', $body$
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
        "x": 8,
        "y": 10
      },
      {
        "x": 7,
        "y": 11
      },
      {
        "x": 6,
        "y": 10
      },
      {
        "x": 8,
        "y": 9
      },
      {
        "x": 6,
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
        "x": 8,
        "y": 5
      },
      {
        "x": 6,
        "y": 4
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
        "y": 6
      },
      {
        "x": 3,
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
      "text": "先走 5 格，放一块「左转」，再走 3 格，放一块「右转」，再走 4 格，放一块「左转」，最后走 3 格。",
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
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：走一条 S形路线：5 步 + 3 步 + 4 步 + 3 步。"
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
      "content": "这一关真正要用的就是「左转」。先走 5 格，放一块「左转」，再走 3 格，放一块「右转」，再走 4 格，放一块「左转」，最后走 3 格。"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 5 块「前进」，再放 1 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 5,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 5 块「前进」和1 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 8 块「前进」，再放 1 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 8,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 8 块「前进」和1 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 3 段：放 12 块「前进」，再放 2 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 12,
              "atLeast": true
            }
          },
          {
            "count": {
              "type": "turn_left",
              "value": 2,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 3 段还不对：工作区要有 12 块「前进」和2 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 3 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 15
        }
      },
      "fail_text": "前进积木应该是 15 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'practice',
   array['turn', 'mirror', 'path'], null,
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

-- blk-111 换方向走 · 复杂折线
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-111', 111,
   '换方向走 · 复杂折线', '走一条 S形路线：5 步 + 3 步 + 5 步 + 3 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 13,
    "start": {
      "x": 1,
      "y": 11,
      "heading": "N"
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
        "x": 3,
        "y": 1
      },
      {
        "x": 5,
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
      "text": "先走 5 格，放一块「右转」，再走 3 格，放一块「左转」，再走 5 格，放一块「右转」，最后走 3 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「右转」。先走 5 格，放一块「右转」，再走 3 格，放一块「左转」，再走 5 格，放一块「右转」，最后走 3 格。"
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
    "hint": "上一关的路要拐 3 个弯，每段分别走 5、3、4、3 格。"
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 5 块「前进」，再放 1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 5,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 5 块「前进」和1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 8 块「前进」，再放 1 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 8,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 8 块「前进」和1 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 3 段：放 13 块「前进」，再放 1 块「左转」、2 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 13,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "count": {
              "type": "turn_right",
              "value": 2,
              "atLeast": true
            }
          }
        ]
      },
      "fail_text": "第 3 段还不对：工作区要有 13 块「前进」和1 块「左转」、2 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 3 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 16
        }
      },
      "fail_text": "前进积木应该是 16 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'typing',
   array['turn', 'mirror', 'path'], null,
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

-- blk-112 换方向走 · 终极折线
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-112', 112,
   '换方向走 · 终极折线', '走一条 S形路线：6 步 + 4 步 + 5 步 + 4 步', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 14,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 9,
      "y": 12
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
        "x": 1,
        "y": 8
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
        "x": 6,
        "y": 7
      },
      {
        "x": 6,
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
        "x": 4,
        "y": 11
      },
      {
        "x": 5,
        "y": 13
      },
      {
        "x": 4,
        "y": 12
      },
      {
        "x": 6,
        "y": 13
      },
      {
        "x": 7,
        "y": 11
      },
      {
        "x": 7,
        "y": 13
      },
      {
        "x": 8,
        "y": 11
      },
      {
        "x": 8,
        "y": 13
      },
      {
        "x": 9,
        "y": 11
      },
      {
        "x": 10,
        "y": 12
      },
      {
        "x": 9,
        "y": 13
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
      "text": "先走 6 格，放一块「左转」，再走 4 格，放一块「右转」，再走 5 格，放一块「左转」，最后走 4 格。",
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
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：走一条 S形路线：6 步 + 4 步 + 5 步 + 4 步。"
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
      "content": "这一关真正要用的就是「左转」。先走 6 格，放一块「左转」，再走 4 格，放一块「右转」，再走 5 格，放一块「左转」，最后走 4 格。"
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
  },
  "teaching_steps": [
    {
      "text": "第 1 段：放 6 块「前进」，再放 1 块「左转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 6,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          }
        ]
      },
      "fail_text": "第 1 段还不对：工作区要有 6 块「前进」和1 块「左转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 2 段：放 10 块「前进」，再放 1 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 10,
              "atLeast": true
            }
          },
          {
            "type": "turn_left"
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 2 段还不对：工作区要有 10 块「前进」和1 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "第 3 段：放 15 块「前进」，再放 2 块「左转」、1 块「右转」。",
      "check": {
        "all": [
          {
            "count": {
              "type": "move_forward",
              "value": 15,
              "atLeast": true
            }
          },
          {
            "count": {
              "type": "turn_left",
              "value": 2,
              "atLeast": true
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 3 段还不对：工作区要有 15 块「前进」和2 块「左转」、1 块「右转」。",
      "done_text": "转弯接上了！"
    },
    {
      "text": "最后再放 4 块「前进」，一直走到终点。",
      "check": {
        "count": {
          "type": "move_forward",
          "value": 19
        }
      },
      "fail_text": "前进积木应该是 19 块，再数一遍。",
      "done_text": "路线排好啦！"
    }
  ]
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u2', 'grid', 'new',
   array['turn', 'mirror', 'path'], null,
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

-- blk-113 循环再挑战 · 长直道
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-113', 113,
   '循环再挑战 · 长直道', '用「重复执行」一次走完 8 格', $body$
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
    "hint": "上一关的路要拐 3 个弯，每段分别走 6、4、5、4 格。"
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 8，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 8
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 8，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 8 改成 7，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 8,
      "suggested": 7,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 8 改成 7，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 8 改成 7，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-114 循环再挑战 · 更长直道
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-114', 114,
   '循环再挑战 · 更长直道', '用「重复执行」一次走完 10 格', $body$
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
        "id": "level1-blk-114-1",
        "type": "coin",
        "x": 1,
        "y": 8
      },
      {
        "id": "level1-blk-114-2",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 10，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 10
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 10，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 10 改成 9，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 10,
      "suggested": 9,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 10 改成 9，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 10 改成 9，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-115 循环再挑战 · 超长直道
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-115', 115,
   '循环再挑战 · 超长直道', '用「重复执行」一次走完 12 格', $body$
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
        "id": "level1-blk-115-1",
        "type": "coin",
        "x": 4,
        "y": 1
      },
      {
        "id": "level1-blk-115-2",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 12，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 12
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 12，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 12 改成 11，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 12,
      "suggested": 11,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 12 改成 11，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 12 改成 11，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-116 循环再挑战 · 极限直道
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-116', 116,
   '循环再挑战 · 极限直道', '用「重复执行」一次走完 14 格', $body$
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 14，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 14
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 14，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 14 改成 13，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 14,
      "suggested": 13,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 14 改成 13，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 14 改成 13，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'practice',
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

-- blk-117 循环再挑战 · 画正方形
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-117', 117,
   '循环再挑战 · 画正方形', '用两层循环绕出边长 2 的正方形', $body$
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 3，里面放：重复执行、右转。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "repeat",
            "args": {
              "times": 2
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 3，里面要有重复执行、右转。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 2，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 2
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 2，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 3 改成 2，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 3,
      "suggested": 2,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 3 改成 2，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 3 改成 2，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'typing',
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

-- blk-118 循环再挑战 · 大一点的正方形
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-118', 118,
   '循环再挑战 · 大一点的正方形', '用两层循环绕出边长 3 的正方形', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 7,
    "start": {
      "x": 1,
      "y": 2,
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
        "x": 0,
        "y": 2
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
        "x": 3,
        "y": 1
      },
      {
        "x": 3,
        "y": 3
      },
      {
        "x": 4,
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
        "x": 4,
        "y": 6
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
        "x": 0,
        "y": 3
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
          "max": 30,
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
      "text": "外层「重复执行」做 3 次，每次先走 3 格再放一块「右转」；最后一条边用「重复执行」走 3 格，再走 1 步到终点。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「重复执行」。外层「重复执行」做 3 次，每次先走 3 格再放一块「右转」；最后一条边用「重复执行」走 3 格，再走 1 步到终点。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 3，里面放：重复执行、右转。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "repeat",
            "args": {
              "times": 3
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 3，里面要有重复执行、右转。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 3 改成 2，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 3,
      "suggested": 2,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 3 改成 2，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 3 改成 2，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-119 循环再挑战 · 正方形花园
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-119', 119,
   '循环再挑战 · 正方形花园', '用两层循环绕出边长 4 的正方形', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 7,
    "start": {
      "x": 5,
      "y": 1,
      "heading": "S"
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
        "x": 5,
        "y": 0
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
        "x": 6,
        "y": 0
      },
      {
        "x": 7,
        "y": 1
      }
    ],
    "entities": [
      {
        "id": "level1-blk-119-1",
        "type": "coin",
        "x": 4,
        "y": 5
      },
      {
        "id": "level1-blk-119-2",
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
          "max": 30,
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
      "text": "外层「重复执行」做 3 次，每次先走 4 格再放一块「右转」；最后一条边用「重复执行」走 4 格，再走 1 步到终点。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「重复执行」。外层「重复执行」做 3 次，每次先走 4 格再放一块「右转」；最后一条边用「重复执行」走 4 格，再走 1 步到终点。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 3，里面放：重复执行、右转。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "repeat",
            "args": {
              "times": 4
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 3，里面要有重复执行、右转。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 3 改成 2，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 3,
      "suggested": 2,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 3 改成 2，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 3 改成 2，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-120 循环再挑战 · 巨型正方形
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-120', 120,
   '循环再挑战 · 巨型正方形', '用两层循环绕出边长 5 的正方形', $body$
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
        "id": "level1-blk-120-1",
        "type": "coin",
        "x": 5,
        "y": 6
      },
      {
        "id": "level1-blk-120-2",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 3，里面放：重复执行、右转。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "repeat",
            "args": {
              "times": 5
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 3，里面要有重复执行、右转。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 3 改成 2，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 3,
      "suggested": 2,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 3 改成 2，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 3 改成 2，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-121 循环再挑战 · 长方形
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-121', 121,
   '循环再挑战 · 长方形', '用循环绕出 4×2 的长方形', $body$
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 1，里面放：重复执行、右转。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 1
        },
        "contains": [
          {
            "type": "repeat",
            "args": {
              "times": 4
            }
          },
          {
            "type": "turn_right"
          },
          {
            "type": "repeat",
            "args": {
              "times": 2
            }
          },
          {
            "type": "turn_right"
          },
          {
            "type": "repeat",
            "args": {
              "times": 4
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 1，里面要有重复执行、右转。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 2，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 2
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 2，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 2 块「重复执行」的次数从 4 改成 3，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 4,
      "suggested": 3,
      "nth": 2
    },
    "try_text": "找到第 2 块「重复执行」，把次数 4 改成 3，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 2 块「重复执行」的 4 改成 3，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'practice',
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

-- blk-122 循环再挑战 · 瘦长方形
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-122', 122,
   '循环再挑战 · 瘦长方形', '用循环绕出 5×2 的长方形', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 8,
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
        "x": 2,
        "y": 3
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
        "y": 5
      },
      {
        "x": 2,
        "y": 5
      },
      {
        "x": 4,
        "y": 6
      },
      {
        "x": 3,
        "y": 7
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
        "x": 0,
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
          "max": 30,
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
      "text": "宽边走 5 格、窄边走 2 格：「重复执行」里依次放「走 5 格 → 「右转」 → 走 2 格 → 「右转」 → 走 5 格 → 「右转」」，最后一条窄边用「重复执行」走 2 格，再走 1 步到终点。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「重复执行」。宽边走 5 格、窄边走 2 格：「重复执行」里依次放「走 5 格 → 「右转」 → 走 2 格 → 「右转」 → 走 5 格 → 「右转」」，最后一条窄边用「重复执行」走 2 格，再走 1 步到终点。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 1，里面放：重复执行、右转。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 1
        },
        "contains": [
          {
            "type": "repeat",
            "args": {
              "times": 5
            }
          },
          {
            "type": "turn_right"
          },
          {
            "type": "repeat",
            "args": {
              "times": 2
            }
          },
          {
            "type": "turn_right"
          },
          {
            "type": "repeat",
            "args": {
              "times": 5
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 1，里面要有重复执行、右转。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 2，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 2
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 2，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 2 块「重复执行」的次数从 5 改成 4，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 5,
      "suggested": 4,
      "nth": 2
    },
    "try_text": "找到第 2 块「重复执行」，把次数 5 改成 4，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 2 块「重复执行」的 5 改成 4，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'typing',
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

-- blk-123 循环再挑战 · 宽长方形
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-123', 123,
   '循环再挑战 · 宽长方形', '用循环绕出 4×3 的长方形', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 7,
    "start": {
      "x": 5,
      "y": 4,
      "heading": "W"
    },
    "goal": {
      "x": 5,
      "y": 5
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
        "x": 6,
        "y": 2
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
        "y": 6
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
          "max": 30,
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
      "text": "宽边走 4 格、窄边走 3 格：「重复执行」里依次放「走 4 格 → 「右转」 → 走 3 格 → 「右转」 → 走 4 格 → 「右转」」，最后一条窄边用「重复执行」走 3 格，再走 1 步到终点。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「重复执行」。宽边走 4 格、窄边走 3 格：「重复执行」里依次放「走 4 格 → 「右转」 → 走 3 格 → 「右转」 → 走 4 格 → 「右转」」，最后一条窄边用「重复执行」走 3 格，再走 1 步到终点。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 1，里面放：重复执行、右转。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 1
        },
        "contains": [
          {
            "type": "repeat",
            "args": {
              "times": 4
            }
          },
          {
            "type": "turn_right"
          },
          {
            "type": "repeat",
            "args": {
              "times": 3
            }
          },
          {
            "type": "turn_right"
          },
          {
            "type": "repeat",
            "args": {
              "times": 4
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 1，里面要有重复执行、右转。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 2 块「重复执行」的次数从 4 改成 3，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 4,
      "suggested": 3,
      "nth": 2
    },
    "try_text": "找到第 2 块「重复执行」，把次数 4 改成 3，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 2 块「重复执行」的 4 改成 3，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-124 循环再挑战 · 大长方形
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-124', 124,
   '循环再挑战 · 大长方形', '用循环绕出 6×3 的长方形', $body$
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
        "id": "level1-blk-124-1",
        "type": "coin",
        "x": 2,
        "y": 4
      },
      {
        "id": "level1-blk-124-2",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 1，里面放：重复执行、右转。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 1
        },
        "contains": [
          {
            "type": "repeat",
            "args": {
              "times": 6
            }
          },
          {
            "type": "turn_right"
          },
          {
            "type": "repeat",
            "args": {
              "times": 3
            }
          },
          {
            "type": "turn_right"
          },
          {
            "type": "repeat",
            "args": {
              "times": 6
            }
          },
          {
            "type": "turn_right"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 1，里面要有重复执行、右转。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 2 块「重复执行」的次数从 6 改成 5，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 6,
      "suggested": 5,
      "nth": 2
    },
    "try_text": "找到第 2 块「重复执行」，把次数 6 改成 5，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 2 块「重复执行」的 6 改成 5，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-125 循环再挑战 · 循环 U 型
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-125', 125,
   '循环再挑战 · 循环 U 型', '用 3 段「重复执行」走出U形大路：分别走 4、3、2 格', $body$
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
        "id": "level1-blk-125-1",
        "type": "coin",
        "x": 1,
        "y": 2
      },
      {
        "id": "level1-blk-125-2",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 2，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 2
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 2，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 4 改成 3，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 4,
      "suggested": 3,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 4 改成 3，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 4 改成 3，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-126 循环再挑战 · 循环大 U 型
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-126', 126,
   '循环再挑战 · 循环大 U 型', '用 3 段「重复执行」走出U形大路：分别走 5、3、2 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 6,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
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
        "x": 6,
        "y": 5
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
          "max": 30,
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
      "text": "这条路分成 3 段：「重复执行」走 5 格，放一块「右转」，「重复执行」走 3 格，放一块「右转」，「重复执行」走 2 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 5、3、2 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用 3 段「重复执行」走出U形大路：分别走 5、3、2 格。"
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
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 5 格，放一块「右转」，「重复执行」走 3 格，放一块「右转」，「重复执行」走 2 格。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 2，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 2
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 2，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 5 改成 4，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 5,
      "suggested": 4,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 5 改成 4，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 5 改成 4，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'practice',
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

-- blk-127 循环再挑战 · 三段循环
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-127', 127,
   '循环再挑战 · 三段循环', '用 3 段「重复执行」走出U形大路：分别走 5、4、2 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 8,
    "start": {
      "x": 1,
      "y": 6,
      "heading": "N"
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
        "x": 2,
        "y": 6
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
          "max": 30,
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
      "text": "这条路分成 3 段：「重复执行」走 5 格，放一块「右转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 2 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 5 格，放一块「右转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 2 格。"
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
    "hint": "上一关把路分成 3 段，分别走 5、3、2 格。"
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 2，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 2
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 2，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 5 改成 4，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 5,
      "suggested": 4,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 5 改成 4，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 5 改成 4，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'typing',
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

-- blk-128 循环再挑战 · 循环组合技
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-128', 128,
   '循环再挑战 · 循环组合技', '用 3 段「重复执行」走出U形大路：分别走 6、4、3 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 7,
    "start": {
      "x": 7,
      "y": 5,
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
        "x": 7,
        "y": 4
      },
      {
        "x": 8,
        "y": 5
      },
      {
        "x": 7,
        "y": 6
      },
      {
        "x": 6,
        "y": 4
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
          "max": 30,
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
      "text": "这条路分成 3 段：「重复执行」走 6 格，放一块「右转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 3 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 6、4、3 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "路线调试成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用 3 段「重复执行」走出U形大路：分别走 6、4、3 格。"
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
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 6 格，放一块「右转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 3 格。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 6，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 6
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 6，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 6 改成 5，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 6,
      "suggested": 5,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 6 改成 5，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 6 改成 5，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u3', 'grid', 'new',
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

-- blk-129 条件再判断 · 第一个拐角
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-129', 129,
   '条件再判断 · 第一个拐角', '沿着走廊走 11 格，拐 2 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 7,
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
        "x": 4,
        "y": 6
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
    "hint": "上一关把路分成 3 段，分别走 6、4、3 格。"
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 11，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 11
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 11，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 11 改成 10，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 11,
      "suggested": 10,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 11 改成 10，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 11 改成 10，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-130 条件再判断 · 第二个拐角
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-130', 130,
   '条件再判断 · 第二个拐角', '沿着走廊走 13 格，拐 2 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 8,
    "start": {
      "x": 1,
      "y": 6,
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
        "y": 6
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
        "y": 6
      }
    ],
    "entities": [
      {
        "id": "level1-blk-130-1",
        "type": "coin",
        "x": 1,
        "y": 2
      },
      {
        "id": "level1-blk-130-2",
        "type": "star",
        "x": 4,
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 13，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 13
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 13，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 13 改成 12，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 13,
      "suggested": 12,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 13 改成 12，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 13 改成 12，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-131 条件再判断 · 长一点的走廊
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-131', 131,
   '条件再判断 · 长一点的走廊', '沿着走廊走 14 格，拐 2 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 8,
    "start": {
      "x": 5,
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
        "id": "level1-blk-131-1",
        "type": "coin",
        "x": 5,
        "y": 5
      },
      {
        "id": "level1-blk-131-2",
        "type": "star",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 14，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 14
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 14，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 14 改成 13，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 14,
      "suggested": 13,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 14 改成 13，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 14 改成 13，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-132 条件再判断 · 大 L 走廊
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-132', 132,
   '条件再判断 · 大 L 走廊', '沿着走廊走 16 格，拐 2 个弯', $body$
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 16，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 16
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 16，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 16 改成 15，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 16,
      "suggested": 15,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 16 改成 15，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 16 改成 15，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'practice',
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

-- blk-133 条件再判断 · 三弯走廊
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-133', 133,
   '条件再判断 · 三弯走廊', '沿着走廊走 18 格，拐 3 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 9,
    "start": {
      "x": 6,
      "y": 1,
      "heading": "S"
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
        "x": 6,
        "y": 8
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
        "x": 1,
        "y": 2
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
        "x": 3,
        "y": 2
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 4,
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 18，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 18
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 18，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 18 改成 17，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 18,
      "suggested": 17,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 18 改成 17，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 18 改成 17，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'typing',
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

-- blk-134 条件再判断 · 回形长廊
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-134', 134,
   '条件再判断 · 回形长廊', '沿着走廊走 19 格，拐 3 个弯', $body$
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
      "x": 3,
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
        "y": 4
      },
      {
        "x": 3,
        "y": 6
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 19，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 19
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 19，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 19 改成 18，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 19,
      "suggested": 18,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 19 改成 18，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 19 改成 18，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-135 条件再判断 · 越绕越深
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-135', 135,
   '条件再判断 · 越绕越深', '沿着走廊走 18 格，拐 3 个弯', $body$
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
      "x": 3,
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
        "x": 4,
        "y": 4
      },
      {
        "x": 3,
        "y": 5
      }
    ],
    "entities": [
      {
        "id": "level1-blk-135-1",
        "type": "coin",
        "x": 6,
        "y": 6
      },
      {
        "id": "level1-blk-135-2",
        "type": "star",
        "x": 1,
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 18，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 18
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 18，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 18 改成 17，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 18,
      "suggested": 17,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 18 改成 17，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 18 改成 17，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-136 条件再判断 · 螺旋走廊
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-136', 136,
   '条件再判断 · 螺旋走廊', '沿着走廊走 19 格，拐 3 个弯', $body$
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
        "id": "level1-blk-136-1",
        "type": "coin",
        "x": 1,
        "y": 4
      },
      {
        "id": "level1-blk-136-2",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 19，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 19
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 19，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 19 改成 18，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 19,
      "suggested": 18,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 19 改成 18，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 19 改成 18，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-137 条件再判断 · 有路就直走
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-137', 137,
   '条件再判断 · 有路就直走', '沿着走廊走 11 格，拐 2 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 7,
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
        "x": 4,
        "y": 6
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 13，里面放：如果判断。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 13
        },
        "contains": [
          {
            "type": "if_path_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 13，里面要有如果判断。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 13 改成 12，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 13,
      "suggested": 12,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 13 改成 12，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 13 改成 12，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'practice',
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

-- blk-138 条件再判断 · 有路就直走 2
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-138', 138,
   '条件再判断 · 有路就直走 2', '沿着走廊走 13 格，拐 2 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 6,
    "height": 8,
    "start": {
      "x": 1,
      "y": 6,
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
        "y": 6
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
        "y": 6
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 15，里面放：如果判断。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 15
        },
        "contains": [
          {
            "type": "if_path_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 15，里面要有如果判断。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 15 改成 14，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 15,
      "suggested": 14,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 15 改成 14，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 15 改成 14，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'typing',
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

-- blk-139 条件再判断 · 有路就直走 3
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-139', 139,
   '条件再判断 · 有路就直走 3', '沿着走廊走 14 格，拐 2 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 8,
    "start": {
      "x": 5,
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 16，里面放：如果判断。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 16
        },
        "contains": [
          {
            "type": "if_path_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 16，里面要有如果判断。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 16 改成 15，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 16,
      "suggested": 15,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 16 改成 15，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 16 改成 15，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-140 条件再判断 · 有路就直走 4
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-140', 140,
   '条件再判断 · 有路就直走 4', '沿着走廊走 16 格，拐 2 个弯', $body$
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
        "id": "level1-blk-140-1",
        "type": "coin",
        "x": 1,
        "y": 3
      },
      {
        "id": "level1-blk-140-2",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 18，里面放：如果判断。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 18
        },
        "contains": [
          {
            "type": "if_path_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 18，里面要有如果判断。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 18 改成 17，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 18,
      "suggested": 17,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 18 改成 17，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 18 改成 17，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-141 条件再判断 · 如果否则
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-141', 141,
   '条件再判断 · 如果否则', '沿着走廊走 18 格，拐 3 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 9,
    "start": {
      "x": 6,
      "y": 1,
      "heading": "S"
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
        "x": 6,
        "y": 8
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
        "x": 1,
        "y": 2
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
        "x": 3,
        "y": 2
      },
      {
        "x": 3,
        "y": 4
      },
      {
        "x": 4,
        "y": 2
      },
      {
        "x": 4,
        "y": 4
      }
    ],
    "entities": [
      {
        "id": "level1-blk-141-1",
        "type": "coin",
        "x": 6,
        "y": 6
      },
      {
        "id": "level1-blk-141-2",
        "type": "star",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 21，里面放：如果判断。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 21
        },
        "contains": [
          {
            "type": "if_else",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 21，里面要有如果判断。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 21 改成 20，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 21,
      "suggested": 20,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 21 改成 20，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 21 改成 20，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-142 条件再判断 · 如果否则 2
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-142', 142,
   '条件再判断 · 如果否则 2', '沿着走廊走 19 格，拐 3 个弯', $body$
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
      "x": 3,
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
        "y": 4
      },
      {
        "x": 3,
        "y": 6
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 22，里面放：如果判断。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 22
        },
        "contains": [
          {
            "type": "if_else",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 22，里面要有如果判断。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 22 改成 21，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 22,
      "suggested": 21,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 22 改成 21，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 22 改成 21，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'practice',
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

-- blk-143 条件再判断 · 如果否则 3
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-143', 143,
   '条件再判断 · 如果否则 3', '沿着走廊走 18 格，拐 3 个弯', $body$
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
      "x": 3,
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
        "x": 4,
        "y": 4
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 21，里面放：如果判断。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 21
        },
        "contains": [
          {
            "type": "if_else",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 21，里面要有如果判断。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 21 改成 20，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 21,
      "suggested": 20,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 21 改成 20，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 21 改成 20，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'typing',
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

-- blk-144 条件再判断 · 如果否则 4
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-144', 144,
   '条件再判断 · 如果否则 4', '沿着走廊走 19 格，拐 3 个弯', $body$
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 22，里面放：如果判断。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 22
        },
        "contains": [
          {
            "type": "if_else",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 22，里面要有如果判断。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 22 改成 21，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 22,
      "suggested": 21,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 22 改成 21，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 22 改成 21，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u4', 'grid', 'new',
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

-- blk-145 综合调试 · 三段大路
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-145', 145,
   '综合调试 · 三段大路', '用 3 段「重复执行」走出Z形大路：分别走 4、3、4 格', $body$
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 4 改成 3，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 4,
      "suggested": 3,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 4 改成 3，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 4 改成 3，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-146 综合调试 · 三段长路
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-146', 146,
   '综合调试 · 三段长路', '用 3 段「重复执行」走出Z形大路：分别走 5、3、5 格', $body$
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
        "id": "level1-blk-146-1",
        "type": "coin",
        "x": 4,
        "y": 7
      },
      {
        "id": "level1-blk-146-2",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 5 改成 4，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 5,
      "suggested": 4,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 5 改成 4，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 5 改成 4，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-147 综合调试 · 三段回环
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-147', 147,
   '综合调试 · 三段回环', '用 3 段「重复执行」走出Z形大路：分别走 5、4、5 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 13,
    "height": 7,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "E"
    },
    "goal": {
      "x": 11,
      "y": 5
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
        "x": 6,
        "y": 6
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
        "x": 8,
        "y": 4
      },
      {
        "x": 8,
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
        "x": 12,
        "y": 5
      },
      {
        "x": 11,
        "y": 6
      }
    ],
    "entities": [
      {
        "id": "level1-blk-147-1",
        "type": "coin",
        "x": 5,
        "y": 1
      },
      {
        "id": "level1-blk-147-2",
        "type": "star",
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
          "max": 30,
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
      "text": "这条路分成 3 段：「重复执行」走 5 格，放一块「右转」，「重复执行」走 4 格，放一块「左转」，「重复执行」走 5 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 5 格，放一块「右转」，「重复执行」走 4 格，放一块「左转」，「重复执行」走 5 格。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 5 改成 4，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 5,
      "suggested": 4,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 5 改成 4，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 5 改成 4，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-148 综合调试 · 三段远行
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-148', 148,
   '综合调试 · 三段远行', '用 3 段「重复执行」走出Z形大路：分别走 6、4、6 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 15,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 5,
      "y": 13
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
        "x": 1,
        "y": 8
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
        "x": 6,
        "y": 7
      },
      {
        "x": 6,
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
        "x": 4,
        "y": 11
      },
      {
        "x": 6,
        "y": 12
      },
      {
        "x": 4,
        "y": 12
      },
      {
        "x": 6,
        "y": 13
      },
      {
        "x": 5,
        "y": 14
      },
      {
        "x": 4,
        "y": 13
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
          "max": 30,
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
      "text": "这条路分成 3 段：「重复执行」走 6 格，放一块「左转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「重复执行」。这条路分成 3 段：「重复执行」走 6 格，放一块「左转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 6，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 6
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 6，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 6，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 6
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 6，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 6 改成 5，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 6,
      "suggested": 5,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 6 改成 5，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 6 改成 5，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'practice',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-149 综合调试 · 四段大路
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-149', 149,
   '综合调试 · 四段大路', '用 4 段「重复执行」走出S形大路：分别走 5、4、5、3 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 10,
    "height": 13,
    "start": {
      "x": 8,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 11
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
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
        "y": 1
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
        "y": 5
      },
      {
        "x": 3,
        "y": 6
      },
      {
        "x": 3,
        "y": 7
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
        "y": 9
      },
      {
        "x": 3,
        "y": 9
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
        "y": 11
      },
      {
        "x": 4,
        "y": 12
      },
      {
        "x": 3,
        "y": 12
      },
      {
        "x": 2,
        "y": 10
      },
      {
        "x": 2,
        "y": 12
      },
      {
        "x": 1,
        "y": 10
      },
      {
        "x": 1,
        "y": 12
      },
      {
        "x": 0,
        "y": 11
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 4 块「重复执行」，次数填 3，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 3
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 4 块「重复执行」还没搭好：次数要是 3，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 5 改成 4，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 5,
      "suggested": 4,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 5 改成 4，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 5 改成 4，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'typing',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-150 综合调试 · 四段长路
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-150', 150,
   '综合调试 · 四段长路', '用 4 段「重复执行」走出S形大路：分别走 6、4、6、4 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 11,
    "height": 15,
    "start": {
      "x": 1,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 9,
      "y": 13
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
        "x": 1,
        "y": 8
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
        "x": 6,
        "y": 7
      },
      {
        "x": 6,
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
        "x": 4,
        "y": 11
      },
      {
        "x": 6,
        "y": 12
      },
      {
        "x": 4,
        "y": 12
      },
      {
        "x": 5,
        "y": 14
      },
      {
        "x": 4,
        "y": 13
      },
      {
        "x": 6,
        "y": 14
      },
      {
        "x": 7,
        "y": 12
      },
      {
        "x": 7,
        "y": 14
      },
      {
        "x": 8,
        "y": 12
      },
      {
        "x": 8,
        "y": 14
      },
      {
        "x": 9,
        "y": 12
      },
      {
        "x": 10,
        "y": 13
      },
      {
        "x": 9,
        "y": 14
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
          "max": 30,
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
      "text": "这条路分成 4 段：「重复执行」走 6 格，放一块「左转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格，放一块「左转」，「重复执行」走 4 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 6、4、6、4 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用 4 段「重复执行」走出S形大路：分别走 6、4、6、4 格。"
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
      "content": "这一关真正要用的就是「重复执行」。这条路分成 4 段：「重复执行」走 6 格，放一块「左转」，「重复执行」走 4 格，放一块「右转」，「重复执行」走 6 格，放一块「左转」，「重复执行」走 4 格。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 6，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 6
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 6，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 6，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 6
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 6，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 4 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 4 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 6 改成 5，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 6,
      "suggested": 5,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 6 改成 5，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 6 改成 5，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-151 综合调试 · 四段回环
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-151', 151,
   '综合调试 · 四段回环', '用 4 段「重复执行」走出S形大路：分别走 6、5、7、4 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 12,
    "height": 16,
    "start": {
      "x": 10,
      "y": 1,
      "heading": "S"
    },
    "goal": {
      "x": 1,
      "y": 14
    },
    "actor": {
      "id": "player",
      "asset": "grid_robot"
    },
    "obstacles": [
      {
        "x": 10,
        "y": 0
      },
      {
        "x": 11,
        "y": 1
      },
      {
        "x": 9,
        "y": 1
      },
      {
        "x": 11,
        "y": 2
      },
      {
        "x": 9,
        "y": 2
      },
      {
        "x": 11,
        "y": 3
      },
      {
        "x": 9,
        "y": 3
      },
      {
        "x": 11,
        "y": 4
      },
      {
        "x": 9,
        "y": 4
      },
      {
        "x": 11,
        "y": 5
      },
      {
        "x": 9,
        "y": 5
      },
      {
        "x": 11,
        "y": 6
      },
      {
        "x": 9,
        "y": 6
      },
      {
        "x": 11,
        "y": 7
      },
      {
        "x": 10,
        "y": 8
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
        "x": 4,
        "y": 7
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
        "x": 4,
        "y": 11
      },
      {
        "x": 6,
        "y": 12
      },
      {
        "x": 4,
        "y": 12
      },
      {
        "x": 6,
        "y": 13
      },
      {
        "x": 4,
        "y": 13
      },
      {
        "x": 6,
        "y": 14
      },
      {
        "x": 5,
        "y": 15
      },
      {
        "x": 4,
        "y": 15
      },
      {
        "x": 3,
        "y": 13
      },
      {
        "x": 3,
        "y": 15
      },
      {
        "x": 2,
        "y": 13
      },
      {
        "x": 2,
        "y": 15
      },
      {
        "x": 1,
        "y": 13
      },
      {
        "x": 1,
        "y": 15
      },
      {
        "x": 0,
        "y": 14
      }
    ],
    "entities": [
      {
        "id": "level1-blk-151-1",
        "type": "coin",
        "x": 10,
        "y": 7
      },
      {
        "id": "level1-blk-151-2",
        "type": "star",
        "x": 5,
        "y": 12
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
          "max": 30,
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
      "text": "这条路分成 4 段：「重复执行」走 6 格，放一块「右转」，「重复执行」走 5 格，放一块「左转」，「重复执行」走 7 格，放一块「右转」，「重复执行」走 4 格。",
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
    "success_text": "路线调试成功！"
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
      "content": "这一关真正要用的就是「重复执行」。这条路分成 4 段：「重复执行」走 6 格，放一块「右转」，「重复执行」走 5 格，放一块「左转」，「重复执行」走 7 格，放一块「右转」，「重复执行」走 4 格。"
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
    "hint": "上一关把路分成 4 段，分别走 6、4、6、4 格。"
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 6，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 6
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 6，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 7，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 7
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 7，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 4 块「重复执行」，次数填 4，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 4
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 4 块「重复执行」还没搭好：次数要是 4，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 6 改成 5，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 6,
      "suggested": 5,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 6 改成 5，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 6 改成 5，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-152 综合调试 · 四段远行
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-152', 152,
   '综合调试 · 四段远行', '用 4 段「重复执行」走出S形大路：分别走 7、5、7、5 格', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 13,
    "height": 17,
    "start": {
      "x": 11,
      "y": 15,
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
        "x": 12,
        "y": 15
      },
      {
        "x": 11,
        "y": 16
      },
      {
        "x": 10,
        "y": 15
      },
      {
        "x": 12,
        "y": 14
      },
      {
        "x": 10,
        "y": 14
      },
      {
        "x": 12,
        "y": 13
      },
      {
        "x": 10,
        "y": 13
      },
      {
        "x": 12,
        "y": 12
      },
      {
        "x": 10,
        "y": 12
      },
      {
        "x": 12,
        "y": 11
      },
      {
        "x": 10,
        "y": 11
      },
      {
        "x": 12,
        "y": 10
      },
      {
        "x": 10,
        "y": 10
      },
      {
        "x": 12,
        "y": 9
      },
      {
        "x": 10,
        "y": 9
      },
      {
        "x": 11,
        "y": 7
      },
      {
        "x": 12,
        "y": 8
      },
      {
        "x": 10,
        "y": 7
      },
      {
        "x": 9,
        "y": 7
      },
      {
        "x": 9,
        "y": 9
      },
      {
        "x": 8,
        "y": 7
      },
      {
        "x": 8,
        "y": 9
      },
      {
        "x": 7,
        "y": 7
      },
      {
        "x": 7,
        "y": 9
      },
      {
        "x": 6,
        "y": 9
      },
      {
        "x": 5,
        "y": 8
      },
      {
        "x": 5,
        "y": 7
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
        "y": 5
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
        "x": 5,
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
        "id": "level1-blk-152-1",
        "type": "coin",
        "x": 11,
        "y": 9
      },
      {
        "id": "level1-blk-152-2",
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
          "max": 30,
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
      "text": "这条路分成 4 段：「重复执行」走 7 格，放一块「左转」，「重复执行」走 5 格，放一块「右转」，「重复执行」走 7 格，放一块「左转」，「重复执行」走 5 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    },
    {
      "trigger": "not_completed",
      "text": "每一段的次数不一样，这几段分别要走 7、5、7、5 格。",
      "focus": {
        "target": "block",
        "blockType": "repeat"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "路线调试成功！"
  },
  "visuals": {
    "show_trail": true
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用 4 段「重复执行」走出S形大路：分别走 7、5、7、5 格。"
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
      "content": "这一关真正要用的就是「重复执行」。这条路分成 4 段：「重复执行」走 7 格，放一块「左转」，「重复执行」走 5 格，放一块「右转」，「重复执行」走 7 格，放一块「左转」，「重复执行」走 5 格。"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 7，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 7
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 7，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 3 块「重复执行」，次数填 7，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 7
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 3 块「重复执行」还没搭好：次数要是 7，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 4 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 4 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 7 改成 6，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 7,
      "suggested": 6,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 7 改成 6，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 7 改成 6，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-153 综合调试 · 先走再绕
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-153', 153,
   '综合调试 · 先走再绕', '先直走 5 格，再自动拐 3 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 7,
    "height": 8,
    "start": {
      "x": 5,
      "y": 1,
      "heading": "S"
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
        "x": 1,
        "y": 2
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
        "x": 3,
        "y": 2
      },
      {
        "x": 3,
        "y": 4
      }
    ],
    "entities": [
      {
        "id": "level1-blk-153-1",
        "type": "coin",
        "x": 5,
        "y": 4
      },
      {
        "id": "level1-blk-153-2",
        "type": "star",
        "x": 3,
        "y": 6
      },
      {
        "id": "level1-blk-153-3",
        "type": "coin",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
    "hint": "上一关把路分成 4 段，分别走 7、5、7、5 格。"
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 5，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 5
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 5，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 9，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 9
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 9，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 5 改成 4，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 5,
      "suggested": 4,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 5 改成 4，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 5 改成 4，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'practice',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-154 综合调试 · 走一步再绕
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-154', 154,
   '综合调试 · 走一步再绕', '先直走 6 格，再自动拐 3 个弯', $body$
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
      "x": 3,
      "y": 4
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
      }
    ],
    "entities": [
      {
        "id": "level1-blk-154-1",
        "type": "coin",
        "x": 1,
        "y": 4
      },
      {
        "id": "level1-blk-154-2",
        "type": "star",
        "x": 3,
        "y": 1
      },
      {
        "id": "level1-blk-154-3",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 6，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 6
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 6，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 9，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 9
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 9，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 6 改成 5，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 6,
      "suggested": 5,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 6 改成 5，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 6 改成 5，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-155 综合调试 · 边走边判断
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-155', 155,
   '综合调试 · 边走边判断', '先直走 6 格，再自动拐 3 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 8,
    "height": 9,
    "start": {
      "x": 6,
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
        "x": 6,
        "y": 8
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
        "x": 4,
        "y": 4
      },
      {
        "x": 3,
        "y": 5
      }
    ],
    "entities": [
      {
        "id": "level1-blk-155-1",
        "type": "coin",
        "x": 6,
        "y": 4
      },
      {
        "id": "level1-blk-155-2",
        "type": "star",
        "x": 4,
        "y": 7
      },
      {
        "id": "level1-blk-155-3",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 6，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 6
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 6，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 10，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 10
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 10，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 6 改成 5，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 6,
      "suggested": 5,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 6 改成 5，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 6 改成 5，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-156 综合调试 · 综合一
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-156', 156,
   '综合调试 · 综合一', '先直走 7 格，再自动拐 3 个弯', $body$
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
        "id": "level1-blk-156-1",
        "type": "coin",
        "x": 1,
        "y": 5
      },
      {
        "id": "level1-blk-156-2",
        "type": "star",
        "x": 3,
        "y": 1
      },
      {
        "id": "level1-blk-156-3",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 7，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 7
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 7，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 11，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 11
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 11，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 7 改成 6，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 7,
      "suggested": 6,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 7 改成 6，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 7 改成 6，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-157 综合调试 · 综合二
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-157', 157,
   '综合调试 · 综合二', '先直走 7 格，再自动拐 3 个弯', $body$
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
    "entities": [
      {
        "id": "level1-blk-157-1",
        "type": "coin",
        "x": 6,
        "y": 5
      },
      {
        "id": "level1-blk-157-2",
        "type": "star",
        "x": 3,
        "y": 8
      },
      {
        "id": "level1-blk-157-3",
        "type": "coin",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 7，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 7
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 7，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 12，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 12
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 12，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 7 改成 6，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 7,
      "suggested": 6,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 7 改成 6，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 7 改成 6，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-158 综合调试 · 综合三
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-158', 158,
   '综合调试 · 综合三', '先直走 8 格，再自动拐 3 个弯', $body$
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
      "x": 3,
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
        "y": 4
      },
      {
        "x": 3,
        "y": 6
      }
    ],
    "entities": [
      {
        "id": "level1-blk-158-1",
        "type": "coin",
        "x": 1,
        "y": 5
      },
      {
        "id": "level1-blk-158-2",
        "type": "star",
        "x": 3,
        "y": 1
      },
      {
        "id": "level1-blk-158-3",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 8，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 8
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 8，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 12，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 12
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 12，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 8 改成 7，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 8,
      "suggested": 7,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 8 改成 7，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 8 改成 7，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'practice',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-159 综合调试 · 综合四
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-159', 159,
   '综合调试 · 综合四', '先直走 8 格，再自动拐 3 个弯', $body$
{
  "schema_version": 2,
  "scene_type": "grid",
  "scene": {
    "type": "grid",
    "width": 9,
    "height": 11,
    "start": {
      "x": 7,
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
        "x": 7,
        "y": 0
      },
      {
        "x": 8,
        "y": 1
      },
      {
        "x": 6,
        "y": 1
      },
      {
        "x": 8,
        "y": 2
      },
      {
        "x": 6,
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
        "x": 5,
        "y": 5
      },
      {
        "x": 4,
        "y": 6
      }
    ],
    "entities": [
      {
        "id": "level1-blk-159-1",
        "type": "coin",
        "x": 7,
        "y": 5
      },
      {
        "id": "level1-blk-159-2",
        "type": "star",
        "x": 4,
        "y": 9
      },
      {
        "id": "level1-blk-159-3",
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
          "max": 30,
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
    "success_text": "路线调试成功！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 8，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 8
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 8，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 13，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 13
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 13，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 8 改成 7，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 8,
      "suggested": 7,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 8 改成 7，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 8 改成 7，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'new',
   array['project', 'debug', 'sequence', 'loop', 'condition'], null,
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

-- blk-160 综合调试 · 学期大挑战
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-160', 160,
   '综合调试 · 学期大挑战', '先直走 8 格，再自动拐 3 个弯', $body$
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
        "id": "level1-blk-160-1",
        "type": "coin",
        "x": 1,
        "y": 5
      },
      {
        "id": "level1-blk-160-2",
        "type": "star",
        "x": 4,
        "y": 1
      },
      {
        "id": "level1-blk-160-3",
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
          "max": 30,
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
    "success_text": "Level 1 逻辑大挑战通关！"
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
  },
  "teaching_steps": [
    {
      "text": "放第 1 块「重复执行」，次数填 8，里面放：前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 8
        },
        "contains": [
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 1 块「重复执行」还没搭好：次数要是 8，里面要有前进。",
      "done_text": "这一段路线搭好啦！"
    },
    {
      "text": "放第 2 块「重复执行」，次数填 14，里面放：如果判断、前进。",
      "check": {
        "type": "repeat",
        "args": {
          "times": 14
        },
        "contains": [
          {
            "type": "if_wall_ahead",
            "contains": [
              {
                "type": "turn_right"
              }
            ]
          },
          {
            "type": "move_forward"
          }
        ]
      },
      "fail_text": "第 2 块「重复执行」还没搭好：次数要是 14，里面要有如果判断、前进。",
      "done_text": "这一段路线搭好啦！"
    }
  ],
  "reflection": {
    "question": "路线走通啦！想一想：把第 1 块「重复执行」的次数从 8 改成 7，机器人还能走到终点吗？你来试试。",
    "target": {
      "type": "repeat",
      "arg": "times",
      "current": 8,
      "suggested": 7,
      "nth": 1
    },
    "try_text": "找到第 1 块「重复执行」，把次数 8 改成 7，再点「运行」，看看发生什么。",
    "ran_text": "看到区别了吗？少重复一次，机器人就走不到终点了。点这里完成。",
    "fail_text": "还没改到次数：把第 1 块「重复执行」的 8 改成 7，再点一次「运行」。"
  }
}
  $body$::jsonb, true, now(), now(),
   'blk-g1-spring', 'blk-g1-spring-u5', 'grid', 'project',
   array['project', 'debug', 'sequence', 'loop', 'condition'], 'level1_master',
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

