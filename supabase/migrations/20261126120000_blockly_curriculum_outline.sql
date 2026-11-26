-- Blockly 两年期课程线的大纲数据：4 个学期 × 5 个单元 = 20 个单元，60 个课时占位。
--
-- 编号约定
--   学期 term_id   blk-g1-fall / blk-g1-spring / blk-g2-fall / blk-g2-spring
--   单元 unit_id   {term_id}-u{n}
--   课时 level_id  blk-001 … blk-060，课程线内线性编号
--
-- 学期划分
--   一年级上 001-015  计算思维启蒙   顺序 / 转弯 / 循环 / 条件      网格闯关
--   一年级下 016-030  逻辑进阶       变量计分 / 多条件 / 自定义函数  带交互网格
--   二年级上 031-045  简单游戏项目    舞台 / 外观 / 随机 / 碰撞       2 个小游戏
--   二年级下 046-060  复杂游戏项目    多角色 / 克隆 / 广播 / 计分     1 个大游戏
--
-- 学期一的单元切分是 2/2/2/5/4，其余学期是 3/3/3/3/3：
-- 前 6 关（直走 → L 型转弯 → 长直道 → 画正方形 → 遇墙转弯 → 走迷宫）正好落在三个单元的边界上，
-- 后面两个单元是巩固练习和学期作品。
--
-- 本文件只写大纲元数据。blk-001 到 blk-006 的真实正文在 20261126130000_blockly_level_1_6_body_v2.sql。
-- 其余 54 关写的是最小可解析的占位正文（is_placeholder = true），教研写好后再逐关替换。
-- Neon 跨语句没有事务，每条语句都写成幂等的，重跑即可。


-- 1. 学期
insert into public.module_term
  (module_id, term_id, title, stage_label, term_code, sort_order, weeks, level_cap, summary)
values
  ('blockly', 'blk-g1-fall', '一年级上', '一年级', 'fall', 1, 15, 15,
   '计算思维启蒙：顺序、转弯、循环、条件。形式是网格闯关。'),
  ('blockly', 'blk-g1-spring', '一年级下', '一年级', 'spring', 2, 15, 15,
   '逻辑进阶：变量计分、多条件判断、自定义函数。形式是带一点交互的网格闯关。'),
  ('blockly', 'blk-g2-fall', '二年级上', '二年级', 'fall', 3, 15, 15,
   '简单游戏项目开发：自由舞台、角色外观、随机数、碰撞检测。完成 2 个简单小游戏。'),
  ('blockly', 'blk-g2-spring', '二年级下', '二年级', 'spring', 4, 15, 15,
   '复杂游戏项目开发：多角色协作、克隆、广播事件、计分系统。完成 1 个大游戏。')
on conflict (module_id, term_id) do update set
  title = excluded.title,
  stage_label = excluded.stage_label,
  term_code = excluded.term_code,
  sort_order = excluded.sort_order,
  weeks = excluded.weeks,
  level_cap = excluded.level_cap,
  summary = excluded.summary,
  updated_at = now();


-- 2. 单元
insert into public.module_unit
  (module_id, unit_id, term_id, title, summary, scene_form, knowledge_tags, level_cap, sort_order)
values
  -- 一年级上
  ('blockly', 'blk-g1-fall-u1', 'blk-g1-fall', '走和转',
   '顺序前进和转向，先让机器人动起来。', 'grid',
   array['sequence', 'move', 'turn'], 2, 1),
  ('blockly', 'blk-g1-fall-u2', 'blk-g1-fall', '循环和嵌套',
   '用重复执行走长道，用内外两层循环绕出正方形。', 'grid',
   array['loop', 'nested_loop'], 2, 2),
  ('blockly', 'blk-g1-fall-u3', 'blk-g1-fall', '条件和综合',
   '遇到墙就转弯，最后走出一个弯弯绕绕的迷宫。', 'grid',
   array['condition', 'if'], 2, 3),
  ('blockly', 'blk-g1-fall-u4', 'blk-g1-fall', '巩固练习',
   '把顺序、转弯、循环和条件混合起来练熟。', 'grid',
   array['sequence', 'turn', 'loop', 'condition'], 5, 4),
  ('blockly', 'blk-g1-fall-u5', 'blk-g1-fall', '学期作品',
   '自己设计一条路线，完成学期作品和期末挑战。', 'grid',
   array['project', 'design'], 4, 5),
  -- 一年级下
  ('blockly', 'blk-g1-spring-u1', 'blk-g1-spring', '变量是个小盒子',
   '认识变量，学会给变量赋值和改变它。', 'grid_interactive',
   array['variable', 'assignment'], 3, 1),
  ('blockly', 'blk-g1-spring-u2', 'blk-g1-spring', '分数怎么算',
   '用变量记分数，加减分数，找出最高分。', 'grid_interactive',
   array['score', 'variable'], 3, 2),
  ('blockly', 'blk-g1-spring-u3', 'blk-g1-spring', '多个条件一起用',
   '并且、或者和多路分支，把判断写得更细。', 'grid_interactive',
   array['condition', 'and', 'or'], 3, 3),
  ('blockly', 'blk-g1-spring-u4', 'blk-g1-spring', '自己的小帮手',
   '定义自己的积木函数，带上参数再调用。', 'grid_interactive',
   array['function', 'parameter'], 3, 4),
  ('blockly', 'blk-g1-spring-u5', 'blk-g1-spring', '逻辑大挑战',
   '综合运用变量、条件和函数，完成学期作品。', 'grid_interactive',
   array['project', 'variable', 'condition'], 3, 5),
  -- 二年级上
  ('blockly', 'blk-g2-fall-u1', 'blk-g2-fall', '舞台和角色',
   '认识舞台，把角色放到舞台上并让它动起来。', 'stage',
   array['stage', 'sprite', 'coordinate'], 3, 1),
  ('blockly', 'blk-g2-fall-u2', 'blk-g2-fall', '角色换装',
   '切换造型，改变大小，加上特效和说话。', 'stage',
   array['costume', 'size', 'effect'], 3, 2),
  ('blockly', 'blk-g2-fall-u3', 'blk-g2-fall', '随机的小惊喜',
   '用随机数决定出现的位置和节奏。', 'stage',
   array['random'], 3, 3),
  ('blockly', 'blk-g2-fall-u4', 'blk-g2-fall', '碰到了怎么办',
   '碰撞检测，碰到就加分，学会躲开危险。', 'stage',
   array['collision', 'score'], 3, 4),
  ('blockly', 'blk-g2-fall-u5', 'blk-g2-fall', '我的第一个小游戏',
   '拆解并完成接苹果和打地鼠两个小游戏。', 'stage',
   array['project', 'game'], 3, 5),
  -- 二年级下
  ('blockly', 'blk-g2-spring-u1', 'blk-g2-spring', '角色会说话',
   '多角色协作，用广播在角色之间传消息。', 'stage',
   array['sprite', 'broadcast'], 3, 1),
  ('blockly', 'blk-g2-spring-u2', 'blk-g2-spring', '复制出新角色',
   '用克隆复制角色，让每个克隆体自己行动。', 'stage',
   array['clone'], 3, 2),
  ('blockly', 'blk-g2-spring-u3', 'blk-g2-spring', '一起跑起来',
   '事件驱动，让多段程序同时运行。', 'stage',
   array['event', 'concurrency'], 3, 3),
  ('blockly', 'blk-g2-spring-u4', 'blk-g2-spring', '分数和规则',
   '生命值、计分板和胜负判定。', 'stage',
   array['lives', 'score', 'rule'], 3, 4),
  ('blockly', 'blk-g2-spring-u5', 'blk-g2-spring', '大型项目：飞机大战',
   '拆解并完成一个完整的飞机大战游戏。', 'stage',
   array['project', 'game'], 3, 5)
on conflict (module_id, unit_id) do update set
  term_id = excluded.term_id,
  title = excluded.title,
  summary = excluded.summary,
  scene_form = excluded.scene_form,
  knowledge_tags = excluded.knowledge_tags,
  level_cap = excluded.level_cap,
  sort_order = excluded.sort_order,
  updated_at = now();


-- 3. 课时（60 关占位）
-- level_type 与 Python 侧 course_level.level_type 同口径：new / practice / project / typing。
-- milestone_badge 每个学期只在学期作品上发一枚。
-- scene_type 是关卡级的运行时形态，只有 grid（网格闯关）和 stage（自由舞台）两种；
-- 「带一点交互」这种单元形态记在 module_unit.scene_form 上，不下放到关卡。
with lvl(level_id, sort_order, term_id, unit_id, title, goal, level_type, tags, badge, minutes, scene_type) as (
  values
    -- 一年级上 · U1 走和转
    ('blk-001', 1, 'blk-g1-fall', 'blk-g1-fall-u1', '直走',
     '把“前进”积木拖到工作区，让机器人从起点走到终点', 'new',
     array['sequence', 'move'], null::text, 15, 'grid'),
    ('blk-002', 2, 'blk-g1-fall', 'blk-g1-fall-u1', 'L 型路线',
     '向前走三步，右转，再走三步到达终点', 'new',
     array['sequence', 'turn'], null::text, 15, 'grid'),
    -- 一年级上 · U2 循环和嵌套
    ('blk-003', 3, 'blk-g1-fall', 'blk-g1-fall-u2', '长直道',
     '用“重复执行”积木走完一条长直道', 'new',
     array['loop'], null::text, 15, 'grid'),
    ('blk-004', 4, 'blk-g1-fall', 'blk-g1-fall-u2', '画正方形',
     '用内外两层循环绕出一个正方形，再走到终点', 'new',
     array['loop', 'nested_loop'], null::text, 15, 'grid'),
    -- 一年级上 · U3 条件和综合
    ('blk-005', 5, 'blk-g1-fall', 'blk-g1-fall-u3', '遇墙转弯',
     '前面有墙就右转，一直走到终点', 'new',
     array['condition', 'loop'], null::text, 15, 'grid'),
    ('blk-006', 6, 'blk-g1-fall', 'blk-g1-fall-u3', '走迷宫',
     '用重复和转弯，走出弯弯绕绕的迷宫', 'project',
     array['sequence', 'turn', 'loop', 'condition'], 'first_maze', 20, 'grid'),
    -- 一年级上 · U4 巩固练习
    ('blk-007', 7, 'blk-g1-fall', 'blk-g1-fall-u4', '多走两格',
     '连续用两块“前进”，让机器人一次走完两步', 'practice',
     array['sequence', 'move'], null::text, 15, 'grid'),
    ('blk-008', 8, 'blk-g1-fall', 'blk-g1-fall-u4', '左转和右转',
     '分别用左转和右转各走出一条路线', 'practice',
     array['turn'], null::text, 15, 'grid'),
    ('blk-009', 9, 'blk-g1-fall', 'blk-g1-fall-u4', '绕一圈',
     '用循环和转弯，让机器人绕矩形走一圈', 'practice',
     array['loop', 'turn'], null::text, 15, 'grid'),
    ('blk-010', 10, 'blk-g1-fall', 'blk-g1-fall-u4', '撞墙就停',
     '让机器人撞到墙之前先停下来', 'practice',
     array['condition'], null::text, 15, 'grid'),
    ('blk-011', 11, 'blk-g1-fall', 'blk-g1-fall-u4', '复习闯关',
     '把这一学期学过的积木混合起来闯一关', 'practice',
     array['sequence', 'turn', 'loop', 'condition'], null::text, 15, 'grid'),
    -- 一年级上 · U5 学期作品
    ('blk-012', 12, 'blk-g1-fall', 'blk-g1-fall-u5', '路线设计',
     '自己设计一条路线，先在纸上画出来再写程序', 'new',
     array['design', 'sequence'], null::text, 20, 'grid'),
    ('blk-013', 13, 'blk-g1-fall', 'blk-g1-fall-u5', '多段路线',
     '用循环和转弯把长路线拼出来', 'new',
     array['loop', 'turn'], null::text, 20, 'grid'),
    ('blk-014', 14, 'blk-g1-fall', 'blk-g1-fall-u5', '我的第一个作品',
     '自己选一条路线，写出完整程序走到底', 'project',
     array['project', 'sequence', 'loop'], null::text, 20, 'grid'),
    ('blk-015', 15, 'blk-g1-fall', 'blk-g1-fall-u5', '期末挑战',
     '在限定积木数量内完成最难的一条路线', 'project',
     array['project', 'sequence', 'turn', 'loop', 'condition'], 'term1_master', 25, 'grid'),
    -- 一年级下 · U1 变量是个小盒子
    ('blk-016', 16, 'blk-g1-spring', 'blk-g1-spring-u1', '新建一个变量',
     '做一个小盒子，把一个数字放进去', 'new',
     array['variable'], null::text, 15, 'grid'),
    ('blk-017', 17, 'blk-g1-spring', 'blk-g1-spring-u1', '给变量换个值',
     '把盒子里的数字换成新的，再把它读出来', 'new',
     array['variable', 'assignment'], null::text, 15, 'grid'),
    ('blk-018', 18, 'blk-g1-spring', 'blk-g1-spring-u1', '变量跟着走',
     '让机器人每走一步就把变量加一', 'practice',
     array['variable', 'loop'], null::text, 15, 'grid'),
    -- 一年级下 · U2 分数怎么算
    ('blk-019', 19, 'blk-g1-spring', 'blk-g1-spring-u2', '分数加一',
     '每走到一个目标就给分数加一', 'new',
     array['score', 'variable'], null::text, 15, 'grid'),
    ('blk-020', 20, 'blk-g1-spring', 'blk-g1-spring-u2', '分数减一',
     '撞到障碍就扣掉一分', 'new',
     array['score', 'variable'], null::text, 15, 'grid'),
    ('blk-021', 21, 'blk-g1-spring', 'blk-g1-spring-u2', '最高分是多少',
     '走完一轮后读出这一轮的最高分', 'practice',
     array['score', 'variable'], null::text, 15, 'grid'),
    -- 一年级下 · U3 多个条件一起用
    ('blk-022', 22, 'blk-g1-spring', 'blk-g1-spring-u3', '两个条件都要满足',
     '只有同时满足两个条件时才加分', 'new',
     array['condition', 'and'], null::text, 15, 'grid'),
    ('blk-023', 23, 'blk-g1-spring', 'blk-g1-spring-u3', '满足一个就行',
     '两个条件里有一个成立就可以', 'new',
     array['condition', 'or'], null::text, 15, 'grid'),
    ('blk-024', 24, 'blk-g1-spring', 'blk-g1-spring-u3', '三档判断',
     '把分数分成三档，每档走不同的路线', 'practice',
     array['condition'], null::text, 15, 'grid'),
    -- 一年级下 · U4 自己的小帮手
    ('blk-025', 25, 'blk-g1-spring', 'blk-g1-spring-u4', '定义一个小帮手',
     '把重复的一段动作做成自己的积木', 'new',
     array['function'], null::text, 15, 'grid'),
    ('blk-026', 26, 'blk-g1-spring', 'blk-g1-spring-u4', '叫小帮手来干活',
     '在自己的程序里调用刚定义的小帮手', 'new',
     array['function', 'call'], null::text, 15, 'grid'),
    ('blk-027', 27, 'blk-g1-spring', 'blk-g1-spring-u4', '带参数的小帮手',
     '给小帮手带上不同的数字，做出不同的动作', 'practice',
     array['function', 'parameter'], null::text, 15, 'grid'),
    -- 一年级下 · U5 逻辑大挑战
    ('blk-028', 28, 'blk-g1-spring', 'blk-g1-spring-u5', '复习闯关',
     '把变量、条件和函数混合起来闯一关', 'practice',
     array['variable', 'condition', 'function'], null::text, 20, 'grid'),
    ('blk-029', 29, 'blk-g1-spring', 'blk-g1-spring-u5', '综合挑战',
     '在限定积木数量内同时用到变量和条件', 'new',
     array['variable', 'condition'], null::text, 20, 'grid'),
    ('blk-030', 30, 'blk-g1-spring', 'blk-g1-spring-u5', '计分小游戏',
     '做一个能加分、能扣分、能显示分数的小游戏', 'project',
     array['project', 'score', 'variable', 'function'], 'term2_master', 25, 'grid'),
    -- 二年级上 · U1 舞台和角色
    ('blk-031', 31, 'blk-g2-fall', 'blk-g2-fall-u1', '认识舞台',
     '认识舞台的坐标，把角色放到指定位置', 'new',
     array['stage', 'coordinate'], null::text, 15, 'stage'),
    ('blk-032', 32, 'blk-g2-fall', 'blk-g2-fall-u1', '让角色出场',
     '让角色出现在舞台上并开始动', 'new',
     array['stage', 'sprite'], null::text, 15, 'stage'),
    ('blk-033', 33, 'blk-g2-fall', 'blk-g2-fall-u1', '角色走一走',
     '用方向键让角色在舞台上移动', 'practice',
     array['sprite', 'event'], null::text, 15, 'stage'),
    -- 二年级上 · U2 角色换装
    ('blk-034', 34, 'blk-g2-fall', 'blk-g2-fall-u2', '换个造型',
     '给角色准备两个造型，按条件切换', 'new',
     array['costume'], null::text, 15, 'stage'),
    ('blk-035', 35, 'blk-g2-fall', 'blk-g2-fall-u2', '变大变小',
     '让角色在不同时候有不同大小', 'new',
     array['size'], null::text, 15, 'stage'),
    ('blk-036', 36, 'blk-g2-fall', 'blk-g2-fall-u2', '说一句话',
     '让角色在舞台上显示一句话', 'practice',
     array['effect', 'say'], null::text, 15, 'stage'),
    -- 二年级上 · U3 随机的小惊喜
    ('blk-037', 37, 'blk-g2-fall', 'blk-g2-fall-u3', '随机一个数',
     '让电脑随机给出一个数字', 'new',
     array['random'], null::text, 15, 'stage'),
    ('blk-038', 38, 'blk-g2-fall', 'blk-g2-fall-u3', '随机换个地方',
     '让角色每次都出现在不同位置', 'new',
     array['random', 'coordinate'], null::text, 15, 'stage'),
    ('blk-039', 39, 'blk-g2-fall', 'blk-g2-fall-u3', '随机节奏',
     '用随机数决定角色下一次动得多快', 'practice',
     array['random', 'loop'], null::text, 15, 'stage'),
    -- 二年级上 · U4 碰到了怎么办
    ('blk-040', 40, 'blk-g2-fall', 'blk-g2-fall-u4', '碰到就加分',
     '角色接到苹果时给它加分', 'new',
     array['collision', 'score'], null::text, 15, 'stage'),
    ('blk-041', 41, 'blk-g2-fall', 'blk-g2-fall-u4', '躲开危险',
     '碰到炸弹时让角色退回去', 'new',
     array['collision', 'condition'], null::text, 15, 'stage'),
    ('blk-042', 42, 'blk-g2-fall', 'blk-g2-fall-u4', '接住三个',
     '一局之内连续接住三个苹果', 'practice',
     array['collision', 'score', 'condition'], null::text, 15, 'stage'),
    -- 二年级上 · U5 我的第一个小游戏
    ('blk-043', 43, 'blk-g2-fall', 'blk-g2-fall-u5', '接苹果：拆解',
     '把接苹果这个游戏拆成几个步骤', 'new',
     array['project', 'design'], null::text, 20, 'stage'),
    ('blk-044', 44, 'blk-g2-fall', 'blk-g2-fall-u5', '接苹果：完成',
     '做出一个能玩的接苹果小游戏', 'project',
     array['project', 'collision', 'score', 'random'], null::text, 25, 'stage'),
    ('blk-045', 45, 'blk-g2-fall', 'blk-g2-fall-u5', '打地鼠：完成',
     '做出一个能玩的打地鼠小游戏', 'project',
     array['project', 'collision', 'random', 'score'], 'term3_master', 25, 'stage'),
    -- 二年级下 · U1 角色会说话
    ('blk-046', 46, 'blk-g2-spring', 'blk-g2-spring-u1', '第二个角色登场',
     '在同一个舞台上放进两个角色', 'new',
     array['sprite'], null::text, 15, 'stage'),
    ('blk-047', 47, 'blk-g2-spring', 'blk-g2-spring-u1', '广播一条消息',
     '让一个角色发出消息，所有角色都听得见', 'new',
     array['broadcast'], null::text, 15, 'stage'),
    ('blk-048', 48, 'blk-g2-spring', 'blk-g2-spring-u1', '听到消息就行动',
     '角色收到消息后做出自己的反应', 'practice',
     array['broadcast', 'event'], null::text, 15, 'stage'),
    -- 二年级下 · U2 复制出新角色
    ('blk-049', 49, 'blk-g2-spring', 'blk-g2-spring-u2', '复制一个',
     '用克隆积木复制出一个新角色', 'new',
     array['clone'], null::text, 15, 'stage'),
    ('blk-050', 50, 'blk-g2-spring', 'blk-g2-spring-u2', '每个克隆体自己走',
     '让每个克隆体按自己的方向行动', 'new',
     array['clone', 'random'], null::text, 15, 'stage'),
    ('blk-051', 51, 'blk-g2-spring', 'blk-g2-spring-u2', '用完就收走',
     '把用完的克隆体从舞台上清掉', 'practice',
     array['clone', 'effect'], null::text, 15, 'stage'),
    -- 二年级下 · U3 一起跑起来
    ('blk-052', 52, 'blk-g2-spring', 'blk-g2-spring-u3', '按键就开始',
     '按下按键才启动的程序', 'new',
     array['event'], null::text, 15, 'stage'),
    ('blk-053', 53, 'blk-g2-spring', 'blk-g2-spring-u3', '两件事一起跑',
     '让两段程序同时运行互不打断', 'new',
     array['concurrency', 'event'], null::text, 15, 'stage'),
    ('blk-054', 54, 'blk-g2-spring', 'blk-g2-spring-u3', '一直重复的事',
     '用循环让一段程序一直重复', 'practice',
     array['loop', 'event'], null::text, 15, 'stage'),
    -- 二年级下 · U4 分数和规则
    ('blk-055', 55, 'blk-g2-spring', 'blk-g2-spring-u4', '三条命',
     '给玩家三条命，碰到危险就少一条', 'new',
     array['lives', 'condition'], null::text, 15, 'stage'),
    ('blk-056', 56, 'blk-g2-spring', 'blk-g2-spring-u4', '做个计分板',
     '在舞台上做一个实时更新的计分板', 'new',
     array['score', 'variable'], null::text, 15, 'stage'),
    ('blk-057', 57, 'blk-g2-spring', 'blk-g2-spring-u4', '谁先赢',
     '加上胜负判定，分高的一方获胜', 'practice',
     array['rule', 'condition'], null::text, 15, 'stage'),
    -- 二年级下 · U5 大型项目：飞机大战
    ('blk-058', 58, 'blk-g2-spring', 'blk-g2-spring-u5', '飞机大战：拆解',
     '把飞机大战拆成角色、敌人、子弹和计分几块', 'new',
     array['project', 'design'], null::text, 20, 'stage'),
    ('blk-059', 59, 'blk-g2-spring', 'blk-g2-spring-u5', '飞机大战：核心玩法',
     '做出能发射、能命中的飞机大战主体', 'project',
     array['project', 'clone', 'collision', 'broadcast'], null::text, 25, 'stage'),
    ('blk-060', 60, 'blk-g2-spring', 'blk-g2-spring-u5', '飞机大战：完整作品',
     '加上生命值、计分板和胜负，完成整个游戏', 'project',
     array['project', 'clone', 'collision', 'score', 'lives', 'broadcast'], 'term4_master', 30, 'stage')
)
insert into public.module_level
  (module_id, level_id, sort_order, title, goal, body, term_id, unit_id,
   scene_type, level_type, knowledge_tags, milestone_badge, estimated_minutes, is_placeholder)
select
  'blockly',
  l.level_id,
  l.sort_order,
  l.title,
  l.goal,
  case when l.scene_type = 'stage' then
    '{"schema_version":2,"scene_type":"stage","scene":{"backdrop":"grid","stage_size":{"width":480,"height":360},"sprites":[{"id":"hero","asset":"hero","x":0,"y":0,"direction":90}],"clones":[],"variables":[],"broadcasts":[]},"available_blocks":[{"type":"move_forward","label":"前进","category":"动作","kind":"action","args":[]}],"success_check":{"type":"sprite_at","sprite_id":"hero","x":0,"y":0},"workspace":{"initial_blocks":[],"max_blocks":1,"require_connected":true},"runtime":{"out_of_bounds":"blocked","max_steps":4,"stop_on_success":true,"move_duration_ms":450},"hints":[{"trigger":"initial","text":"这一关的正文还在制作中。"}],"completion":{"stars":1,"success_text":"完成！"}}'::jsonb
  else
    '{"schema_version":2,"scene_type":"grid","scene":{"width":2,"height":1,"start":{"x":0,"y":0,"heading":"E"},"goal":{"x":1,"y":0},"actor":{"id":"player","asset":"grid_robot"},"obstacles":[],"entities":[]},"available_blocks":[{"type":"move_forward","label":"前进","category":"动作","kind":"action","args":[]}],"success_check":{"type":"actor_at_goal","actor_id":"player"},"workspace":{"initial_blocks":[],"max_blocks":1,"require_connected":true},"runtime":{"out_of_bounds":"blocked","max_steps":4,"stop_on_success":true,"move_duration_ms":450},"hints":[{"trigger":"initial","text":"这一关的正文还在制作中。"}],"completion":{"stars":1,"success_text":"完成！"}}'::jsonb
  end,
  l.term_id,
  l.unit_id,
  l.scene_type,
  l.level_type,
  l.tags,
  l.badge,
  l.minutes,
  true
from lvl l
on conflict (module_id, level_id) do update set
  sort_order = excluded.sort_order,
  title = excluded.title,
  goal = excluded.goal,
  term_id = excluded.term_id,
  unit_id = excluded.unit_id,
  scene_type = excluded.scene_type,
  level_type = excluded.level_type,
  knowledge_tags = excluded.knowledge_tags,
  milestone_badge = excluded.milestone_badge,
  estimated_minutes = excluded.estimated_minutes,
  updated_at = now();


-- 验收 SQL（迁移后逐条跑）
--
-- A. 4 个学期、20 个单元
-- select count(*) from public.module_term where module_id = 'blockly';
-- select count(*) from public.module_unit where module_id = 'blockly';
--
-- B. 每个学期 15 课、5 单元
-- select t.term_id, t.title, count(distinct u.unit_id) as units, count(l.level_id) as levels
-- from public.module_term t
-- join public.module_unit u on u.module_id = t.module_id and u.term_id = t.term_id
-- join public.module_level l on l.module_id = u.module_id and l.unit_id = u.unit_id
-- where t.module_id = 'blockly'
-- group by t.term_id, t.title order by t.sort_order;
--
-- C. 没有关卡游离在单元之外
-- select count(*) from public.module_level
-- where module_id = 'blockly' and (term_id is null or unit_id is null);
--
-- D. 课时编号连续
-- select min(sort_order), max(sort_order), count(*) from public.module_level where module_id = 'blockly';
