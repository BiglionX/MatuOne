-- Blockly 二年级 80 关自由舞台（blk-161 … blk-240），一次迁移落库。
--
-- 这个文件由 scripts/generate-stage-levels.mjs 生成，不要手工改：
--   npx tsx scripts/generate-stage-levels.mjs
-- 生成器用生产解析器和生产解释器把每关的标准解跑通一遍才写进来。
--
-- 迁移分五步：
--   1. 两个学期的容量和简介改成 40 课。
--   2. 单元：Level 2 复用 u1/u2、u3…u5 改成 -legacy；
--      Level 3 的 u1…u5 全部改成 -legacy，新的 u1/u2 重新占 1、2 号。
--   3. 旧的占位关卡换号（Level 2 的 blk-167…175 → blk-901…909，
--      Level 3 的 blk-241…255 → blk-941…955），占位行不删。
--   4. learning_record 里的旧编号同步改名，进度不丢。
--   5. 写入 80 关正文。
--
-- Neon 跨语句没有事务，每条语句都写成幂等的固定值，重跑即可。
-- 迁移前请确认已经备份；本文件不执行任何 delete。


-- 1. 学期容量
update public.module_term
set
  weeks = 20,
  level_cap = 40,
  summary = case term_id
    when 'blk-g2-fall' then '自由舞台第一学期：舞台移动、变量计分、躲避危险。完成 2 个小游戏。'
    else '自由舞台第二学期：克隆、多角色协作、复杂条件。完成 1 个大游戏。'
  end,
  updated_at = now()
where module_id = 'blockly'
  and term_id in ('blk-g2-fall', 'blk-g2-spring');

-- 2. 单元
--
-- 旧的 u3…u5（Level 2）和 u1…u5（Level 3）不能删（表上有 forbid_business_delete 触发器），
-- 只能改成 -legacy 编号。父子表改号都会触发即时外键检查，因此放进单个 DO 原子块：
-- 先临时移除外键，父子表都改完后立即重加并校验；块内失败会整体回滚。
-- 父表仅在 legacy 行尚不存在时改号，子表只迁旧占位行，避免重跑误伤新舞台单元。
do $$
begin
  alter table public.module_level drop constraint if exists module_level_unit_fk;

  update public.module_unit
  set unit_id = case unit_id
        when 'blk-g2-fall-u3' then 'blk-g2-fall-u3-legacy'
        when 'blk-g2-fall-u4' then 'blk-g2-fall-u4-legacy'
        when 'blk-g2-fall-u5' then 'blk-g2-fall-u5-legacy'
      end,
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in ('blk-g2-fall-u3', 'blk-g2-fall-u4', 'blk-g2-fall-u5')
    and not exists (
      select 1 from public.module_unit legacy
      where legacy.module_id = public.module_unit.module_id
        and legacy.unit_id = public.module_unit.unit_id || '-legacy'
    );

  update public.module_level
  set unit_id = case unit_id
        when 'blk-g2-fall-u3' then 'blk-g2-fall-u3-legacy'
        when 'blk-g2-fall-u4' then 'blk-g2-fall-u4-legacy'
        when 'blk-g2-fall-u5' then 'blk-g2-fall-u5-legacy'
      end,
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in ('blk-g2-fall-u3', 'blk-g2-fall-u4', 'blk-g2-fall-u5')
    and is_placeholder = true;

  update public.module_unit
  set unit_id = 'blk-g2-spring-u' || (right(unit_id, 1)::int) || '-legacy',
    sort_order = 90 + right(unit_id, 1)::int,
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in ('blk-g2-spring-u1', 'blk-g2-spring-u2', 'blk-g2-spring-u3', 'blk-g2-spring-u4', 'blk-g2-spring-u5')
    and not exists (
      select 1 from public.module_unit legacy
      where legacy.module_id = public.module_unit.module_id
        and legacy.unit_id = public.module_unit.unit_id || '-legacy'
    );

  update public.module_level
  set unit_id = 'blk-g2-spring-u' || (right(unit_id, 1)::int) || '-legacy',
    updated_at = now()
  where module_id = 'blockly'
    and unit_id in ('blk-g2-spring-u1', 'blk-g2-spring-u2', 'blk-g2-spring-u3', 'blk-g2-spring-u4', 'blk-g2-spring-u5')
    and is_placeholder = true;

  alter table public.module_level add constraint module_level_unit_fk
    foreign key (module_id, unit_id) references public.module_unit (module_id, unit_id);
end $$;

insert into public.module_unit
  (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
values
  ('blockly', 'blk-g2-fall-u1', 'blk-g2-fall', '舞台上的移动与计分',
   '认识自由舞台：角色沿一个方向走，用「移动」「如果碰到」和变量把分数记起来。', 'stage',
   array['stage', 'move', 'variable', 'score'], 20, 1),
  ('blockly', 'blk-g2-fall-u2', 'blk-g2-fall', '躲避与计分',
   '路上有会掉下来的障碍，碰到要扣分；一边躲开一边把目标接住。', 'stage',
   array['stage', 'collision', 'score', 'lives'], 20, 2),
  ('blockly', 'blk-g2-spring-u1', 'blk-g2-spring', '克隆与事件',
   '用「克隆」造出子弹和敌人，多个角色同时在舞台上跑起来。', 'stage',
   array['stage', 'clone', 'projectile'], 20, 1),
  ('blockly', 'blk-g2-spring-u2', 'blk-g2-spring', '多角色与复杂逻辑',
   '两个角色一起上场，条件里再套条件，判断写得又细又准。', 'stage',
   array['stage', 'concurrency', 'condition', 'nested'], 20, 2)
on conflict (module_id, unit_id) do update set
  term_id = excluded.term_id,
  title = excluded.title,
  summary = excluded.summary,
  scene_form = excluded.scene_form,
  knowledge_tags = excluded.knowledge_tags,
  level_cap = excluded.level_cap,
  sort_order = excluded.sort_order,
  updated_at = now();

-- 3. 旧的占位关卡换号（先挪到临时号段，再换正式号段）
--
-- sort_order 上有唯一约束 (module_id, sort_order)，直接换号会撞车。
-- 先把两组行挪到 10000+ 的临时号段，再一条一条换到预留号段。
-- 每条 update 都带 term_id 和 is_placeholder 守卫：重跑时新舞台关卡即使复用旧编号，也不会被误挪。
update public.module_level
set sort_order = sort_order + 10000
where module_id = 'blockly'
  and is_placeholder = true
  and (
    (term_id = 'blk-g2-fall' and level_id between 'blk-167' and 'blk-175')
    or (term_id = 'blk-g2-spring' and level_id between 'blk-241' and 'blk-255')
  );

-- blk-167 → blk-901
update public.module_level
set
  level_id = 'blk-901',
  sort_order = 901,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-167'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-168 → blk-902
update public.module_level
set
  level_id = 'blk-902',
  sort_order = 902,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-168'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-169 → blk-903
update public.module_level
set
  level_id = 'blk-903',
  sort_order = 903,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-169'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-170 → blk-904
update public.module_level
set
  level_id = 'blk-904',
  sort_order = 904,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-170'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-171 → blk-905
update public.module_level
set
  level_id = 'blk-905',
  sort_order = 905,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-171'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-172 → blk-906
update public.module_level
set
  level_id = 'blk-906',
  sort_order = 906,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-172'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-173 → blk-907
update public.module_level
set
  level_id = 'blk-907',
  sort_order = 907,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-173'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-174 → blk-908
update public.module_level
set
  level_id = 'blk-908',
  sort_order = 908,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-174'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-175 → blk-909
update public.module_level
set
  level_id = 'blk-909',
  sort_order = 909,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-175'
  and term_id = 'blk-g2-fall'
  and is_placeholder = true;

-- blk-241 → blk-941
update public.module_level
set
  level_id = 'blk-941',
  sort_order = 941,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-241'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-242 → blk-942
update public.module_level
set
  level_id = 'blk-942',
  sort_order = 942,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-242'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-243 → blk-943
update public.module_level
set
  level_id = 'blk-943',
  sort_order = 943,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-243'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-244 → blk-944
update public.module_level
set
  level_id = 'blk-944',
  sort_order = 944,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-244'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-245 → blk-945
update public.module_level
set
  level_id = 'blk-945',
  sort_order = 945,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-245'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-246 → blk-946
update public.module_level
set
  level_id = 'blk-946',
  sort_order = 946,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-246'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-247 → blk-947
update public.module_level
set
  level_id = 'blk-947',
  sort_order = 947,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-247'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-248 → blk-948
update public.module_level
set
  level_id = 'blk-948',
  sort_order = 948,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-248'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-249 → blk-949
update public.module_level
set
  level_id = 'blk-949',
  sort_order = 949,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-249'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-250 → blk-950
update public.module_level
set
  level_id = 'blk-950',
  sort_order = 950,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-250'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-251 → blk-951
update public.module_level
set
  level_id = 'blk-951',
  sort_order = 951,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-251'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-252 → blk-952
update public.module_level
set
  level_id = 'blk-952',
  sort_order = 952,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-252'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-253 → blk-953
update public.module_level
set
  level_id = 'blk-953',
  sort_order = 953,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-253'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-254 → blk-954
update public.module_level
set
  level_id = 'blk-954',
  sort_order = 954,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-254'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- blk-255 → blk-955
update public.module_level
set
  level_id = 'blk-955',
  sort_order = 955,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-255'
  and term_id = 'blk-g2-spring'
  and is_placeholder = true;

-- 4. 学习记录跟着改编号，进度不丢
--
-- learning_record 的主键是 (student_id, level_id)，目标编号已经存在时跳过。
-- 只在旧编号已不存在、目标 legacy 行存在时迁移，避免重跑把新舞台关卡的进度改走。
with remap(old_id, new_id) as (
  values
    ('blk-167', 'blk-901'),
    ('blk-168', 'blk-902'),
    ('blk-169', 'blk-903'),
    ('blk-170', 'blk-904'),
    ('blk-171', 'blk-905'),
    ('blk-172', 'blk-906'),
    ('blk-173', 'blk-907'),
    ('blk-174', 'blk-908'),
    ('blk-175', 'blk-909'),
    ('blk-241', 'blk-941'),
    ('blk-242', 'blk-942'),
    ('blk-243', 'blk-943'),
    ('blk-244', 'blk-944'),
    ('blk-245', 'blk-945'),
    ('blk-246', 'blk-946'),
    ('blk-247', 'blk-947'),
    ('blk-248', 'blk-948'),
    ('blk-249', 'blk-949'),
    ('blk-250', 'blk-950'),
    ('blk-251', 'blk-951'),
    ('blk-252', 'blk-952'),
    ('blk-253', 'blk-953'),
    ('blk-254', 'blk-954'),
    ('blk-255', 'blk-955')
)
update public.learning_record lr
set level_id = r.new_id
from remap r
where lr.module_id = 'blockly'
  and lr.level_id = r.old_id
  and not exists (
    select 1 from public.module_level source
    where source.module_id = 'blockly'
      and source.level_id = r.old_id
  )
  and exists (
    select 1 from public.module_level target
    where target.module_id = 'blockly'
      and target.level_id = r.new_id
      and target.is_placeholder = true
  )
  and not exists (
    select 1 from public.learning_record t
    where t.student_id = lr.student_id
      and t.level_id = r.new_id
  );

-- 5. 二年级 80 关正文
--
-- workspace.max_blocks 的语义是「工作区积木总数（含嵌套子块）」。
-- 舞台关卡卡得比较紧：写不出「无限循环 + 如果碰到」的关卡过不了。
-- runtime.max_steps 是舞台能跑的 Tick 数上限，写错了不会一直空转。

-- blk-161 第一个苹果
-- 接住 2 个往下掉的苹果，把 score 加到 2
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-161', 161,
   '第一个苹果',
   '接住 2 个往下掉的苹果，把 score 加到 2',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 258,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 388,
        "y": 83,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 105,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 2 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 2：每个「如果碰到」都要选对苹果，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "苹果接住啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 2 个往下掉的苹果，把 score 加到 2。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 2 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "一年级的最后一课我们学会了什么呀？",
    "answer": "用变量记住分数：变量像一个小盒子，写进数字之后它就一直记着。",
    "hint": "这一关也要用 score 这个小盒子记住接住了几个目标。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-162 三个苹果
-- 接住 3 个往下掉的苹果，把 score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-162', 162,
   '三个苹果',
   '接住 3 个往下掉的苹果，把 score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 258,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 249,
        "y": 168,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 388,
        "y": 83,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 11,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 106,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 3 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：每个「如果碰到」都要选对苹果，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "苹果接住啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：接住 3 个往下掉的苹果，把 score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 3 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 2 个苹果，score 记成了 2 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-163 苹果落得更快
-- 接住 3 个往下掉的苹果，把 score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-163', 163,
   '苹果落得更快',
   '接住 3 个往下掉的苹果，把 score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 249,
        "y": 163,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 388,
        "y": 65,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 11,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 3 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：每个「如果碰到」都要选对苹果，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "苹果接住啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 3 个往下掉的苹果，把 score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 3 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 3 个苹果，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-164 四个苹果
-- 接住 4 个往下掉的苹果，把 score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-164', 164,
   '四个苹果',
   '接住 4 个往下掉的苹果，把 score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 203,
        "y": 202,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 295,
        "y": 148,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-4",
        "asset": "apple",
        "x": 388,
        "y": 94,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
        }
      },
      {
        "id": "apple-4-fall",
        "target_sprite_id": "apple-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "apple-4-fall-b2"
            }
          ],
          "id": "apple-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            },
            {
              "value": "apple-4",
              "label": "apple-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 99,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 4 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：每个「如果碰到」都要选对苹果，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "苹果接住啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 4 个往下掉的苹果，把 score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 4 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 3 个苹果，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'practice',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-165 苹果雨
-- 接住 4 个往下掉的苹果，把 score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-165', 165,
   '苹果雨',
   '接住 4 个往下掉的苹果，把 score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 203,
        "y": 204,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 295,
        "y": 140,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-4",
        "asset": "apple",
        "x": 388,
        "y": 76,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 8
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 8
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 8
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
        }
      },
      {
        "id": "apple-4-fall",
        "target_sprite_id": "apple-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 8
              },
              "id": "apple-4-fall-b2"
            }
          ],
          "id": "apple-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            },
            {
              "value": "apple-4",
              "label": "apple-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 94,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 4 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：每个「如果碰到」都要选对苹果，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "苹果接住啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 4 个往下掉的苹果，把 score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 4 个苹果各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 4 个苹果，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'typing',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-166 第一只地鼠
-- 用小猫走过 2 只地鼠，把 score 加到 2
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-166', 166,
   '第一只地鼠',
   '用小猫走过 2 只地鼠，把 score 加到 2',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "mole-1",
          "options": [
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 105,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 2 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 2：每个「如果碰到」都要选对地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "地鼠全敲到了！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用小猫走过 2 只地鼠，把 score 加到 2。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 2 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 4 个苹果，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-167 三只地鼠
-- 用小猫走过 3 只地鼠，把 score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-167', 167,
   '三只地鼠',
   '用小猫走过 3 只地鼠，把 score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-3",
        "asset": "mole",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "mole-1",
          "options": [
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "mole-3",
              "label": "mole-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 11,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 3 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：每个「如果碰到」都要选对地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "地鼠全敲到了！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用小猫走过 3 只地鼠，把 score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 3 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 2 个地鼠，score 记成了 2 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-168 地鼠排排站
-- 用小猫走过 4 只地鼠，把 score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-168', 168,
   '地鼠排排站',
   '用小猫走过 4 只地鼠，把 score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-3",
        "asset": "mole",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-4",
        "asset": "mole",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "mole-1",
          "options": [
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "mole-3",
              "label": "mole-3"
            },
            {
              "value": "mole-4",
              "label": "mole-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 99,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 4 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：每个「如果碰到」都要选对地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "地鼠全敲到了！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用小猫走过 4 只地鼠，把 score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 4 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 3 个地鼠，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-169 五只地鼠
-- 用小猫走过 5 只地鼠，把 score 加到 5
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-169', 169,
   '五只地鼠',
   '用小猫走过 5 只地鼠，把 score 加到 5',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 180,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-3",
        "asset": "mole",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-4",
        "asset": "mole",
        "x": 319,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-5",
        "asset": "mole",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "mole-1",
          "options": [
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "mole-3",
              "label": "mole-3"
            },
            {
              "value": "mole-4",
              "label": "mole-4"
            },
            {
              "value": "mole-5",
              "label": "mole-5"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-4"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-5"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 95,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 5 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 5：每个「如果碰到」都要选对地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "地鼠全敲到了！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用小猫走过 5 只地鼠，把 score 加到 5。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 5 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 4 个地鼠，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'practice',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-170 地鼠大扫荡
-- 用小猫走过 5 只地鼠，把 score 加到 5
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-170', 170,
   '地鼠大扫荡',
   '用小猫走过 5 只地鼠，把 score 加到 5',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 180,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-3",
        "asset": "mole",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-4",
        "asset": "mole",
        "x": 319,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-5",
        "asset": "mole",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "mole-1",
          "options": [
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "mole-3",
              "label": "mole-3"
            },
            {
              "value": "mole-4",
              "label": "mole-4"
            },
            {
              "value": "mole-5",
              "label": "mole-5"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-4"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-5"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 91,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」14 步，再给 5 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 5：每个「如果碰到」都要选对地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "地鼠全敲到了！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用小猫走过 5 只地鼠，把 score 加到 5。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」14 步，再给 5 个地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 5 个地鼠，score 记成了 5 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'typing',
   array['stage', 'move', 'variable', 'collision'], null,
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

-- blk-171 星星和宝石
-- 接住 2 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-171', 171,
   '星星和宝石',
   '接住 2 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 107,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 3 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 1 个要加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：每个「如果碰到」都要选对星星和宝石，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "星星宝石全收齐！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 2 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 3 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 1 个要加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 5 个地鼠，score 记成了 5 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'variable', 'condition', 'nested'], null,
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

-- blk-172 双倍星星
-- 接住 3 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 5
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-172', 172,
   '双倍星星',
   '接住 3 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 5',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-3",
        "asset": "star",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            },
            {
              "value": "star-3",
              "label": "star-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 100,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 4 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 1 个要加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 5：每个「如果碰到」都要选对星星和宝石，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "星星宝石全收齐！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 3 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 5。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 4 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 1 个要加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 3 个星星和宝石，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'variable', 'condition', 'nested'], null,
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

-- blk-173 宝石加倍
-- 接住 2 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 6
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-173', 173,
   '宝石加倍',
   '接住 2 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 6',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 6
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 101,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 4 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 2 个要加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 6：每个「如果碰到」都要选对星星和宝石，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "星星宝石全收齐！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 2 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 6。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 4 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 2 个要加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 4 个星星和宝石，score 记成了 5 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['stage', 'variable', 'condition', 'nested'], null,
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

-- blk-174 星光大道
-- 接住 3 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 7
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-174', 174,
   '星光大道',
   '接住 3 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 7',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 180,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 319,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-3",
        "asset": "star",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            },
            {
              "value": "star-3",
              "label": "star-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 7
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 17,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 97,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 5 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 2 个要加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 7：每个「如果碰到」都要选对星星和宝石，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "星星宝石全收齐！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：接住 3 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 7。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 5 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 2 个要加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 4 个星星和宝石，score 记成了 6 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'practice',
   array['stage', 'variable', 'condition', 'nested'], null,
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

-- blk-175 满地宝石
-- 接住 4 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 8
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-175', 175,
   '满地宝石',
   '接住 4 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 8',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 166,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 221,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 277,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-3",
        "asset": "star",
        "x": 332,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-4",
        "asset": "star",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            },
            {
              "value": "star-3",
              "label": "star-3"
            },
            {
              "value": "star-4",
              "label": "star-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 8
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 19,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 6 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 2 个要加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 8：每个「如果碰到」都要选对星星和宝石，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "星星宝石全收齐！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 4 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 8。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 6 个星星和宝石各配一个「如果碰到」，体里放「变量增加」1 分，其中 2 个要加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 5 个星星和宝石，score 记成了 7 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'typing',
   array['stage', 'variable', 'condition', 'nested'], null,
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

-- blk-176 接苹果：拆解
-- 接住 3 个苹果、敲到 2 只地鼠，把 score 加到 5，再踩到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-176', 176,
   '接苹果：拆解',
   '接住 3 个苹果、敲到 2 只地鼠，把 score 加到 5，再踩到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 258,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 180,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 249,
        "y": 168,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 319,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 388,
        "y": 83,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 119,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 5 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 5：每个「如果碰到」都要选对苹果和地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "项目完成，小精灵给你发徽章！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 3 个苹果、敲到 2 只地鼠，把 score 加到 5，再踩到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」8 步，再给 5 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 6 个星星和宝石，score 记成了 8 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['project', 'stage', 'move', 'variable', 'collision'], null,
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

-- blk-177 接苹果：多一关
-- 接住 3 个苹果、敲到 3 只地鼠，把 score 加到 6，再踩到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-177', 177,
   '接苹果：多一关',
   '接住 3 个苹果、敲到 3 只地鼠，把 score 加到 6，再踩到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 166,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 221,
        "y": 208,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 277,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 332,
        "y": 148,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-3",
        "asset": "mole",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            },
            {
              "value": "mole-3",
              "label": "mole-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 6
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 17,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 110,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 6 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 6：每个「如果碰到」都要选对苹果和地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "项目完成，小精灵给你发徽章！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 3 个苹果、敲到 3 只地鼠，把 score 加到 6，再踩到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 6 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 5 个苹果和地鼠，score 记成了 5 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['project', 'stage', 'move', 'variable', 'collision'], null,
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

-- blk-178 接苹果：加速
-- 接住 4 个苹果、敲到 2 只地鼠，把 score 加到 6，再踩到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-178', 178,
   '接苹果：加速',
   '接住 4 个苹果、敲到 2 只地鼠，把 score 加到 6，再踩到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 166,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 221,
        "y": 208,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 277,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 332,
        "y": 148,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-4",
        "asset": "apple",
        "x": 388,
        "y": 123,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
        }
      },
      {
        "id": "apple-4-fall",
        "target_sprite_id": "apple-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-4-fall-b2"
            }
          ],
          "id": "apple-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            },
            {
              "value": "apple-4",
              "label": "apple-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 6
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-4"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 17,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 110,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 6 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 6：每个「如果碰到」都要选对苹果和地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "项目完成，小精灵给你发徽章！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：接住 4 个苹果、敲到 2 只地鼠，把 score 加到 6，再踩到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」10 步，再给 6 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 6 个苹果和地鼠，score 记成了 6 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'new',
   array['project', 'stage', 'move', 'variable', 'collision'], null,
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

-- blk-179 接苹果：终点
-- 接住 4 个苹果、敲到 3 只地鼠，把 score 加到 7，再踩到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-179', 179,
   '接苹果：终点',
   '接住 4 个苹果、敲到 3 只地鼠，把 score 加到 7，再踩到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 156,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 203,
        "y": 228,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 295,
        "y": 188,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-3",
        "asset": "mole",
        "x": 342,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-4",
        "asset": "apple",
        "x": 388,
        "y": 148,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
        }
      },
      {
        "id": "apple-4-fall",
        "target_sprite_id": "apple-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-4-fall-b2"
            }
          ],
          "id": "apple-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            },
            {
              "value": "mole-3",
              "label": "mole-3"
            },
            {
              "value": "apple-4",
              "label": "apple-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 7
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-4"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 19,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 104,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 7 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 7：每个「如果碰到」都要选对苹果和地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "项目完成，小精灵给你发徽章！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 4 个苹果、敲到 3 只地鼠，把 score 加到 7，再踩到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 7 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 6 个苹果和地鼠，score 记成了 6 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'practice',
   array['project', 'stage', 'move', 'variable', 'collision'], null,
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

-- blk-180 接苹果：完整作品
-- 接住 5 个苹果、敲到 3 只地鼠，把 score 加到 8，再踩到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-180', 180,
   '接苹果：完整作品',
   '接住 5 个苹果、敲到 3 只地鼠，把 score 加到 8，再踩到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "apple-1",
        "asset": "apple",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-1",
        "asset": "mole",
        "x": 150,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-2",
        "asset": "apple",
        "x": 189,
        "y": 233,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-2",
        "asset": "mole",
        "x": 229,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-3",
        "asset": "apple",
        "x": 269,
        "y": 198,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "mole-3",
        "asset": "mole",
        "x": 309,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-4",
        "asset": "apple",
        "x": 348,
        "y": 163,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "apple-5",
        "asset": "apple",
        "x": 388,
        "y": 148,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "apple-1-fall",
        "target_sprite_id": "apple-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-1-fall-b2"
            }
          ],
          "id": "apple-1-fall-b1"
        }
      },
      {
        "id": "apple-2-fall",
        "target_sprite_id": "apple-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-2-fall-b2"
            }
          ],
          "id": "apple-2-fall-b1"
        }
      },
      {
        "id": "apple-3-fall",
        "target_sprite_id": "apple-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-3-fall-b2"
            }
          ],
          "id": "apple-3-fall-b1"
        }
      },
      {
        "id": "apple-4-fall",
        "target_sprite_id": "apple-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-4-fall-b2"
            }
          ],
          "id": "apple-4-fall-b1"
        }
      },
      {
        "id": "apple-5-fall",
        "target_sprite_id": "apple-5",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "apple-5-fall-b2"
            }
          ],
          "id": "apple-5-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "apple-1",
          "options": [
            {
              "value": "apple-1",
              "label": "apple-1"
            },
            {
              "value": "mole-1",
              "label": "mole-1"
            },
            {
              "value": "apple-2",
              "label": "apple-2"
            },
            {
              "value": "mole-2",
              "label": "mole-2"
            },
            {
              "value": "apple-3",
              "label": "apple-3"
            },
            {
              "value": "mole-3",
              "label": "mole-3"
            },
            {
              "value": "apple-4",
              "label": "apple-4"
            },
            {
              "value": "apple-5",
              "label": "apple-5"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 8
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "mole-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-4"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "apple-5"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 21,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 105,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 8 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 8：每个「如果碰到」都要选对苹果和地鼠，而且每次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "项目完成，小精灵给你发徽章！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 5 个苹果、敲到 3 只地鼠，把 score 加到 8，再踩到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「边走边接」来帮忙：角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放一块「无限循环」：里面先放「移动」12 步，再给 8 个苹果和地鼠各配一个「如果碰到」，体里放「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 7 个苹果和地鼠，score 记成了 7 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u1', 'stage', 'typing',
   array['project', 'stage', 'move', 'variable', 'collision'], 'term3_project',
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

-- blk-181 第一颗炸弹
-- 撞到 2 次炸弹，lives 从 3 扣到 1，别把命全撞光
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-181', 181,
   '第一颗炸弹',
   '撞到 2 次炸弹，lives 从 3 扣到 1，别把命全撞光',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 258,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 388,
        "y": 83,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 10,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 106,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」8 步，再给 2 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "扣分规则学会啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：撞到 2 次炸弹，lives 从 3 扣到 1，别把命全撞光。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」8 步，再给 2 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「边走边接」，还记得怎么用吗？",
    "answer": "角色一直往前走，用「如果碰到」检查每个目标，碰到就加分。",
    "hint": "上一关接住了 8 个苹果和地鼠，score 记成了 8 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'lives'], null,
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

-- blk-182 躲过炸弹
-- 撞到 2 次炸弹，lives 从 3 扣到 1，别把命全撞光
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-182', 182,
   '躲过炸弹',
   '撞到 2 次炸弹，lives 从 3 扣到 1，别把命全撞光',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 388,
        "y": 94,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 10,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 2 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "扣分规则学会啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：撞到 2 次炸弹，lives 从 3 扣到 1，别把命全撞光。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 2 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 2 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'lives'], null,
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

-- blk-183 掉下来的石头
-- 撞到 3 次炸弹，lives 从 3 扣到 0，别把命全撞光
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-183', 183,
   '掉下来的石头',
   '撞到 3 次炸弹，lives 从 3 扣到 0，别把命全撞光',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 249,
        "y": 178,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 388,
        "y": 94,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 0
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 99,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 0 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "扣分规则学会啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：撞到 3 次炸弹，lives 从 3 扣到 0，别把命全撞光。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 2 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'lives'], null,
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

-- blk-184 三颗炸弹
-- 撞到 3 次炸弹，lives 从 3 扣到 0，别把命全撞光
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-184', 184,
   '三颗炸弹',
   '撞到 3 次炸弹，lives 从 3 扣到 0，别把命全撞光',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 249,
        "y": 184,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 388,
        "y": 100,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 0
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 94,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 0 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "扣分规则学会啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：撞到 3 次炸弹，lives 从 3 扣到 0，别把命全撞光。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 3 个障碍，撞到 3 次，剩下 0 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'practice',
   array['stage', 'collision', 'lives'], null,
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

-- blk-185 炸弹排排站
-- 撞到 4 次炸弹，lives 从 3 扣到 -1，别把命全撞光
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-185', 185,
   '炸弹排排站',
   '撞到 4 次炸弹，lives 从 3 扣到 -1，别把命全撞光',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 203,
        "y": 212,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 295,
        "y": 156,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-4",
        "asset": "bomb",
        "x": 388,
        "y": 100,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
        }
      },
      {
        "id": "bomb-4-fall",
        "target_sprite_id": "bomb-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-4-fall-b2"
            }
          ],
          "id": "bomb-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "bomb-4",
              "label": "bomb-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": -1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 95,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 -1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "扣分规则学会啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：撞到 4 次炸弹，lives 从 3 扣到 -1，别把命全撞光。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 3 个障碍，撞到 3 次，剩下 0 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'typing',
   array['stage', 'collision', 'lives'], null,
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

-- blk-186 跑得更快
-- 路上有 3 个炸弹，只要撞到 2 次，lives 就要还剩 1 条
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-186', 186,
   '跑得更快',
   '路上有 3 个炸弹，只要撞到 2 次，lives 就要还剩 1 条',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 249,
        "y": 193,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 388,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 84,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "躲得真准！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：路上有 3 个炸弹，只要撞到 2 次，lives 就要还剩 1 条。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 4 个障碍，撞到 4 次，剩下 -1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'lives', 'speed'], null,
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

-- blk-187 提前出发
-- 路上有 3 个炸弹，只要撞到 2 次，lives 就要还剩 1 条
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-187', 187,
   '提前出发',
   '路上有 3 个炸弹，只要撞到 2 次，lives 就要还剩 1 条',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 249,
        "y": 208,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 388,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 81,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "躲得真准！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：路上有 3 个炸弹，只要撞到 2 次，lives 就要还剩 1 条。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 3 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'lives', 'speed'], null,
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

-- blk-188 擦肩而过
-- 路上有 4 个炸弹，只要撞到 2 次，lives 就要还剩 1 条
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-188', 188,
   '擦肩而过',
   '路上有 4 个炸弹，只要撞到 2 次，lives 就要还剩 1 条',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 203,
        "y": 220,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 295,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-4",
        "asset": "bomb",
        "x": 388,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
        }
      },
      {
        "id": "bomb-4-fall",
        "target_sprite_id": "bomb-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-4-fall-b2"
            }
          ],
          "id": "bomb-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "bomb-4",
              "label": "bomb-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 77,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "躲得真准！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：路上有 4 个炸弹，只要撞到 2 次，lives 就要还剩 1 条。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 3 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'lives', 'speed'], null,
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

-- blk-189 闪电跑
-- 路上有 4 个炸弹，只要撞到 2 次，lives 就要还剩 1 条
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-189', 189,
   '闪电跑',
   '路上有 4 个炸弹，只要撞到 2 次，lives 就要还剩 1 条',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 203,
        "y": 226,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 295,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-4",
        "asset": "bomb",
        "x": 388,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
        }
      },
      {
        "id": "bomb-4-fall",
        "target_sprite_id": "bomb-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-4-fall-b2"
            }
          ],
          "id": "bomb-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "bomb-4",
              "label": "bomb-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 76,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "躲得真准！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：路上有 4 个炸弹，只要撞到 2 次，lives 就要还剩 1 条。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 4 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'practice',
   array['stage', 'collision', 'lives', 'speed'], null,
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

-- blk-190 完美闪避
-- 路上有 5 个炸弹，只要撞到 3 次，lives 就要还剩 0 条
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-190', 190,
   '完美闪避',
   '路上有 5 个炸弹，只要撞到 3 次，lives 就要还剩 0 条',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 180,
        "y": 233,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 249,
        "y": 198,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-4",
        "asset": "bomb",
        "x": 319,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-5",
        "asset": "bomb",
        "x": 388,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
        }
      },
      {
        "id": "bomb-4-fall",
        "target_sprite_id": "bomb-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-4-fall-b2"
            }
          ],
          "id": "bomb-4-fall-b1"
        }
      },
      {
        "id": "bomb-5-fall",
        "target_sprite_id": "bomb-5",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-5-fall-b2"
            }
          ],
          "id": "bomb-5-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "bomb-4",
              "label": "bomb-4"
            },
            {
              "value": "bomb-5",
              "label": "bomb-5"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 0
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 0
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 80,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 5 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 0 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "躲得真准！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：路上有 5 个炸弹，只要撞到 3 次，lives 就要还剩 0 条。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 5 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 4 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'typing',
   array['stage', 'collision', 'lives', 'speed'], null,
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

-- blk-191 一边躲一边接
-- 接住 2 枚金币（score 加到 2），撞到 1 次炸弹（lives 剩 2），再踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-191', 191,
   '一边躲一边接',
   '接住 2 枚金币（score 加到 2），撞到 1 次炸弹（lives 剩 2），再踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 295,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 2
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 108,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 2 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 2 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "又躲又接，成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 2 枚金币（score 加到 2），撞到 1 次炸弹（lives 剩 2），再踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 2 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 5 个障碍，撞到 3 次，剩下 0 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'score', 'lives'], null,
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

-- blk-192 金币和炸弹
-- 接住 3 枚金币（score 加到 3），撞到 1 次炸弹（lives 剩 2），再踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-192', 192,
   '金币和炸弹',
   '接住 3 枚金币（score 加到 3），撞到 1 次炸弹（lives 剩 2），再踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 180,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 249,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 319,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 2
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 102,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 2 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 2 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "又躲又接，成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 3 枚金币（score 加到 3），撞到 1 次炸弹（lives 剩 2），再踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 2 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 2 个障碍，撞到 1 次，剩下 2 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'score', 'lives'], null,
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

-- blk-193 限时冲刺
-- 接住 3 枚金币（score 加到 3），撞到 2 次炸弹（lives 剩 1），再踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-193', 193,
   '限时冲刺',
   '接住 3 枚金币（score 加到 3），撞到 2 次炸弹（lives 剩 1），再踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 166,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 221,
        "y": 208,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 277,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 332,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 103,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "又躲又接，成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 3 枚金币（score 加到 3），撞到 2 次炸弹（lives 剩 1），再踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 2 个障碍，撞到 1 次，剩下 2 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['stage', 'collision', 'score', 'lives'], null,
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

-- blk-194 又躲又接
-- 接住 3 枚金币（score 加到 3），撞到 1 次炸弹（lives 剩 2），再踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-194', 194,
   '又躲又接',
   '接住 3 枚金币（score 加到 3），撞到 1 次炸弹（lives 剩 2），再踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 166,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 221,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 277,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 332,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 2
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 2 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "又躲又接，成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：接住 3 枚金币（score 加到 3），撞到 1 次炸弹（lives 剩 2），再踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 3 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'practice',
   array['stage', 'collision', 'score', 'lives'], null,
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

-- blk-195 双重挑战
-- 接住 4 枚金币（score 加到 4），撞到 2 次炸弹（lives 剩 1），再踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-195', 195,
   '双重挑战',
   '接住 4 枚金币（score 加到 4），撞到 2 次炸弹（lives 剩 1），再踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 150,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 189,
        "y": 226,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 229,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 269,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 309,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-4",
        "asset": "bomb",
        "x": 348,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
        }
      },
      {
        "id": "bomb-4-fall",
        "target_sprite_id": "bomb-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-4-fall-b2"
            }
          ],
          "id": "bomb-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "bomb-4",
              "label": "bomb-4"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 22,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 100,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "又躲又接，成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 4 枚金币（score 加到 4），撞到 2 次炸弹（lives 剩 1），再踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 3 个障碍，撞到 1 次，剩下 2 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'typing',
   array['stage', 'collision', 'score', 'lives'], null,
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

-- blk-196 跑酷：拆解
-- 接住 3 枚金币，撞到 2 次炸弹，最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-196', 196,
   '跑酷：拆解',
   '接住 3 枚金币，撞到 2 次炸弹，最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 166,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 221,
        "y": 208,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 277,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 332,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 110,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "跑酷项目完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 3 枚金币，撞到 2 次炸弹，最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」10 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 4 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['project', 'stage', 'collision', 'score', 'lives'], null,
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

-- blk-197 跑酷：多一段
-- 接住 3 枚金币，撞到 1 次炸弹，最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-197', 197,
   '跑酷：多一段',
   '接住 3 枚金币，撞到 1 次炸弹，最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 166,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 221,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 277,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 332,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 2
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 102,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 2 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "跑酷项目完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 3 枚金币，撞到 1 次炸弹，最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 3 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 3 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['project', 'stage', 'collision', 'score', 'lives'], null,
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

-- blk-198 跑酷：多两段
-- 接住 4 枚金币，撞到 2 次炸弹，最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-198', 198,
   '跑酷：多两段',
   '接住 4 枚金币，撞到 2 次炸弹，最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 150,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 189,
        "y": 226,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 229,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 269,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 309,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-4",
        "asset": "bomb",
        "x": 348,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 6
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
        }
      },
      {
        "id": "bomb-4-fall",
        "target_sprite_id": "bomb-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-4-fall-b2"
            }
          ],
          "id": "bomb-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "bomb-4",
              "label": "bomb-4"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 22,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 104,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "跑酷项目完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：接住 4 枚金币，撞到 2 次炸弹，最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」12 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 3 个障碍，撞到 1 次，剩下 2 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'new',
   array['project', 'stage', 'collision', 'score', 'lives'], null,
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

-- blk-199 跑酷：终点
-- 接住 4 枚金币，撞到 2 次炸弹，最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-199', 199,
   '跑酷：终点',
   '接住 4 枚金币，撞到 2 次炸弹，最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 150,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 189,
        "y": 226,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 229,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 269,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 309,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-4",
        "asset": "bomb",
        "x": 348,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
        }
      },
      {
        "id": "bomb-4-fall",
        "target_sprite_id": "bomb-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-4-fall-b2"
            }
          ],
          "id": "bomb-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "bomb-4",
              "label": "bomb-4"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 22,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 100,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "跑酷项目完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 4 枚金币，撞到 2 次炸弹，最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 4 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 4 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'practice',
   array['project', 'stage', 'collision', 'score', 'lives'], null,
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

-- blk-200 跑酷：完整作品
-- 接住 5 枚金币，撞到 2 次炸弹，最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-200', 200,
   '跑酷：完整作品',
   '接住 5 枚金币，撞到 2 次炸弹，最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "sky",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "bomb-1",
        "asset": "bomb",
        "x": 110,
        "y": 260,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 141,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-2",
        "asset": "bomb",
        "x": 172,
        "y": 233,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-3",
        "asset": "bomb",
        "x": 234,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 264,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-4",
        "asset": "bomb",
        "x": 295,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 326,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "bomb-5",
        "asset": "bomb",
        "x": 357,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-5",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      },
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "bomb-1-fall",
        "target_sprite_id": "bomb-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-1-fall-b2"
            }
          ],
          "id": "bomb-1-fall-b1"
        }
      },
      {
        "id": "bomb-2-fall",
        "target_sprite_id": "bomb-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 7
              },
              "id": "bomb-2-fall-b2"
            }
          ],
          "id": "bomb-2-fall-b1"
        }
      },
      {
        "id": "bomb-3-fall",
        "target_sprite_id": "bomb-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-3-fall-b2"
            }
          ],
          "id": "bomb-3-fall-b1"
        }
      },
      {
        "id": "bomb-4-fall",
        "target_sprite_id": "bomb-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-4-fall-b2"
            }
          ],
          "id": "bomb-4-fall-b1"
        }
      },
      {
        "id": "bomb-5-fall",
        "target_sprite_id": "bomb-5",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "bomb-5-fall-b2"
            }
          ],
          "id": "bomb-5-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "bomb-1",
          "options": [
            {
              "value": "bomb-1",
              "label": "bomb-1"
            },
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "bomb-2",
              "label": "bomb-2"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "bomb-3",
              "label": "bomb-3"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "bomb-4",
              "label": "bomb-4"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            },
            {
              "value": "bomb-5",
              "label": "bomb-5"
            },
            {
              "value": "coin-5",
              "label": "coin-5"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-5"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 26,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 101,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 5 个障碍各配一个「如果碰到」，体里放「变量增加」-1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "lives 要正好剩 1 条：每个障碍都要配一个「如果碰到」，体里是「变量增加」-1，别写成 +1。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "跑酷项目完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 5 枚金币，撞到 2 次炸弹，最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "idea",
      "speaker": "小精灵",
      "content": "今天请「躲开危险」来帮忙：碰到危险要扣分，看准时机走过去就能毫发无损。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 lives 设成 3，再放「无限循环」：里面先放「移动」14 步，再给 5 个障碍各配一个「如果碰到」，体里放「变量增加」-1。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 4 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-fall', 'blk-g2-fall-u2', 'stage', 'project',
   array['project', 'stage', 'collision', 'score', 'lives'], 'term3_master',
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

-- blk-201 第一发子弹
-- 用克隆造出子弹，打中 1 个敌人，把 score 加到 1
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-201', 201,
   '第一发子弹',
   '用克隆造出子弹，打中 1 个敌人，把 score 加到 1',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 80,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 1
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 76,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 1：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "子弹打中啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用克隆造出子弹，打中 1 个敌人，把 score 加到 1。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「躲开危险」，还记得怎么用吗？",
    "answer": "碰到危险要扣分，看准时机走过去就能毫发无损。",
    "hint": "上一关路上有 5 个障碍，撞到 2 次，剩下 1 条命。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'collision'], null,
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

-- blk-202 打中一个
-- 用克隆造出子弹，打中 1 个敌人，把 score 加到 1
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-202', 202,
   '打中一个',
   '用克隆造出子弹，打中 1 个敌人，把 score 加到 1',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 80,
        "y": 180,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 1
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 79,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 1：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "子弹打中啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用克隆造出子弹，打中 1 个敌人，把 score 加到 1。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 1 个新角色，打掉了 1 个敌人，score 记成了 1 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'collision'], null,
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

-- blk-203 再打一个
-- 用克隆造出子弹，打中 2 个敌人，把 score 加到 2
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-203', 203,
   '再打一个',
   '用克隆造出子弹，打中 2 个敌人，把 score 加到 2',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 88,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 2：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "子弹打中啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用克隆造出子弹，打中 2 个敌人，把 score 加到 2。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 1 个新角色，打掉了 1 个敌人，score 记成了 1 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'collision'], null,
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

-- blk-204 三发子弹
-- 用克隆造出子弹，打中 2 个敌人，把 score 加到 2
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-204', 204,
   '三发子弹',
   '用克隆造出子弹，打中 2 个敌人，把 score 加到 2',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 220,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 160,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 85,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 2：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "子弹打中啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用克隆造出子弹，打中 2 个敌人，把 score 加到 2。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 2 个新角色，打掉了 2 个敌人，score 记成了 2 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'practice',
   array['stage', 'clone', 'collision'], null,
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

-- blk-205 子弹小队
-- 用克隆造出子弹，打中 3 个敌人，把 score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-205', 205,
   '子弹小队',
   '用克隆造出子弹，打中 3 个敌人，把 score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 150,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 184,
        "y": 250,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 86,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "子弹打中啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用克隆造出子弹，打中 3 个敌人，把 score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 2 个新角色，打掉了 2 个敌人，score 记成了 2 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'typing',
   array['stage', 'clone', 'collision'], null,
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

-- blk-206 连续发射
-- 连着发射，把 2 个敌人全部打中，score 加到 2
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-206', 206,
   '连续发射',
   '连着发射，把 2 个敌人全部打中，score 加到 2',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 80,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 120,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 88,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 2：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "弹幕扫平啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：连着发射，把 2 个敌人全部打中，score 加到 2。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 3 个新角色，打掉了 3 个敌人，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'loop', 'collision'], null,
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

-- blk-207 不停歇
-- 连着发射，把 3 个敌人全部打中，score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-207', 207,
   '不停歇',
   '连着发射，把 3 个敌人全部打中，score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 184,
        "y": 250,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 88,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "弹幕扫平啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：连着发射，把 3 个敌人全部打中，score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 2 个新角色，打掉了 2 个敌人，score 记成了 2 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'loop', 'collision'], null,
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

-- blk-208 弹幕
-- 连着发射，把 3 个敌人全部打中，score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-208', 208,
   '弹幕',
   '连着发射，把 3 个敌人全部打中，score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 180,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 230,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 184,
        "y": 120,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 94,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "弹幕扫平啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：连着发射，把 3 个敌人全部打中，score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 3 个新角色，打掉了 3 个敌人，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'loop', 'collision'], null,
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

-- blk-209 火力全开
-- 连着发射，把 4 个敌人全部打中，score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-209', 209,
   '火力全开',
   '连着发射，把 4 个敌人全部打中，score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 96,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 152,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 208,
        "y": 250,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-4",
        "asset": "enemy",
        "x": 264,
        "y": 170,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            },
            {
              "value": "enemy-4",
              "label": "enemy-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 92,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "弹幕扫平啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：连着发射，把 4 个敌人全部打中，score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 3 个新角色，打掉了 3 个敌人，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'practice',
   array['stage', 'clone', 'loop', 'collision'], null,
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

-- blk-210 扫清航道
-- 连着发射，把 4 个敌人全部打中，score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-210', 210,
   '扫清航道',
   '连着发射，把 4 个敌人全部打中，score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 96,
        "y": 220,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 152,
        "y": 160,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 208,
        "y": 110,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-4",
        "asset": "enemy",
        "x": 264,
        "y": 260,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            },
            {
              "value": "enemy-4",
              "label": "enemy-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 95,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "弹幕扫平啦！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：连着发射，把 4 个敌人全部打中，score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 4 个新角色，打掉了 4 个敌人，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'typing',
   array['stage', 'clone', 'loop', 'collision'], null,
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

-- blk-211 两路夹击
-- 用两种克隆火力，把 2 个敌人全部打中，score 加到 2
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-211', 211,
   '两路夹击',
   '用两种克隆火力，把 2 个敌人全部打中，score 加到 2',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 80,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 120,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      },
      {
        "id": "shell",
        "asset": "bomb",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 60,
        "size": 60,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            },
            {
              "value": "shell",
              "label": "炮弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 22,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 88,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 2：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "交叉火力成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用两种克隆火力，把 2 个敌人全部打中，score 加到 2。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 4 个新角色，打掉了 4 个敌人，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'collision', 'concurrency'], null,
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

-- blk-212 两种子弹
-- 用两种克隆火力，把 3 个敌人全部打中，score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-212', 212,
   '两种子弹',
   '用两种克隆火力，把 3 个敌人全部打中，score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 184,
        "y": 250,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      },
      {
        "id": "shell",
        "asset": "bomb",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 60,
        "size": 60,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            },
            {
              "value": "shell",
              "label": "炮弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 26,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 88,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "交叉火力成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用两种克隆火力，把 3 个敌人全部打中，score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 2 个新角色，打掉了 2 个敌人，score 记成了 2 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'collision', 'concurrency'], null,
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

-- blk-213 双管
-- 用两种克隆火力，把 3 个敌人全部打中，score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-213', 213,
   '双管',
   '用两种克隆火力，把 3 个敌人全部打中，score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 180,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 230,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 184,
        "y": 120,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      },
      {
        "id": "shell",
        "asset": "bomb",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 60,
        "size": 60,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            },
            {
              "value": "shell",
              "label": "炮弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 26,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 94,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "交叉火力成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用两种克隆火力，把 3 个敌人全部打中，score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 3 个新角色，打掉了 3 个敌人，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['stage', 'clone', 'collision', 'concurrency'], null,
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

-- blk-214 交叉火力
-- 用两种克隆火力，把 4 个敌人全部打中，score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-214', 214,
   '交叉火力',
   '用两种克隆火力，把 4 个敌人全部打中，score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 96,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 152,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 208,
        "y": 250,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-4",
        "asset": "enemy",
        "x": 264,
        "y": 170,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      },
      {
        "id": "shell",
        "asset": "bomb",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 60,
        "size": 60,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            },
            {
              "value": "enemy-4",
              "label": "enemy-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            },
            {
              "value": "shell",
              "label": "炮弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 30,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 92,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "交叉火力成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用两种克隆火力，把 4 个敌人全部打中，score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 3 个新角色，打掉了 3 个敌人，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'practice',
   array['stage', 'clone', 'collision', 'concurrency'], null,
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

-- blk-215 双重齐射
-- 用两种克隆火力，把 4 个敌人全部打中，score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-215', 215,
   '双重齐射',
   '用两种克隆火力，把 4 个敌人全部打中，score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 96,
        "y": 220,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 152,
        "y": 160,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 208,
        "y": 110,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-4",
        "asset": "enemy",
        "x": 264,
        "y": 260,
        "direction": 0,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      },
      {
        "id": "shell",
        "asset": "bomb",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 60,
        "size": 60,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            },
            {
              "value": "enemy-4",
              "label": "enemy-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            },
            {
              "value": "shell",
              "label": "炮弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 30,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 95,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "交叉火力成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用两种克隆火力，把 4 个敌人全部打中，score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 4 个新角色，打掉了 4 个敌人，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'typing',
   array['stage', 'clone', 'collision', 'concurrency'], null,
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

-- blk-216 飞机大战：拆解
-- 用克隆打掉 3 个敌人（score 加到 3），再把飞船开到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-216', 216,
   '飞机大战：拆解',
   '用克隆打掉 3 个敌人（score 加到 3），再把飞船开到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 80,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 120,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 160,
        "y": 250,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 104,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "飞机大战完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用克隆打掉 3 个敌人（score 加到 3），再把飞船开到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 10，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 4 个新角色，打掉了 4 个敌人，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['project', 'stage', 'clone', 'collision', 'score'], null,
   25, false)
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

-- blk-217 飞机大战：敌人
-- 用克隆打掉 3 个敌人（score 加到 3），再把飞船开到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-217', 217,
   '飞机大战：敌人',
   '用克隆打掉 3 个敌人（score 加到 3），再把飞船开到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 180,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 230,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 184,
        "y": 120,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 97,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "飞机大战完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：用克隆打掉 3 个敌人（score 加到 3），再把飞船开到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 3 个新角色，打掉了 3 个敌人，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['project', 'stage', 'clone', 'collision', 'score'], null,
   25, false)
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

-- blk-218 飞机大战：多敌
-- 用克隆打掉 4 个敌人（score 加到 4），再把飞船开到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-218', 218,
   '飞机大战：多敌',
   '用克隆打掉 4 个敌人（score 加到 4），再把飞船开到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 88,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 136,
        "y": 140,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 184,
        "y": 250,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-4",
        "asset": "enemy",
        "x": 232,
        "y": 170,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            },
            {
              "value": "enemy-4",
              "label": "enemy-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-4"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 97,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "飞机大战完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：用克隆打掉 4 个敌人（score 加到 4），再把飞船开到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 12，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 3 个新角色，打掉了 3 个敌人，score 记成了 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'new',
   array['project', 'stage', 'clone', 'collision', 'score'], null,
   25, false)
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

-- blk-219 飞机大战：终点
-- 用克隆打掉 4 个敌人（score 加到 4），再把飞船开到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-219', 219,
   '飞机大战：终点',
   '用克隆打掉 4 个敌人（score 加到 4），再把飞船开到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 96,
        "y": 220,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 152,
        "y": 160,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 208,
        "y": 110,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-4",
        "asset": "enemy",
        "x": 264,
        "y": 260,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            },
            {
              "value": "enemy-4",
              "label": "enemy-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-4"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 95,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "飞机大战完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：用克隆打掉 4 个敌人（score 加到 4），再把飞船开到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 4 个新角色，打掉了 4 个敌人，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'practice',
   array['project', 'stage', 'clone', 'collision', 'score'], null,
   25, false)
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

-- blk-220 飞机大战：完整作品
-- 用克隆打掉 5 个敌人（score 加到 5），再把飞船开到右边的小旗子
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-220', 220,
   '飞机大战：完整作品',
   '用克隆打掉 5 个敌人（score 加到 5），再把飞船开到右边的小旗子',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "night",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "ship",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "enemy-1",
        "asset": "enemy",
        "x": 96,
        "y": 200,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-2",
        "asset": "enemy",
        "x": 152,
        "y": 150,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-3",
        "asset": "enemy",
        "x": 208,
        "y": 240,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-4",
        "asset": "enemy",
        "x": 264,
        "y": 120,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "enemy-5",
        "asset": "enemy",
        "x": 320,
        "y": 260,
        "direction": 0,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [
      {
        "id": "bullet",
        "asset": "bullet",
        "spawn": {
          "x": "self",
          "y": "self"
        },
        "lifetime_steps": 45,
        "size": 50,
        "direction": 0
      }
    ],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "enemy-1",
          "options": [
            {
              "value": "enemy-1",
              "label": "enemy-1"
            },
            {
              "value": "enemy-2",
              "label": "enemy-2"
            },
            {
              "value": "enemy-3",
              "label": "enemy-3"
            },
            {
              "value": "enemy-4",
              "label": "enemy-4"
            },
            {
              "value": "enemy-5",
              "label": "enemy-5"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
      "args": []
    },
    {
      "type": "clone",
      "label": "克隆",
      "category": "控制",
      "kind": "control",
      "args": [
        {
          "name": "clone_id",
          "label": "克隆谁",
          "type": "select",
          "default": "bullet",
          "options": [
            {
              "value": "bullet",
              "label": "子弹"
            }
          ]
        }
      ]
    }
  ],
  "success_check": {
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-4"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "enemy-5"
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 20,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 5：克隆体要一直往上飞，「如果碰到」要选对敌人，每中一次只加 1 分。",
      "focus": {
        "target": "block",
        "blockType": "clone"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "飞机大战完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：用克隆打掉 5 个敌人（score 加到 5），再把飞船开到右边的小旗子。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "小精灵",
      "content": "今天请「造出新角色」来帮忙：复制出一个一模一样的角色，让它自己跑你写在里面的积木。"
    },
    {
      "type": "image_text",
      "image": "block_clone",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「克隆」。放一块「无限循环」让角色每步走 14，再放一块「克隆」：克隆出来的角色里面也放「无限循环」，先「移动」往上飞，再放一个「如果碰到」，碰到敌人就「变量增加」1 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 4 个新角色，打掉了 4 个敌人，score 记成了 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u1', 'stage', 'typing',
   array['project', 'stage', 'clone', 'collision', 'score'], 'term4_project',
   25, false)
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

-- blk-221 宝石加倍
-- 接住 2 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-221', 221,
   '宝石加倍',
   '接住 2 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 13,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 107,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」8 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，1 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "宝石加倍成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 2 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」8 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，1 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「造出新角色」，还记得怎么用吗？",
    "answer": "复制出一个一模一样的角色，让它自己跑你写在里面的积木。",
    "hint": "上一关复制出了 5 个新角色，打掉了 5 个敌人，score 记成了 5 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'condition', 'nested', 'variable'], null,
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

-- blk-222 两颗宝石
-- 接住 3 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 5
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-222', 222,
   '两颗宝石',
   '接住 3 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 5',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-3",
        "asset": "star",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            },
            {
              "value": "star-3",
              "label": "star-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 100,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，1 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 5：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "宝石加倍成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：接住 3 颗星星（1 分）和 1 颗宝石（2 分），把 score 加到 5。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，1 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'condition', 'nested', 'variable'], null,
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

-- blk-223 星星和宝石
-- 接住 2 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 6
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-223', 223,
   '星星和宝石',
   '接住 2 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 6',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 6
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 101,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，2 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 6：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "宝石加倍成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 2 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 6。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，2 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 5 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'condition', 'nested', 'variable'], null,
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

-- blk-224 宝石大道
-- 接住 3 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 7
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-224', 224,
   '宝石大道',
   '接住 3 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 7',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 180,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 319,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-3",
        "asset": "star",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            },
            {
              "value": "star-3",
              "label": "star-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 7
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 18,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 97,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，2 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 7：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "宝石加倍成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 3 颗星星（1 分）和 2 颗宝石（2 分），把 score 加到 7。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，2 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 6 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'practice',
   array['stage', 'condition', 'nested', 'variable'], null,
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

-- blk-225 满地宝石
-- 接住 4 颗星星（1 分）和 3 颗宝石（2 分），把 score 加到 10
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-225', 225,
   '满地宝石',
   '接住 4 颗星星（1 分）和 3 颗宝石（2 分），把 score 加到 10',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "star-1",
        "asset": "star",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 156,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-2",
        "asset": "star",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-3",
        "asset": "star",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-3",
        "asset": "gem",
        "x": 342,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "star-4",
        "asset": "star",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "star-1",
          "options": [
            {
              "value": "star-1",
              "label": "star-1"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "star-2",
              "label": "star-2"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            },
            {
              "value": "star-3",
              "label": "star-3"
            },
            {
              "value": "gem-3",
              "label": "gem-3"
            },
            {
              "value": "star-4",
              "label": "star-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 10
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "star-4"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 23,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 100,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，3 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 10：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "宝石加倍成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 4 颗星星（1 分）和 3 颗宝石（2 分），把 score 加到 10。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；碰到宝石的时候，条件里面再放一块「重复执行」，让它加 2 分，3 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 7 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'typing',
   array['stage', 'condition', 'nested', 'variable'], null,
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

-- blk-226 一碰两响
-- 一上一下 1 对目标，要同时碰到才算数，把 score 加到 1
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-226', 226,
   '一碰两响',
   '一上一下 1 对目标，要同时碰到才算数，把 score 加到 1',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "pair-1-up",
        "asset": "star",
        "x": 120,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-1-down",
        "asset": "coin",
        "x": 120,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "pair-1-up",
          "options": [
            {
              "value": "pair-1-up",
              "label": "pair-1-up"
            },
            {
              "value": "pair-1-down",
              "label": "pair-1-down"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 1
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-down"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 9,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 69,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 1：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "一碰两响成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：一上一下 1 对目标，要同时碰到才算数，把 score 加到 1。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 10 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'condition', 'nested'], null,
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

-- blk-227 上下夹击
-- 一上一下 2 对目标，要同时碰到才算数，把 score 加到 2
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-227', 227,
   '上下夹击',
   '一上一下 2 对目标，要同时碰到才算数，把 score 加到 2',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "pair-1-up",
        "asset": "star",
        "x": 120,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-1-down",
        "asset": "coin",
        "x": 120,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-2-up",
        "asset": "star",
        "x": 230,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-2-down",
        "asset": "coin",
        "x": 230,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "pair-1-up",
          "options": [
            {
              "value": "pair-1-up",
              "label": "pair-1-up"
            },
            {
              "value": "pair-1-down",
              "label": "pair-1-down"
            },
            {
              "value": "pair-2-up",
              "label": "pair-2-up"
            },
            {
              "value": "pair-2-down",
              "label": "pair-2-down"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-down"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-2-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-2-down"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 81,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 2：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "一碰两响成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：一上一下 2 对目标，要同时碰到才算数，把 score 加到 2。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 1 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'condition', 'nested'], null,
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

-- blk-228 同时碰到
-- 一上一下 2 对目标，要同时碰到才算数，把 score 加到 2
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-228', 228,
   '同时碰到',
   '一上一下 2 对目标，要同时碰到才算数，把 score 加到 2',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "pair-1-up",
        "asset": "star",
        "x": 120,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-1-down",
        "asset": "coin",
        "x": 120,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-2-up",
        "asset": "star",
        "x": 230,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-2-down",
        "asset": "coin",
        "x": 230,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "pair-1-up",
          "options": [
            {
              "value": "pair-1-up",
              "label": "pair-1-up"
            },
            {
              "value": "pair-1-down",
              "label": "pair-1-down"
            },
            {
              "value": "pair-2-up",
              "label": "pair-2-up"
            },
            {
              "value": "pair-2-down",
              "label": "pair-2-down"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-down"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-2-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-2-down"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 79,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 2：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "一碰两响成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：一上一下 2 对目标，要同时碰到才算数，把 score 加到 2。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 2 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'condition', 'nested'], null,
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

-- blk-229 两响合一
-- 一上一下 3 对目标，要同时碰到才算数，把 score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-229', 229,
   '两响合一',
   '一上一下 3 对目标，要同时碰到才算数，把 score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "pair-1-up",
        "asset": "star",
        "x": 120,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-1-down",
        "asset": "coin",
        "x": 120,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-2-up",
        "asset": "star",
        "x": 230,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-2-down",
        "asset": "coin",
        "x": 230,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-3-up",
        "asset": "star",
        "x": 340,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-3-down",
        "asset": "coin",
        "x": 340,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "pair-1-up",
          "options": [
            {
              "value": "pair-1-up",
              "label": "pair-1-up"
            },
            {
              "value": "pair-1-down",
              "label": "pair-1-down"
            },
            {
              "value": "pair-2-up",
              "label": "pair-2-up"
            },
            {
              "value": "pair-2-down",
              "label": "pair-2-down"
            },
            {
              "value": "pair-3-up",
              "label": "pair-3-up"
            },
            {
              "value": "pair-3-down",
              "label": "pair-3-down"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-down"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-2-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-2-down"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-3-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-3-down"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 89,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "一碰两响成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：一上一下 3 对目标，要同时碰到才算数，把 score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 2 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'practice',
   array['stage', 'condition', 'nested'], null,
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

-- blk-230 双重回响
-- 一上一下 3 对目标，要同时碰到才算数，把 score 加到 3
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-230', 230,
   '双重回响',
   '一上一下 3 对目标，要同时碰到才算数，把 score 加到 3',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "pair-1-up",
        "asset": "star",
        "x": 120,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-1-down",
        "asset": "coin",
        "x": 120,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-2-up",
        "asset": "star",
        "x": 230,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-2-down",
        "asset": "coin",
        "x": 230,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-3-up",
        "asset": "star",
        "x": 340,
        "y": 272,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "pair-3-down",
        "asset": "coin",
        "x": 340,
        "y": 310,
        "direction": 90,
        "size": 100,
        "collectible": true
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": []
  },
  "available_blocks": [
    {
      "type": "move_steps",
      "label": "移动",
      "category": "动作",
      "kind": "action",
      "args": [
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "pair-1-up",
          "options": [
            {
              "value": "pair-1-up",
              "label": "pair-1-up"
            },
            {
              "value": "pair-1-down",
              "label": "pair-1-down"
            },
            {
              "value": "pair-2-up",
              "label": "pair-2-up"
            },
            {
              "value": "pair-2-down",
              "label": "pair-2-down"
            },
            {
              "value": "pair-3-up",
              "label": "pair-3-up"
            },
            {
              "value": "pair-3-down",
              "label": "pair-3-down"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-1-down"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-2-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-2-down"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-3-up"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "pair-3-down"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 15,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 86,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」14 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "一碰两响成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：一上一下 3 对目标，要同时碰到才算数，把 score 加到 3。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」14 步，再放「如果碰到」；先检查上面的目标有没有碰到，碰到了再看下面的目标是不是也碰到了，两个都碰到才加分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'typing',
   array['stage', 'condition', 'nested'], null,
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

-- blk-231 两个角色
-- 你接住 2 枚硬币（1 分），小帮手接住 1 颗宝石（2 分），两人一起把 score 加到 4
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-231', 231,
   '两个角色',
   '你接住 2 枚硬币（1 分），小帮手接住 1 颗宝石（2 分），两人一起把 score 加到 4',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 80,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "helper",
        "asset": "bee",
        "x": 40,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "helper-work",
        "target_sprite_id": "helper",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 10
              },
              "next": {
                "type": "if_touching",
                "args": {
                  "target_sprite_id": "gem-1"
                },
                "children": [
                  {
                    "type": "repeat",
                    "args": {
                      "times": 2
                    },
                    "children": [
                      {
                        "type": "change_variable",
                        "args": {
                          "variable_id": "score",
                          "value": 1
                        },
                        "id": "helper-work-b5"
                      }
                    ],
                    "id": "helper-work-b4"
                  }
                ],
                "id": "helper-work-b3"
              },
              "id": "helper-work-b2"
            }
          ],
          "id": "helper-work-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 10,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 105,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」8 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，1 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "合作成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：你接住 2 枚硬币（1 分），小帮手接住 1 颗宝石（2 分），两人一起把 score 加到 4。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」8 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，1 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'concurrency', 'condition', 'nested'], null,
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

-- blk-232 小帮手上场
-- 你接住 3 枚硬币（1 分），小帮手接住 1 颗宝石（2 分），两人一起把 score 加到 5
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-232', 232,
   '小帮手上场',
   '你接住 3 枚硬币（1 分），小帮手接住 1 颗宝石（2 分），两人一起把 score 加到 5',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 80,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "helper",
        "asset": "bee",
        "x": 40,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "helper-work",
        "target_sprite_id": "helper",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 10
              },
              "next": {
                "type": "if_touching",
                "args": {
                  "target_sprite_id": "gem-1"
                },
                "children": [
                  {
                    "type": "repeat",
                    "args": {
                      "times": 2
                    },
                    "children": [
                      {
                        "type": "change_variable",
                        "args": {
                          "variable_id": "score",
                          "value": 1
                        },
                        "id": "helper-work-b5"
                      }
                    ],
                    "id": "helper-work-b4"
                  }
                ],
                "id": "helper-work-b3"
              },
              "id": "helper-work-b2"
            }
          ],
          "id": "helper-work-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，1 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 5：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "合作成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：你接住 3 枚硬币（1 分），小帮手接住 1 颗宝石（2 分），两人一起把 score 加到 5。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，1 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'concurrency', 'condition', 'nested'], null,
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

-- blk-233 一起得分
-- 你接住 3 枚硬币（1 分），小帮手接住 2 颗宝石（2 分），两人一起把 score 加到 7
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-233', 233,
   '一起得分',
   '你接住 3 枚硬币（1 分），小帮手接住 2 颗宝石（2 分），两人一起把 score 加到 7',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 80,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 120,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "helper",
        "asset": "bee",
        "x": 40,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "helper-work",
        "target_sprite_id": "helper",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 10
              },
              "next": {
                "type": "if_touching",
                "args": {
                  "target_sprite_id": "gem-1"
                },
                "children": [
                  {
                    "type": "repeat",
                    "args": {
                      "times": 2
                    },
                    "children": [
                      {
                        "type": "change_variable",
                        "args": {
                          "variable_id": "score",
                          "value": 1
                        },
                        "id": "helper-work-b5"
                      }
                    ],
                    "id": "helper-work-b4"
                  }
                ],
                "next": {
                  "type": "if_touching",
                  "args": {
                    "target_sprite_id": "gem-2"
                  },
                  "children": [
                    {
                      "type": "repeat",
                      "args": {
                        "times": 2
                      },
                      "children": [
                        {
                          "type": "change_variable",
                          "args": {
                            "variable_id": "score",
                            "value": 1
                          },
                          "id": "helper-work-b8"
                        }
                      ],
                      "id": "helper-work-b7"
                    }
                  ],
                  "id": "helper-work-b6"
                },
                "id": "helper-work-b3"
              },
              "id": "helper-work-b2"
            }
          ],
          "id": "helper-work-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 7
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 12,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，2 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 7：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "合作成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：你接住 3 枚硬币（1 分），小帮手接住 2 颗宝石（2 分），两人一起把 score 加到 7。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，2 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 5 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['stage', 'concurrency', 'condition', 'nested'], null,
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

-- blk-234 分工合作
-- 你接住 4 枚硬币（1 分），小帮手接住 2 颗宝石（2 分），两人一起把 score 加到 8
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-234', 234,
   '分工合作',
   '你接住 4 枚硬币（1 分），小帮手接住 2 颗宝石（2 分），两人一起把 score 加到 8',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 80,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 120,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "helper",
        "asset": "bee",
        "x": 40,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "helper-work",
        "target_sprite_id": "helper",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 10
              },
              "next": {
                "type": "if_touching",
                "args": {
                  "target_sprite_id": "gem-1"
                },
                "children": [
                  {
                    "type": "repeat",
                    "args": {
                      "times": 2
                    },
                    "children": [
                      {
                        "type": "change_variable",
                        "args": {
                          "variable_id": "score",
                          "value": 1
                        },
                        "id": "helper-work-b5"
                      }
                    ],
                    "id": "helper-work-b4"
                  }
                ],
                "next": {
                  "type": "if_touching",
                  "args": {
                    "target_sprite_id": "gem-2"
                  },
                  "children": [
                    {
                      "type": "repeat",
                      "args": {
                        "times": 2
                      },
                      "children": [
                        {
                          "type": "change_variable",
                          "args": {
                            "variable_id": "score",
                            "value": 1
                          },
                          "id": "helper-work-b8"
                        }
                      ],
                      "id": "helper-work-b7"
                    }
                  ],
                  "id": "helper-work-b6"
                },
                "id": "helper-work-b3"
              },
              "id": "helper-work-b2"
            }
          ],
          "id": "helper-work-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 8
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 94,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，2 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 8：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "合作成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：你接住 4 枚硬币（1 分），小帮手接住 2 颗宝石（2 分），两人一起把 score 加到 8。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，2 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 7 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'practice',
   array['stage', 'concurrency', 'condition', 'nested'], null,
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

-- blk-235 合作拿分
-- 你接住 4 枚硬币（1 分），小帮手接住 3 颗宝石（2 分），两人一起把 score 加到 10
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-235', 235,
   '合作拿分',
   '你接住 4 枚硬币（1 分），小帮手接住 3 颗宝石（2 分），两人一起把 score 加到 10',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-1",
        "asset": "gem",
        "x": 80,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-2",
        "asset": "gem",
        "x": 120,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "gem-3",
        "asset": "gem",
        "x": 160,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "helper",
        "asset": "bee",
        "x": 40,
        "y": 240,
        "direction": 90,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "helper-work",
        "target_sprite_id": "helper",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 10
              },
              "next": {
                "type": "if_touching",
                "args": {
                  "target_sprite_id": "gem-1"
                },
                "children": [
                  {
                    "type": "repeat",
                    "args": {
                      "times": 2
                    },
                    "children": [
                      {
                        "type": "change_variable",
                        "args": {
                          "variable_id": "score",
                          "value": 1
                        },
                        "id": "helper-work-b5"
                      }
                    ],
                    "id": "helper-work-b4"
                  }
                ],
                "next": {
                  "type": "if_touching",
                  "args": {
                    "target_sprite_id": "gem-2"
                  },
                  "children": [
                    {
                      "type": "repeat",
                      "args": {
                        "times": 2
                      },
                      "children": [
                        {
                          "type": "change_variable",
                          "args": {
                            "variable_id": "score",
                            "value": 1
                          },
                          "id": "helper-work-b8"
                        }
                      ],
                      "id": "helper-work-b7"
                    }
                  ],
                  "next": {
                    "type": "if_touching",
                    "args": {
                      "target_sprite_id": "gem-3"
                    },
                    "children": [
                      {
                        "type": "repeat",
                        "args": {
                          "times": 2
                        },
                        "children": [
                          {
                            "type": "change_variable",
                            "args": {
                              "variable_id": "score",
                              "value": 1
                            },
                            "id": "helper-work-b11"
                          }
                        ],
                        "id": "helper-work-b10"
                      }
                    ],
                    "id": "helper-work-b9"
                  },
                  "id": "helper-work-b6"
                },
                "id": "helper-work-b3"
              },
              "id": "helper-work-b2"
            }
          ],
          "id": "helper-work-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "score"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            },
            {
              "value": "gem-1",
              "label": "gem-1"
            },
            {
              "value": "gem-2",
              "label": "gem-2"
            },
            {
              "value": "gem-3",
              "label": "gem-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 10
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "gem-3"
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 14,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 94,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，3 个特殊目标一次加 2 分。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 10：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "合作成功！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：你接住 4 枚硬币（1 分），小帮手接住 3 颗宝石（2 分），两人一起把 score 加到 10。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；小帮手在上面的那一行跑，碰到宝石就加 2 分；你管下面那一行的硬币，3 个特殊目标一次加 2 分。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 8 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'typing',
   array['stage', 'concurrency', 'condition', 'nested'], null,
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

-- blk-236 吃豆人：拆解
-- 接住 3 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-236', 236,
   '吃豆人：拆解',
   '接住 3 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-1",
        "asset": "ghost",
        "x": 180,
        "y": 228,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-2",
        "asset": "ghost",
        "x": 319,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      },
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "ghost-1-fall",
        "target_sprite_id": "ghost-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "ghost-1-fall-b2"
            }
          ],
          "id": "ghost-1-fall-b1"
        }
      },
      {
        "id": "ghost-2-fall",
        "target_sprite_id": "ghost-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "ghost-2-fall-b2"
            }
          ],
          "id": "ghost-2-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "ghost-1",
              "label": "ghost-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "ghost-2",
              "label": "ghost-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 108,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "吃豆人完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 3 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」10 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 10 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['project', 'stage', 'collision', 'lives', 'condition'], null,
   25, false)
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

-- blk-237 吃豆人：金币
-- 接住 3 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-237', 237,
   '吃豆人：金币',
   '接住 3 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-1",
        "asset": "ghost",
        "x": 180,
        "y": 233,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-2",
        "asset": "ghost",
        "x": 319,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      },
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "ghost-1-fall",
        "target_sprite_id": "ghost-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "ghost-1-fall-b2"
            }
          ],
          "id": "ghost-1-fall-b1"
        }
      },
      {
        "id": "ghost-2-fall",
        "target_sprite_id": "ghost-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "ghost-2-fall-b2"
            }
          ],
          "id": "ghost-2-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "ghost-1",
              "label": "ghost-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "ghost-2",
              "label": "ghost-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 3
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 16,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 101,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 3：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "吃豆人完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "又见面啦，今天的关卡有点不一样。这一关的目标是：接住 3 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['project', 'stage', 'collision', 'lives', 'condition'], null,
   25, false)
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

-- blk-238 吃豆人：幽灵
-- 接住 4 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-238', 238,
   '吃豆人：幽灵',
   '接住 4 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-1",
        "asset": "ghost",
        "x": 156,
        "y": 243,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-2",
        "asset": "ghost",
        "x": 249,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-3",
        "asset": "ghost",
        "x": 342,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      },
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "ghost-1-fall",
        "target_sprite_id": "ghost-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "ghost-1-fall-b2"
            }
          ],
          "id": "ghost-1-fall-b1"
        }
      },
      {
        "id": "ghost-2-fall",
        "target_sprite_id": "ghost-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "ghost-2-fall-b2"
            }
          ],
          "id": "ghost-2-fall-b1"
        }
      },
      {
        "id": "ghost-3-fall",
        "target_sprite_id": "ghost-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "ghost-3-fall-b2"
            }
          ],
          "id": "ghost-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "ghost-1",
              "label": "ghost-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "ghost-2",
              "label": "ghost-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "ghost-3",
              "label": "ghost-3"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 20,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 102,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "吃豆人完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "准备好了吗？这一关我们换个工具。这一关的目标是：接住 4 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」12 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 3 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'new',
   array['project', 'stage', 'collision', 'lives', 'condition'], null,
   25, false)
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

-- blk-239 吃豆人：终点
-- 接住 4 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-239', 239,
   '吃豆人：终点',
   '接住 4 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-1",
        "asset": "ghost",
        "x": 156,
        "y": 248,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 203,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-2",
        "asset": "ghost",
        "x": 249,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 295,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-3",
        "asset": "ghost",
        "x": 342,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      },
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "ghost-1-fall",
        "target_sprite_id": "ghost-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "ghost-1-fall-b2"
            }
          ],
          "id": "ghost-1-fall-b1"
        }
      },
      {
        "id": "ghost-2-fall",
        "target_sprite_id": "ghost-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "ghost-2-fall-b2"
            }
          ],
          "id": "ghost-2-fall-b1"
        }
      },
      {
        "id": "ghost-3-fall",
        "target_sprite_id": "ghost-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "ghost-3-fall-b2"
            }
          ],
          "id": "ghost-3-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "ghost-1",
              "label": "ghost-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "ghost-2",
              "label": "ghost-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "ghost-3",
              "label": "ghost-3"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 4
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 2
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 20,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 98,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」14 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 4：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "吃豆人完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "小机器人已经等不及啦，我们开始吧。这一关的目标是：接住 4 枚金币，撞到 1 次幽灵（lives 剩 2），最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」14 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'practice',
   array['project', 'stage', 'collision', 'lives', 'condition'], null,
   25, false)
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

-- blk-240 吃豆人：完整作品
-- 接住 5 枚金币，撞到 2 次幽灵（lives 剩 1），最后踩到终点旗
--
-- 这里必须用 insert … on conflict，不能用纯 update。
-- blk-161…166 是早就存在的占位关，纯 update 会因为条件不匹配而静默跳过，
-- on conflict 让「已存在就改正文、不存在就新建」两种情况都对。
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, published, created_at, updated_at,
   term_id, unit_id, scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
values
  ('blockly', 'blk-240', 240,
   '吃豆人：完整作品',
   '接住 5 枚金币，撞到 2 次幽灵（lives 剩 1），最后踩到终点旗',
   $body$
{
  "schema_version": 2,
  "scene_type": "stage",
  "scene": {
    "backdrop": "grass",
    "stage_size": {
      "width": 480,
      "height": 360
    },
    "sprites": [
      {
        "id": "player",
        "asset": "player",
        "x": 40,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": false
      },
      {
        "id": "coin-1",
        "asset": "coin",
        "x": 110,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-1",
        "asset": "ghost",
        "x": 145,
        "y": 253,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-2",
        "asset": "coin",
        "x": 180,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-2",
        "asset": "ghost",
        "x": 214,
        "y": 228,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-3",
        "asset": "coin",
        "x": 249,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-3",
        "asset": "ghost",
        "x": 284,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-4",
        "asset": "coin",
        "x": 319,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "ghost-4",
        "asset": "ghost",
        "x": 353,
        "y": 0,
        "direction": 180,
        "size": 100,
        "collectible": true
      },
      {
        "id": "coin-5",
        "asset": "coin",
        "x": 388,
        "y": 300,
        "direction": 90,
        "size": 100,
        "collectible": true
      },
      {
        "id": "goal",
        "asset": "goal",
        "x": 448,
        "y": 236,
        "direction": 0,
        "size": 100,
        "collectible": false
      }
    ],
    "clones": [],
    "variables": [
      {
        "id": "score",
        "name": "score",
        "initial": 0,
        "scope": "global"
      },
      {
        "id": "lives",
        "name": "lives",
        "initial": 3,
        "scope": "global"
      }
    ],
    "broadcasts": [],
    "initial_scripts": [
      {
        "id": "ghost-1-fall",
        "target_sprite_id": "ghost-1",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "ghost-1-fall-b2"
            }
          ],
          "id": "ghost-1-fall-b1"
        }
      },
      {
        "id": "ghost-2-fall",
        "target_sprite_id": "ghost-2",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 5
              },
              "id": "ghost-2-fall-b2"
            }
          ],
          "id": "ghost-2-fall-b1"
        }
      },
      {
        "id": "ghost-3-fall",
        "target_sprite_id": "ghost-3",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "ghost-3-fall-b2"
            }
          ],
          "id": "ghost-3-fall-b1"
        }
      },
      {
        "id": "ghost-4-fall",
        "target_sprite_id": "ghost-4",
        "block": {
          "type": "forever",
          "args": {},
          "children": [
            {
              "type": "move_steps",
              "args": {
                "steps": 3
              },
              "id": "ghost-4-fall-b2"
            }
          ],
          "id": "ghost-4-fall-b1"
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
        {
          "name": "steps",
          "label": "步数",
          "type": "number",
          "default": 10,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "set_variable",
      "label": "设置变量",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "设为",
          "type": "number",
          "default": 0,
          "min": -100,
          "max": 100,
          "step": 1
        }
      ]
    },
    {
      "type": "change_variable",
      "label": "变量增加",
      "category": "变量",
      "kind": "action",
      "args": [
        {
          "name": "variable_id",
          "label": "变量",
          "type": "variable",
          "default": "lives"
        },
        {
          "name": "value",
          "label": "增加",
          "type": "number",
          "default": 1,
          "min": -100,
          "max": 100,
          "step": 1
        }
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
          "default": "coin-1",
          "options": [
            {
              "value": "coin-1",
              "label": "coin-1"
            },
            {
              "value": "ghost-1",
              "label": "ghost-1"
            },
            {
              "value": "coin-2",
              "label": "coin-2"
            },
            {
              "value": "ghost-2",
              "label": "ghost-2"
            },
            {
              "value": "coin-3",
              "label": "coin-3"
            },
            {
              "value": "ghost-3",
              "label": "ghost-3"
            },
            {
              "value": "coin-4",
              "label": "coin-4"
            },
            {
              "value": "ghost-4",
              "label": "ghost-4"
            },
            {
              "value": "coin-5",
              "label": "coin-5"
            }
          ]
        }
      ]
    },
    {
      "type": "forever",
      "label": "无限循环",
      "category": "控制",
      "kind": "control",
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
    "type": "all",
    "conditions": [
      {
        "type": "variable_value",
        "variable_id": "score",
        "op": "==",
        "value": 5
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-1"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-2"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-3"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-4"
      },
      {
        "type": "sprite_hidden",
        "sprite_id": "coin-5"
      },
      {
        "type": "variable_value",
        "variable_id": "lives",
        "op": "==",
        "value": 1
      },
      {
        "type": "sprite_at",
        "sprite_id": "player",
        "x": 448,
        "y": 300
      }
    ]
  },
  "workspace": {
    "initial_blocks": [],
    "max_blocks": 24,
    "require_connected": false
  },
  "runtime": {
    "out_of_bounds": "blocked",
    "max_steps": 100,
    "stop_on_success": true,
    "move_duration_ms": 0
  },
  "hints": [
    {
      "trigger": "initial",
      "text": "先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」14 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    },
    {
      "trigger": "not_completed",
      "text": "score 要正好等于 5：先检查外层条件，再照着里面的写法做，别把两层积木放反了。",
      "focus": {
        "target": "block",
        "blockType": "if_touching"
      }
    }
  ],
  "completion": {
    "stars": 3,
    "success_text": "吃豆人完成！"
  },
  "intro_story": [
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "欢迎回来！我们再试一个新本领。这一关的目标是：接住 5 枚金币，撞到 2 次幽灵（lives 剩 1），最后踩到终点旗。"
    },
    {
      "type": "image_text",
      "image": "stage",
      "speaker": "小精灵",
      "content": "欢迎来到自由舞台！舞台上的角色会一直往一个方向走，不会撞墙转弯，所以我们要算好时间。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "小精灵",
      "content": "今天请「条件套条件」来帮忙：条件积木里面还能再放积木，判断可以一层一层叠起来。"
    },
    {
      "type": "image_text",
      "image": "block_if",
      "speaker": "机器人",
      "content": "这一关真正要用的就是「如果碰到」。先用「设置变量」把 score 清成 0，再放「无限循环」：里面先放「移动」14 步，再放「如果碰到」；碰到幽灵要扣一条命，幽灵掉下来的时间要算好。"
    },
    {
      "type": "text",
      "speaker": "小精灵",
      "content": "把积木拖到工作区，连好，再点「运行」，我就能走完啦！"
    }
  ],
  "review": {
    "question": "上一关我们学了「条件套条件」，还记得怎么用吗？",
    "answer": "条件积木里面还能再放积木，判断可以一层一层叠起来。",
    "hint": "上一关用了条件套条件，一共拿到 4 分。"
  }
}
  $body$::jsonb,
   true, now(), now(),
   'blk-g2-spring', 'blk-g2-spring-u2', 'stage', 'typing',
   array['project', 'stage', 'collision', 'lives', 'condition'], 'term4_master',
   25, false)
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
-- A. 二年级两个学期各 40 关，都是真实正文
-- select term_id, count(*) from public.module_level
-- where module_id = 'blockly' and term_id in ('blk-g2-fall', 'blk-g2-spring') and is_placeholder = false
-- group by term_id;
--
-- B. 编号连续，场景类型都是 stage
-- select term_id, min(sort_order), max(sort_order), count(*)
-- from public.module_level where module_id = 'blockly'
--   and term_id in ('blk-g2-fall', 'blk-g2-spring')
-- group by term_id order by min(sort_order);
--
-- C. 没有关卡游离在单元之外
-- select count(*) from public.module_level
-- where module_id = 'blockly' and term_id in ('blk-g2-fall', 'blk-g2-spring')
--   and unit_id not like 'blk-g2-%';
--
-- D. 正文里的 scene_type 与列一致
-- select level_id from public.module_level ml
-- where ml.module_id = 'blockly' and ml.scene_type <> ml.body->>'scene_type';
--
-- E. 每关都有复习卡
-- select count(*) from public.module_level
-- where module_id = 'blockly' and term_id in ('blk-g2-fall', 'blk-g2-spring')
--   and body->'review' is null;
--
-- F. 学习记录没有指向不存在关卡的行
-- select lr.level_id, count(*) from public.learning_record lr
-- where lr.module_id = 'blockly'
--   and not exists (select 1 from public.module_level ml
--                   where ml.module_id = 'blockly' and ml.level_id = lr.level_id)
-- group by lr.level_id;
