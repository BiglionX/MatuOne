-- Blockly 绘本情境导入样板：blk-001 … blk-005
--
-- 这个文件由 scripts/generate-blockly-80.mjs 生成，不要手工改：
--   npx tsx scripts/generate-blockly-80.mjs
--
-- 正文（body）里多两个可选字段：
--   intro_story —— 绘本体数组，3 到 5 页，每页一句说明。
--                  type 取 text（纯文字）或 image_text（文字配图），
--                  image 是插画标识；现在是占位符，教研老师换成真实图片路径即可。
--   review      —— 课前复习卡，内容是上一关的核心知识点。
--
-- 两个字段都是可选的：没配的关卡进关时直接进工作区，老流程一点不变。
--
-- 这里用 body || jsonb 只补这两个键，场景、积木、提示一概不动；
-- 固定值写入，重跑即可。

-- blk-001 小小出发
-- 把 1 块「前进」积木连起来，让机器人一条直线走到终点
update public.module_level
set
  body = body || $story${
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
}$story$::jsonb,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-001';

-- blk-002 再走一步
-- 把 2 块「前进」积木连起来，让机器人一条直线走到终点
update public.module_level
set
  body = body || $story${
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
}$story$::jsonb,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-002';

-- blk-003 三格直线
-- 把 3 块「前进」积木连起来，让机器人一条直线走到终点
update public.module_level
set
  body = body || $story${
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
}$story$::jsonb,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-003';

-- blk-004 四格不回头
-- 把 4 块「前进」积木连起来，让机器人一条直线走到终点
update public.module_level
set
  body = body || $story${
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
}$story$::jsonb,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-004';

-- blk-005 五格长廊
-- 把 5 块「前进」积木连起来，让机器人一条直线走到终点
update public.module_level
set
  body = body || $story${
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
}$story$::jsonb,
  updated_at = now()
where module_id = 'blockly'
  and level_id = 'blk-005';

-- 验收 SQL（迁移后逐条跑）
--
-- A. 前 5 关都写上了绘本
-- select level_id, jsonb_array_length(body->'intro_story') as pages, body->'review'->>'question' as question
-- from public.module_level
-- where module_id = 'blockly' and level_id in ('blk-001','blk-002','blk-003','blk-004','blk-005')
-- order by level_id;
--
-- B. 没有绘本的老关卡不受影响（intro_story 为空）
-- select count(*) from public.module_level
-- where module_id = 'blockly' and body->'intro_story' is null;
