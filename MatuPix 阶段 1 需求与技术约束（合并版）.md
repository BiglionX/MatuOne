合理。阶段 0 已收尾，阶段 1 就按“仿 PixActivity 的布局逻辑，不仿视觉样式”来做。下面是合并版阶段 1 文档，可以直接交给 Cursor。

---

# MatuPix 阶段 1 需求与技术约束（合并版）

**版本**：v1.0  

**前置**：阶段 0 已完成`/matupix` 占位入口已接入`npm run typecheck` 通过。  

**本轮范围**：本地创作最小闭环，不含 `localStorage`、上传、公开审批、数据库。  

**UI 方向**：借鉴 PixActivity 的空间组织逻辑（顶部工具栏、侧边调色板、中央画布、底部操作），视觉延续阶段 0 的紫色系与米色背景，不堆像素风皮肤。

## 1. 本轮目标

让孩子在 `/matupix/create` 完成第一张 16×16 像素图，并能下载为 PNG。验证“选色 → 画 → 擦 → 清空 → 下载”这条闭环，同时不破坏阶段 0 入口和现有代码闯关路由。

## 2. 路由与页面

- 保留 `/matupix` 入口页：字母 M、标题、文案、「开始创作」大按钮、「返回代码闯关」链接、页底家长入口纯文本。

- 新增 `/matupix/create` 创作页，作为 `/matupix` 子路由，独立懒加载，仍在现有 `<Suspense>` 内，不放进 `MarketingLayout`。

- 入口页的「开始创作」跳转 `/matupix/create`。

## 3. UI 布局（仿 PixActivity 逻辑）

创作页四区：

1. **顶部工具栏**：画笔、橡皮两个工具按钮，大触控目标，选中态明显。本轮不做撤销/重做。

2. **右侧调色板**：垂直排列 8—12 个儿童友好高饱和颜色，选中颜色有高亮边框。不做完整色谱、不做取色器。

3. **中央画布**：固定 16×16 像素，画布显示区域尽量大，始终显示淡网格线，帮助孩子理解“一格一像素”。

4. **底部操作区**：

   - 「清空」：内联二次确认（按钮变成“确认清空？”），不用 modal。

   - 「下载图片」：导出 PNG，文件名 `matupix-16x16.png`。

   - 「公开作品（即将开放）」：禁用态按钮，点击显示轻提示“公开功能还在准备中”。不写状态、不调接口。

## 4. 功能范围

必须做：

- 画笔：点击和拖拽绘制当前颜色。

- 橡皮：点击和拖拽擦除为透明/背景色。

- 调色板选色。

- 清空画布（带内联确认）。

- 下载 PNG。

- 公开按钮 UI 占位。

明确不做：

- 不做 `localStorage`、不做草稿保存、不做多作品列表。

- 不做撤销/重做、填充、取色器、图层、动画帧、画布尺寸选择。

- 不做上传、不建表、不写 `server/routes.ts`、不调用家长会话。

- 不加载跨域图片、字体、脚本、样式表、媒体、iframe、Worker、WASM。

- 不改 `tokens.css` 的 `:root`，不改 `/enter` 五端卡片，不改 `/student/parent/org/admin/agent`。

- 不升级依赖，不删旧 mock，不改 `vite.config.ts` / `vercel.json`。

## 5. 技术约束

- 新增文件只放在 `src/pages/matupix/` 下，建议拆分`MatuPixCreate.tsxPixelCanvas.tsxToolbar.tsxPalette.tsx`。不强制过度拆分。

- `PixelCanvas` 用单个 HTML `<canvas>`，内部逻辑 16×16，显示尺寸由 CSS 放大；像素数据用二维数组存颜色或 `null`。

- 绘制与擦除用 Pointer 事件，兼容鼠标和触控。

- 导出时用离屏 canvas 按 16×16 绘制像素，再 `toBlobtoDataURL` 下载，避免把网格线导出进去。

- 主题继续由 `MatuPixLayout` 根节点覆盖变量，创作页继承，不新增全局样式。

- 公开按钮只做本地 UI 状态提示，不引入 Toast 组件依赖，可用页面内轻量提示文本。

- 禁止触碰文件沿用阶段 0 附录 A.6 清单；允许新增 `src/pages/matupix/` 下创作相关文件，修改 `src/App.tsx` 增加子路由，修改 `MatuPixHome.tsx` 增加「开始创作」按钮。

## 6. 验收标准

1. `npm run typecheck` 通过。

2. `/matupix` 入口页有「开始创作」按钮，点击进入 `/matupix/create`。

3. `/matupix/create` 显示顶部工具栏、右侧调色板、16×16 网格画布、底部操作区。

4. 画笔可点击和拖拽绘制；橡皮可擦除；调色板选色生效。

5. 清空有内联确认；下载得到 `matupix-16x16.png`，图片不含网格线。

6. 公开按钮为禁用态，点击显示“即将开放”提示，不发起网络请求。

7. 无 `localStorage`、无新表、无上传接口、无跨域资源请求。

8. `/enter/student/student/lesson/:levelId/parent/admin` 路由与行为不变。

9. `tokens.css` 的 `:root` 未被修改。

10. `README.md` 入口表增加 `/matupix/create`（可选但建议）。