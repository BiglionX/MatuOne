-- 第 1 单元第 16–18 节补上正文。按序号更新已有行，不新开课，也不删除。

update public.course_level
set title = '问候和正方形放一起',
    goal = '先 print 一句问候，再画一个正方形',
    knowledge_tags = array['print', 'forward', 'for_loop'],
    level_type = 'practice',
    body = $lesson16${
      "level_id": "L16",
      "order": 16,
      "title": "问候和正方形放一起",
      "goal": "先 print 一句问候，再画一个正方形",
      "level_type": "normal",
      "demo_code": "print(\"你好\")\nfor i in range(4):\n    t.forward(80)\n    t.right(90)",
      "expected_output": "你好\n一个正方形",
      "preview_kind": "turtle",
      "teach_code_lines": ["print(\"你好\")", "for i in range(4):", "    t.forward(80)", "    t.right(90)"],
      "line_notes": ["先打印一句问候", "把画一条边重复 4 次", "每条边向前走 80", "走完向右转 90 度"],
      "keywords": ["print(\"你好\")", "for", "range(4)", "t.forward(80)"],
      "challenge_params": [{
        "name": "word",
        "label": "问候换一句",
        "type": "select",
        "default": "你好",
        "options": [{"value": "你好", "label": "你好"}, {"value": "加油", "label": "加油"}],
        "apply": {"kind": "arg", "func": "print", "argIndex": 0},
        "hint": "引号里的字会先出现在屏幕上。"
      }],
      "error_mappings": [],
      "quiz": {
        "question": "这段代码先做什么，再做什么？",
        "options": ["先打印问候，再画正方形", "只画正方形", "只打印一句话"],
        "answerIndex": 0,
        "explain": "print 先把问候打出来，for 再把正方形的四条边画完。"
      },
      "estimated_minutes": 15
    }$lesson16$::jsonb,
    updated_at = now()
where sort_order = 16;

update public.course_level
set title = '把问候装进变量',
    goal = '写下 name = "你好"，再用 print(name) 打印出来',
    knowledge_tags = array['variable', 'print'],
    level_type = 'new',
    body = $lesson17${
      "level_id": "L17",
      "order": 17,
      "title": "把问候装进变量",
      "goal": "写下 name = \"你好\"，再用 print(name) 打印出来",
      "level_type": "normal",
      "demo_code": "name = \"你好\"\nprint(name)",
      "expected_output": "你好",
      "preview_kind": "text",
      "teach_code_lines": ["name = \"你好\"", "print(name)"],
      "line_notes": ["把问候装进变量 name", "打印变量里的那句话"],
      "keywords": ["name", "name = \"你好\"", "print(name)"],
      "challenge_params": [{
        "name": "name",
        "label": "把问候换一句",
        "type": "select",
        "default": "你好",
        "options": [
          {"value": "你好", "label": "你好"},
          {"value": "加油", "label": "加油"},
          {"value": "早上好", "label": "早上好"}
        ],
        "apply": {"kind": "assign", "variable": "name"},
        "hint": "改的是变量里的话，print 会把新的一句打出来。"
      }],
      "error_mappings": [],
      "quiz": {
        "question": "print(name) 打印出来的是什么？",
        "options": ["变量 name 里装的那句话", "变量的名字 name", "一个正方形"],
        "answerIndex": 0,
        "explain": "name = \"你好\" 把这句话装进变量，print(name) 再把它打印出来。"
      },
      "estimated_minutes": 15
    }$lesson17$::jsonb,
    updated_at = now()
where sort_order = 17;

update public.course_level
set title = '改问候、改边长',
    goal = '把问候和边长两个变量都改一次，再跑一遍',
    knowledge_tags = array['variable', 'print', 'forward'],
    level_type = 'practice',
    body = $lesson18${
      "level_id": "L18",
      "order": 18,
      "title": "改问候、改边长",
      "goal": "把问候和边长两个变量都改一次，再跑一遍",
      "level_type": "normal",
      "demo_code": "name = \"你好\"\nside = 80\nprint(name)\nfor i in range(4):\n    t.forward(side)\n    t.right(90)",
      "expected_output": "你好\n一个正方形",
      "preview_kind": "turtle",
      "teach_code_lines": ["name = \"你好\"", "side = 80", "print(name)", "for i in range(4):", "    t.forward(side)", "    t.right(90)"],
      "line_notes": ["问候装进 name", "边长装进 side", "打印问候", "重复画 4 条边", "边长用 side", "转弯 90 度"],
      "keywords": ["name", "side", "print(name)", "t.forward(side)"],
      "challenge_params": [
        {
          "name": "name",
          "label": "问候换一句",
          "type": "select",
          "default": "你好",
          "options": [{"value": "你好", "label": "你好"}, {"value": "加油", "label": "加油"}],
          "apply": {"kind": "assign", "variable": "name"},
          "hint": "改这一句，屏幕上的问候会跟着变。"
        },
        {
          "name": "side",
          "label": "边长改一改",
          "type": "number",
          "min": 40,
          "max": 140,
          "step": 20,
          "default": 80,
          "apply": {"kind": "assign", "variable": "side"},
          "hint": "改这个数字，正方形的四条边一起变长。"
        }
      ],
      "error_mappings": [],
      "quiz": {
        "question": "想让正方形变大，要改哪里？",
        "options": ["改 side 里的数字", "改 name 里的问候", "把 range(4) 改成 range(40)"],
        "answerIndex": 0,
        "explain": "side 装着边长，forward 用的就是这个数。"
      },
      "estimated_minutes": 20
    }$lesson18$::jsonb,
    updated_at = now()
where sort_order = 18;
