/**
 * Blockly 关卡的「绘本情境导入」文案。
 *
 * 为什么单独一个文件：绘本是教研内容，和「怎么造关卡」是两件事。
 * 这里只管「这一关讲什么故事、复习卡问什么」，
 * 关卡编号、标题、SQL 那些仍然在 generate-blockly-80.mjs 里。
 *
 * 两条产出规则：
 *   1. 前 15 关手写：每一关的故事和复习卡都对着这一关的真实内容写；
 *   2. 之后的关卡走模板：「小精灵」引出概念 →「机器人」讲解积木 → 收束，
 *      复习卡固定从上一关的概念和目标里提取。
 *
 * 插画现在是一段短标识（robot_wave 之类），前端画成 Emoji 占位图；
 * 教研老师换成真实插画路径后前端自动改用图片，数据结构不用动。
 */

/** 插画标识登记表。前端 src/pages/blockly/StoryPlayer.tsx 认这几个。 */
export const STORY_IMAGES = {
  robot: '🤖',
  robot_wave: '🤖',
  robot_point: '👉',
  robot_run: '🏃',
  block_move: '🟩',
  block_turn: '🌀',
  block_repeat: '🔁',
  block_if: '❓',
  run_button: '▶️',
  goal: '🏁',
  star: '⭐',
  idea: '💡',
  path: '🛤️',
  map: '🗺️',
  book: '📘',
  treasure: '💎',
  coin: '🪙',
}

/** 积木类型 → 插画标识。绘本里要画哪块积木，从关卡的提示里读出来。 */
const BLOCK_IMAGE = {
  move_forward: 'block_move',
  turn_left: 'block_turn',
  turn_right: 'block_turn',
  repeat: 'block_repeat',
  if_wall_ahead: 'block_if',
  if_path_ahead: 'block_if',
  if_else: 'block_if',
}

/**
 * 积木类型 → 学生看到的名字。
 *
 * 绘本第三页要说「这一关真正要用的就是某某积木」，
 * 名字和插画必须对上：说了「右转」却画成前进积木，孩子会懵。
 */
const BLOCK_NAME = {
  move_forward: '前进',
  turn_left: '左转',
  turn_right: '右转',
  repeat: '重复执行',
  if_wall_ahead: '如果前面有墙',
  if_path_ahead: '如果前面有路',
  if_else: '如果…否则…',
}

/**
 * 五个单元各讲一个核心概念。
 *
 * name：概念名，复习卡和绘本里都用它。
 * detail：一句话说清这个概念是什么。
 * howTo：怎么用（绘本第三页给机器人讲）。
 */
const UNIT_CONCEPT = {
  'blk-g1-fall-u1': {
    name: '前进积木',
    image: 'block_move',
    detail: '一块「前进」积木，机器人就走一格。',
    howTo: '要走到终点，就按格数拖同样多块「前进」，一块接一块连好。',
  },
  'blk-g1-fall-u2': {
    name: '转弯积木',
    image: 'block_turn',
    detail: '「左转」和「右转」会让机器人换一个方向。',
    howTo: '先走几格，再放一块转弯积木，接着走，就能走出弯弯的路。',
  },
  'blk-g1-fall-u3': {
    name: '重复执行',
    image: 'block_repeat',
    detail: '放进「重复执行」里的积木，会连着做好几次。',
    howTo: '把「前进」放进「重复执行」，把次数改成要走的格数。',
  },
  'blk-g1-fall-u4': {
    name: '如果积木',
    image: 'block_if',
    detail: '「如果…」会让电脑先看看情况，再决定做不做。',
    howTo: '把「如果前面有墙」放进「重复执行」，撞到墙它就会自己转弯。',
  },
  'blk-g1-fall-u5': {
    name: '组合运用',
    image: 'idea',
    detail: '顺序、循环、条件一起用，能走很复杂的路。',
    howTo: '先把路分成几段，每段用「重复执行」，转弯交给「如果」。',
  },
}

/** 开场白轮换，避免每关都是同一句。 */
const OPENINGS = [
  '欢迎回来！我们再试一个新本领。',
  '又见面啦，今天的关卡有点不一样。',
  '准备好了吗？这一关我们换个工具。',
  '小机器人已经等不及啦，我们开始吧。',
]

/**
 * 前 15 关的手写绘本和复习卡。
 *
 * 第一关没有上一关，所以不写 review：复习卡问的是「上一关学了什么」，
 * 没有上一关就没得问，硬凑一句反而会误导孩子。
 */
export const STORY_OVERRIDES = {
  'blk-001': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '欢迎来到代码闯关！我是小精灵，从今天起我陪你一起让机器人走路。' },
      { type: 'image_text', image: 'robot_wave', speaker: '机器人', content: '你好呀！这一关的路很短，只要 1 格，我一步就能走到小旗子那里。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '看，这是「前进」积木。把它拖到工作区，再点绿色的「运行」按钮，我就出发啦！' },
    ],
    review: undefined,
  },
  'blk-002': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '上一关你让机器人走了一步，真棒！今天我们再走远一点点。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '「前进」积木就是这样：拖一块，我走一格。' },
      { type: 'image_text', image: 'run_button', speaker: '机器人', content: '今天要走到 2 格，所以要 2 块「前进」连在一起，再点「运行」。' },
    ],
    review: { question: '上一关我们拖的是哪一块积木呀？', answer: '「前进」积木！', hint: '就是那个绿色的方块，拖一次我就走一格。' },
  },
  'blk-003': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '今天这条路有 3 格，比昨天长一点点。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '我从起点数了数：1、2、3，一共 3 格才到我爱的小旗子。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '数出几格就拖几块「前进」，一块都不能少。' },
    ],
    review: { question: '「前进」积木走一格，那走 3 格要几块？', answer: '3 块「前进」积木。', hint: '一格一块，数一数路上有几格。' },
  },
  'blk-004': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '这一关是练习关，我们把「前进」再练熟一点。' },
      { type: 'image_text', image: 'block_move', speaker: '机器人', content: '今天是 4 格，我一口气就能走到底。' },
      { type: 'image_text', image: 'run_button', speaker: '小精灵', content: '拖 4 块「前进」连成一条，再点「运行」。' },
    ],
    review: { question: '上一关走 3 格用了几块「前进」？', answer: '3 块。', hint: '一格一块。' },
  },
  'blk-005': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '五格长廊！这是我们走过的最长的路啦。' },
      { type: 'image_text', image: 'star', speaker: '机器人', content: '我最喜欢长路了，路上还藏着小星星，走过去就能捡到。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '别着急，一块一块拖，5 块「前进」排好队。' },
      { type: 'image_text', image: 'goal', speaker: '机器人', content: '排好队点「运行」，我一口气跑到小旗子那里！' },
    ],
    review: { question: '积木要怎么排，机器人才能一直往前走？', answer: '一块接一块，连成一条。', hint: '下一块要贴在上一块的下面。' },
  },
  'blk-006': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '六格啦！数字变大了一点，办法还是老办法。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '六格路看着长，其实就是 6 块「前进」。' },
      { type: 'image_text', image: 'run_button', speaker: '小精灵', content: '排好队再点「运行」，稳稳当当。' },
    ],
    review: { question: '走 5 格要几块「前进」？', answer: '5 块。', hint: '一格一块。' },
  },
  'blk-007': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '七格通道！窄窄的通道，走起来像在探险。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '通道两边的墙我不用担心，我只会一直往前。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '7 块「前进」，一块都不能少哦。' },
    ],
    review: { question: '积木和格子是什么关系？', answer: '一格配一块「前进」。', hint: '数一数格子就知道要几块。' },
  },
  'blk-008': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '八格长道！这一关开始会画出我走过的路线。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '我会一边走一边留下脚印，你看看是不是一条直线。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '8 块「前进」排成一条直线，走出来的脚印才不会歪。' },
    ],
    review: { question: '走过的路线是怎么画出来的？', answer: '机器人每走一格就留下一个脚印点。', hint: '跑完以后看看舞台上的小点。' },
  },
  'blk-009': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '九格冲刺！数起来有点长了，我们一起数。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '1、2、3……一直数到 9，我就站在旗子旁边啦。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '数错了也没关系，跑一次看看脚印就知道差几格。' },
    ],
    review: { question: '上一关的路有几格？', answer: '8 格。', hint: '数字每次加 1。' },
  },
  'blk-010': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十格挑战！两位数的路啦，别数乱了。' },
      { type: 'image_text', image: 'star', speaker: '机器人', content: '十格路中间藏着星星，一直走就能捡到。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '分成两小段数：先 5 块，再 5 块，就不乱了。' },
    ],
    review: { question: '十格可以怎么数才不乱？', answer: '分成两小段数，比如 5 加 5。', hint: '先数到 5，再接着数 5。' },
  },
  'blk-011': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十一格直行！继续练习数格子。' },
      { type: 'image_text', image: 'path', speaker: '机器人', content: '11 格，中间没有弯，只要一直往前。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '拖 11 块「前进」，连成一条长队。' },
    ],
    review: { question: '一格配几块「前进」？', answer: '一格一块。', hint: '格子数就是积木数。' },
  },
  'blk-012': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十二格大道！这一关的大道特别宽，特别长。' },
      { type: 'image_text', image: 'map', speaker: '机器人', content: '我跑过去，脚印会把整条大道都点亮。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '12 块「前进」，排好队再运行。' },
    ],
    review: { question: '脚印画出来是什么形状？', answer: '一条直直的线。', hint: '因为我们只用了「前进」。' },
  },
  'blk-013': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十三格远征！像小蚂蚁搬家一样遥远。' },
      { type: 'image_text', image: 'robot_run', speaker: '机器人', content: '我会一步一步稳稳走到底。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '这次试试边拖边数，看能不能一次排对 13 块。' },
    ],
    review: { question: '上一关的大道有几格？', answer: '12 格。', hint: '13 比 12 多 1。' },
  },
  'blk-014': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十四格长跑！准备好大长腿了吗？' },
      { type: 'image_text', image: 'goal', speaker: '机器人', content: '跑过 14 格，小旗子就在终点等我。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '14 块「前进」排成一条直线，点「运行」！' },
    ],
    review: { question: '「前进」积木放在哪里最合适？', answer: '放在工作区里，一块接一块连起来。', hint: '连成一条，机器人才能一直走。' },
  },
  'blk-015': {
    intro_story: [
      { type: 'text', speaker: '小精灵', content: '十五格耐力赛！这是我们第一单元的最后一关。' },
      { type: 'image_text', image: 'star', speaker: '机器人', content: '这一关的星星藏得最深，走到底就能全部捡到。' },
      { type: 'image_text', image: 'block_move', speaker: '小精灵', content: '15 块「前进」，排好队，点「运行」，我们一起冲过去！' },
    ],
    review: { question: '这一单元我们学会了什么呀？', answer: '用「前进」积木让机器人一条直线走到终点。', hint: '一格一块，连成一条。' },
  },
}

/** 提示里点名了哪块积木。绘本第三页要画的就是它。 */
function focusBlockOf(level) {
  const hint = (level.body?.hints ?? []).find((item) => item.trigger === 'initial')
  return hint?.focus?.blockType ?? 'move_forward'
}

/** 这一关的核心概念。没登记过的单元退回最基础的那个。 */
function conceptOf(level) {
  return UNIT_CONCEPT[level.unitId] ?? UNIT_CONCEPT['blk-g1-fall-u1']
}

/**
 * 这一关的开场提示，也就是小精灵给学生讲的那句方法。
 *
 * 复习卡的提示用它：上一关到底教了哪一招，原文比转述准。
 */
function initialHintOf(level) {
  return (level.body?.hints ?? []).find((item) => item.trigger === 'initial')?.text ?? ''
}

/**
 * 给一关配绘本和复习卡。
 *
 * @param level 当前关卡（要已经有 body.hints，绘本才知道画哪块积木）
 * @param previous 上一关；第一关没有上一关
 */
export function buildStoryFor(level, previous) {
  const override = STORY_OVERRIDES[level.levelId]
  if (override) return { intro_story: override.intro_story, review: override.review }

  const concept = conceptOf(level)
  const prevConcept = previous ? conceptOf(previous) : null
  const focusType = focusBlockOf(level)
  const blockImage = BLOCK_IMAGE[focusType] ?? 'block_move'
  const blockName = BLOCK_NAME[focusType] ?? '前进'
  const opening = OPENINGS[level.sortOrder % OPENINGS.length]

  const intro_story = [
    { type: 'text', speaker: '小精灵', content: `${opening}这一关的目标是：${level.goal}。` },
    { type: 'image_text', image: concept.image, speaker: '小精灵', content: `今天请「${concept.name}」来帮忙：${concept.detail}` },
    // 第三页点名这一关真正要用的积木，名字和插画必须对上。
    {
      type: 'image_text',
      image: blockImage,
      speaker: '机器人',
      content: `这一关真正要用的就是「${blockName}」。${concept.howTo}`,
    },
    { type: 'text', speaker: '小精灵', content: '把积木拖到工作区，连好，再点「运行」，我就能走完啦！' },
  ]

  // 复习卡固定从上一关的概念和提示里提取，孩子看一眼就知道上次学了什么。
  const review = prevConcept
    ? {
        question: `上一关我们学了「${prevConcept.name}」，还记得怎么用吗？`,
        answer: prevConcept.detail,
        hint: initialHintOf(previous) || `上一关的目标是：${previous.goal}`,
      }
    : undefined

  return { intro_story, review }
}