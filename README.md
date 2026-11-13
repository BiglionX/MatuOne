# 代码闯关 · Python 编程课外课（1.0 原型）

面向小学 2—5 年级的“抄代码 → 逐行校验 → 运行出图 → 改参数 → 完成”代码闯关原型。
本仓库只做前端原型，数据落在浏览器 localStorage，Python 执行走可替换的适配层。

## 运行

```bash
npm install
npm run dev        # 开发，默认 http://localhost:5173
npm run build      # tsc --noEmit + vite build，产物在 dist/
npm run preview    # 预览已构建产物，默认 http://localhost:4173
npm run smoke      # 不依赖浏览器：12 关标准代码 + 参数改写 + 四类报错
npm run typecheck  # 只做类型检查
```

## 页面与入口

| 端 | 路由 | 说明 |
| --- | --- | --- |
| 营销站 | `/` `/curriculum` `/pricing` `/apply` `/about` `/faq` `/privacy` `/terms` | 对外获客：价值主张、课程体系、定价、试用申请、关于、常见问题、隐私政策、服务条款 |
| 入口 | `/enter` | 四张角色卡片（学生 / 机构 / 家长 / 平台后台） |
| 学生端 | `/student/login` | 演示账号 `chenxiaoman` / `123456` |
| 学生端 | `/student` | 课程地图（12 关，逐关解锁，显示已闯关数与打字状态） |
| 学生端 | `/student/lesson/:levelId` | A 看效果 → B 抄代码 → C 改一改 → 完成页 |
| 学生端 | `/student/typing` | 独立打字热身，只有「基准键位」「编程关键词」两档 |
| 学生端 | `/student/profile` | 用户中心：我的信息与分组、总进度与星星、打字成长曲线、12 关记录、退出登录（课程地图标题区可点进） |
| 机构端 | `/org/login` `/org/dashboard` `/org/students` `/org/courses` | 账号由平台开户发放；左侧窄导航 + 右侧内容区 |
| 家长端 | `/parent` | 手机 H5，单列卡片，绑定码 `204815`…`204822` |
| 平台后台 | `/admin/orgs` `/admin/orgs/:orgId` `/admin/leads` `/admin/courses` | 多机构台账、机构详情与收费记录、线索、课程包导入 |
| 兜底 | `*` | 404 页面（不再静默跳回首页），带页脚与返回入口 |

## 演示数据

- 学生：S001 陈小满（默认登录）、S002 林一诺 … S008 黄芽芽
- 家长绑定码：S001 `204815`、S002 `204816`、S003 `204817`、S004 `204818`、S005 `204819`、S006 `204820`、S007 `204821`、S008 `204822`
- 家长端默认已绑定 S001 + S002；S002 的打字记录只落在本周，用来看「数据积累中」的降级
- localStorage 前缀 `cdg.v1.`，键包括 `progress.*`、`typing.*`、`students.imported`、`activation`、`parent.bindings`、`levels.imported`、`session.student`

清空浏览器 localStorage 即可回到初始演示状态。

## 目录

```
src/
  styles/tokens.css     # 设计 token 单点（主色 #2BB3A3 只在这里出现）
  index.css             # Tailwind 三件套 + .btn/.card/.field/.code-font 等
  config/site.ts        # 对外信息单点：主体名称、备案号、联系方式、域名、法务更新日
  types/index.ts        # 全部类型集中定义
  lib/
    runner.ts           # 页面唯一的 Python 执行入口 runCode(code, levelId)
    python-sim.ts       # 原型用的轻量 turtle/print 解释器（可替换为 Pyodide）
    usePageMeta.ts      # 页面级 title/description/og/canonical（SPA 共用一份 index.html）
    api.ts              # 页面唯一数据入口（localStorage + mock）
    storage.ts lineCheck.ts format.ts
  mock/levels.ts        # 12 关课程包（代码都是真能跑的短代码）
  mock/lineNotes.ts     # 每关逐行「这一行在做什么」，喂给小绘本和代码说明
  mock/org.ts           # 机构 / 学生 / 打字 / 家长种子数据
  components/           # BrandMark SiteFooter TurtleCanvas RunPreview Toast TypingTrainer WpmChart
  pages/                # 营销站、入口、学生端、机构端、家长端、平台后台、法务页、404
scripts/smoke-sim.ts    # 冒烟测试
scripts/brand-build.py  # 由 _brand/logo-src.jpg 生成 logo 与 favicon
scripts/og-cover.py     # 生成 1200×630 社交分享卡 public/og-cover.png
```

## 关键实现约定

- **执行适配层**：页面不直接碰 mock 或解释器，只调 `src/lib/runner.ts` 的 `runCode(code, levelId)`；返回值是统一的 `RunResult`（笔迹、文字、错误行与「人话提示」）。接 Pyodide 时只改这一层。
- **课程数据**：`src/mock/levels.ts` 的 12 关均可真实运行，`teach_code_lines` 就是学生抄的代码，抄对 = 跑得起来。
- **进关先看小绘本**：每关进入时先出 3—6 页图文卡（这一关要做什么 + 每条新命令一页），每页一句说明、一个扁平插图、一行真实代码，并用系统语音（Web Speech API，`zh-CN`）朗读；可翻页、重听、跳过，最后一页「看懂了，开始猜一猜」进入 A 回合。插图全部是内联 SVG，不依赖外部素材或网络。
- **代码说明**：`getLineNotes(level)` 提供逐行说明（优先用课程包自带的 `Level.line_notes`，否则取 `mock/lineNotes.ts`）。A 回合「要运行的代码」每行下方都写一句人话，B 回合正在抄的那一行上方也显示「这一行：…」，学生不是盲抄。
- **抄代码回合**：逐行推进、当前行高亮、标准答案整行可见、已对行绿底锁定、回车即校验；同一行连错 2 次浮出标准行 3 秒；粘贴 / 右键 / 拖拽统一 toast「自己打出来才记得牢哦」。
- **B 回合的画布**：进回合时只显示「还没有运行」的虚线占位，点「运行」才画出学生自己打的内容（打到第几行就画到第几行），不会提前把成品图透出来；成品图只在 A 回合「看效果」里作为样板展示。
- **运行失败**：不跳页、不显示 traceback，只给「第 X 行 + 一句人话提示」和「回到代码」。
- **改一改回合**：代码里每个数字都能改，一个命令一个参数（详见下面的「改一改参数一览」）。参数旁直接显示「改后的代码」，被改动的那一小段会按 0.1→0.5→0.1 的透明度闪三下（900ms 一轮），动画结束后保留浅色底，学生能一眼看到自己改的是哪个字符，再去点「再跑一次」。左侧画布遵守「运行后才出结果」：未运行时显示「还没有运行」，跑通后标题变成「改完的样子」；A 回合「看效果」是唯一的预置样板图，标题写明「这一段代码跑出来是这样」。
- **参数改写口径**：`ParamApply` 支持三种作用方式 —— `assign`（改变量）、`arg`（改函数参数，`occurrence` 默认只改第 1 处同名调用，写 `'all'` 时同名调用一起改）、`replaceChar`（替换代码里出现过的某个字符且保留空格布局）。正方形四条边必须用 `'all'` 一起变，否则不成正方形。

## 改一改参数一览

| 关 | 能改的参数 |
| --- | --- |
| L01 | 符号（三行星号一起换，保留三角形） |
| L02 | 第一条线长度 · 拐弯角度 |
| L03 | 边长（四条边一起） · 拐弯角度（四条边一起） |
| L04 | 变量 size · 拐弯角度（四条边一起） |
| L05 | 边长 size · 每次转的角度 angle |
| L06 | `range(4)` 循环次数 · 边长 size · 每次转的角度 |
| L07 | 边数 sides · 每条边长度 |
| L08 | 边数 sides（决定走 if 还是 else） · 每条边长度 |
| L09 | 边数 sides · 每条边长度 |
| L10 | 起始步长 step · 每次转的角度 |
| L11 | 起始长度 length · 每次转的角度 |
| L12 | 花瓣数 petals · 花瓣大小 size |

L08 / L09 的颜色在 `if / else` 两个分支里各写一处，改成同一个颜色会把「判断选颜色」这件事演没，所以颜色不开放为参数；学生可以在 B 回合抄完代码后自行改源码体验。

- **进度口径**：机构端、家长端与学生端共用 `getStudentStanding()` —— 本机有学习记录就以记录为准，完全没有记录才回落到 mock 的 `currentLevelOrder`。
- **打字趋势**：手写 SVG 折线，只画 WPM 一条线，准确率一行文字；有效数据点少于 2 个显示「数据积累中」。
- **用户中心**：`/student/profile` 汇总学生自己的信息（姓名/账号/机构/分组/最近学习）、总进度与星星、当前关卡、最近四周打字曲线和 12 关记录；不排名、不与他人对比。入口在课程地图顶部标题区（「用户中心 ›」），页内提供「退出登录」回到登录页以便换账号。

## 品牌图标与 favicon

- 源图 `_brand/logo-src.jpg`（3D 渲染原图，右下角带生成水印）。`python scripts/brand-build.py` 一键产出全部尺寸。
- 处理口径：水印在主体之外，靠裁切去掉；背景用「红色偏色」做泛洪判定（主体被红框完整包住，不会被误吃），所以底部投影一并清掉、奶油色内脸保留；半透明边缘做颜色去污，避免在深色标签栏上出现白边。
- 产物在 `public/`：`logo.png`(512)、`logo-192.png`、`favicon.ico`（16/32/48/64/128/256）、`favicon-32.png`、`favicon-16.png`、`apple-touch-icon.png`、`site.webmanifest`。
- 页面标识一律走 `src/components/BrandMark.tsx`：`BrandMark` 只出图标，`BrandLockup` 出「图标 + 产品名」。不要在页面里硬编码图片路径。
- 图标主色是红橙色，设计主色仍是 `#2BB3A3`：图标只当标识，按钮、进度条、强调色不改色，两者同屏靠尺寸区分层级。

## 对外信息与合规位

- 公司主体、备案号、客服渠道、部署域名、法务更新日全部集中在 `src/config/site.ts`；页脚（`components/SiteFooter.tsx`）、关于页、法务页都从这一处取值，不要另写一份。
- 备案号未取得前 `icpLicense` 保持空字符串：页脚**不显示任何编号**，只展示主体名称与版权，并注明「ICP 备案办理中」。取得后只改这一个常量，页脚会自动带上工信部查询链接。
- 客服电话不对外；`contactEmail` / `contactWechat` 为空时页脚与成功页只显示「通过申请试用表单联系」，不会渲染空联系方式。
- 申请表单带隐私同意勾选（未勾选不可提交），勾选项链到 `/privacy` 与 `/terms`。
- 页面级 meta 统一走 `src/lib/usePageMeta.ts`：每个页面自己声明 title 与 description，并同步 og/twitter；`siteUrl` 为空时不生成 canonical，避免出现写死的假域名。
- `public/robots.txt` 允许抓取营销页，屏蔽 `/admin` `/student` `/org` `/parent`；`sitemap.xml` 待域名确定后再生成。
- 分享卡 `public/og-cover.png`（1200×630）由 `python scripts/og-cover.py` 生成，改了产品名或卖点要重新跑一次。

## 附录 A 红线自查

1. 独立打字模块只有「基准键位」「编程关键词」两档，课内打字用 `practice_type=lesson_embedded`。
2. 家长端只有 WPM 折线 + 文字准确率，不排名、不对比，点数不足显示「数据积累中」。
3. 机构端学生管理只有「批量导入」一个建号入口，没有邀请码按钮，也没有灰显占位。
4. 平台后台的课程配置只有 JSON 课程包导入 + 逐字段校验报告，没有可视化编辑器；机构侧只有台账、开户、收费记录、线索，没有自助注册与在线支付。
5. 产品名统一为「代码闯关」。
