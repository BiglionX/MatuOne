**MatuPix 需求文档（第一阶段）**

# # MatuPix 阶段 0 需求与技术约束

**版本**：v0.3（合并版）  

**状态**：待评审  

**本轮范围**：阶段 0（纯入口占位页），不含创作、保存、公开、上传  

**关联**：代码闯关项目（Vite + React + TS）`/matupix` 当前**未接入**，本轮新增  

**文档结构**：第 1—9 节为需求；附录 A 为 Cursor 只读扫描得出的技术约束

---

# 第一部分：需求

## 1. 目标

MatuPix 是面向 7—12 岁儿童的像素创作入口，作为代码闯关的**并列产品**存在，不是代码闯关的子功能。

本轮只解决一件事：**新增一个独立、隔离、不影响现有功能的 `/matupix` 占位入口。** 创作、保存、公开、家长审批全部留到后续阶段。

## 2. 用户与入口

| 用户 | 阶段 0 能做什么 | 说明 |

|---|---|---|

| 未登录访客 | 进入 `/matupix` 看到占位页 | 不写数据库，不创建学生身份 |

| 机构学生 | 同上 | 不复用 `cdg.session.student`，不触发机构课模型 |

| 已注册家长 | 同上，页底看到家长入口占位文字 | 不调用 `getParentSession`，不做 `/parent/matupix` |

**入口**：独立 URL `/matupix`，**不**出现在 `/enter` 五端卡片中，**不**包在 `MarketingLayout` 内。

## 3. 阶段划分

**阶段 0（本轮）**：纯入口占位页。

- 字母 Logo、面向孩子的文案、返回 `/enter` 链接、页底家长纯文本`READMEDEPLOY.md` 记录。

- 无 canvas、无 `localStorage`、无下载、无公开按钮、无上传、无数据库。

**阶段 1（下一轮）**：本地创作占位。

- 像素 canvas 占位、本地保存/下载、公开按钮 UI 占位（标注“即将开放”）。

- 仍不建表、不接上传、不做家长审批。

**阶段 2+（未排期）**：作品持久化、公开审批、家长端子路由、同意流程落库。

## 4. 阶段 0 范围

1. 新建 `src/pages/matupix/MatuPixLayout.tsx` 与 `MatuPixHome.tsx`，命名导出，与 `ParentHome` 的懒加载方式一致。

2. `MatuPixLayout` 根节点铺满视口，自己设置背景，覆盖 `tokens.css` 中三元组与实色两套变量（详见附录 A 第 4 节），**不修改** `tokens.css`。

3. `MatuPixHome` 内容：

   - 字母 Logo（纯文本“M”或“MatuPix”字母标识，本地渲染，不外链图片）。

   - 面向孩子的文案：“马上就能画画啦”。

   - “返回代码闯关”链接，指向 `/enter`。

   - 页底家长入口占位纯文本，不做链接。

4. `src/App.tsx`：在现有 `lazy()` 组旁新增懒加载，在 `/admin` 之后`path="*"` 之前加并列路由，包在现有 `<Suspense>` 内，不放进 `MarketingLayout`。

5. `README.md` 或 `DEPLOY.md` 记录 `/matupix` 入口。

## 5. 明确不做（写死）

- 不建作品表、审批表或任何新表。

- 不接上传、不接对象存储、不写 `server/routes.ts`。

- 不做 `/parent/matupix` 子路由，不调用 `getParentSession`。

- 不改 `/enter` 五端卡片，不改 `/student/parent/org/admin/agent`。

- 不改 `src/styles/tokens.css` 的 `:root`。

- 不加载跨域图片、字体、脚本、样式表、媒体、iframe、跨域 Worker、跨域 WASM（COEP 会拦截）。

- 不 import `src/lib/pyodide.worker.ts`。

- 不在 MatuPix 布局里重复挂 `NoticeToastOfflineBanner`（已在 `Routes` 外）。

- 不升级 React Router，不删除旧 mock，不改 `vite.config.ts` / `vercel.json`。

- 不做 canvas`localStorage`、下载、公开按钮（属阶段 1）。

## 6. 已定决策（不再讨论）

1. 使用者：机构学生 + 已注册家长 + 未登录访客；访客不写 `student` 表。

2. 账号：只共享家长登录会话；MatuPix 学生身份独立，不复用 `cdg.session.student`。

3. 作品：阶段 1 起只本地保存/下载；公开按钮仅 UI 占位，不建表、不接上传。

4. 家长端：不改现有 `/parent` 首页；MatuPix 家长视图延后到作品上服务器时再做。

## 7. 技术与合规约束（摘要，详见附录 A）

- **主题隔离**`index.css` 把 `color: var(--ink)` 和 `background: var(--bg)` 设在 `:root`，只改 `--bg-rgb` 不会改变实色。MatuPix 根节点必须**同时**覆盖三元组`--brand-rgb` 等）和实色`--brand` 等），并自己铺满视口设置背景。

- **路由**`App.tsx` 第 68 行 `<Suspense>` 已包住全部 `<Routes>`，新路由放在该 `Suspense` 内即可，无需再包。位置在 `/admin` 之后`path="*"` 之前。

- **COEP/COOP**：全站 `require-corp`，跨域图片、字体、脚本、样式表、媒体、iframe、Worker、WASM 会被拦截。阶段 0 只用本地文本和链接，不触发。

- **禁止触碰文件**：见附录 A 第 6 节清单。允许新增仅限 `src/pages/matupix/` 下两个文件，以及 `src/App.tsx` 的懒加载与路由。

- **合规**：阶段 0 不收集个人信息，不触发 COPPA/FERPA 同意流程。

## 8. 验收标准（阶段 0）

1. `npm run typecheck` 通过。

2. `/matupix` 可访问，显示字母 Logo、“马上就能画画啦”、返回 `/enter` 链接、页底家长纯文本。

3. 页面不使用 `.student-shell`，不加载任何跨域资源。

4. `/enter/student/student/lesson/:levelId/parent/admin` 路由写法与行为不变。

5. `tokens.css` 的 `:root` 未被修改。

6. 无新增依赖、无新表、无上传接口、无 canvas、无 `localStorage`、无公开按钮。

7. `README.md` 或 `DEPLOY.md` 已记录 `/matupix` 入口。

## 9. 已确认事项

1. 占位页需要品牌 Logo，用英文字母表示，本地渲染。

2. 文案语气面向孩子。

3. 放置“返回代码闯关”链接，指向 `/enter`。

4. 家长入口占位文字放在页面底部，纯文本。

5. 本阶段在 `README.md` 或 `DEPLOY.md` 记录 `/matupix` 入口。

---

# 附录 A：技术约束

> 来源：Cursor 对当前仓库的只读扫描。以下结论对应具体文件与代码位置，供实施时对照。

## A.1 不能复用的模块

- **学生身份**`src/api/studentAuth.ts` 的 `cdg.session.student`，表 `public.student`）`supabase/migrations/20261112170000_org_scope.sql` 里 `org_id` 非空，账号由机构创建。访客写入这张表就会变成机构学生。

- *`ParentChildView`**`src/types/index.ts` 约 335–351 行）：字段是机构、分组、关卡、课文解读和打字 WPM。家长首页 `src/pages/parent/ParentHome.tsx` 按这个结构渲染。

- *`RunResult`**`src/types/index.ts` 约 182–194 行）：成功分支只有 `text` 和海龟 `canvas` 线段。像素作品不是这种输出。

- *`org_material`**`supabase/migrations/20261115090000_org_custom_material.sql` 约 16–33 行）：行归属 `org_id`，类型只允许 image、pdf、ppt、text，路径是机构私有对象。对应接口在 `src/api/orgMaterials.ts` 和 `server/materialStorage.ts`。

- **Pyodide 与课时运行时**`src/lib/pyodide.worker.ts` 第 3 行`src/lib/runner.tssrc/components/RunPreview.tsx`）：加载 `https://cdn.jsdelivr.net/pyodide/...`[，并且只服务](https://cdn.jsdelivr.net/pyodide/...`，并且只服务) Python 课时。

- *`BrandMarkWpmChart.student-shell`**`src/components/BrandMark.tsxsrc/components/WpmChart.tsxsrc/index.css` 的 `.student-shell`）：前两个是代码闯关标识和打字图，后者把字号设成 `--student-font`（19px）。

- **旧 mock**`src/lib/api.tssrc/lib/orgStore.tssrc/lib/storage.ts`）：页面已经不引用，键名在 `cdg.v1.`。接回去会写进错误的本地存储。

- *`server/routes.ts` 的 `dispatch`**：现有分支是登录、课时、家长、机构和后台。本阶段没有 MatuPix 动作可以挂进去。

## A.2 可复用的薄适配层

本阶段占位页不调用这些接口。后面要接时按下面的用法，不要改它们的实现。

- *`callFunction`**`src/lib/backend.ts` 约 32 行）`callFunction(name, body, { role })` 向同源 `/api/${name}` 发 POST`role` 只能是 `'org' | 'student' | 'platform' | 'parent' | 'agent'`。令牌读 `cdg.auth.${role}`。

- **家长会话**`src/api/parent.ts` 的 `getParentSession`）：只读 `cdg.session.parent`，形状是 `{ account: string }`。家长 id 在服务端会话里，函数不接收 `parentId`。本阶段需求写明不做家长链接，所以占位页不要调用它。

- *`FormErrorSkeleton`**`src/components/FormError.tsxsrc/components/Skeleton.tsx`）：放在 MatuPix 根节点内部作表单错误和加载占位。它们用 Tailwind 的 `text-dangerbg-canvas`，会跟着根节点上的 CSS 变量走。

- *`NoticeToastOfflineBanner`**`src/App.tsx` 第 66–67 行）：已经挂在 `Routes` 外面`/matupix` 会一起显示。不要在 MatuPix 布局里再挂一份。

## A.3 COEP / COOP 对资源加载的限制

两处都把响应头加在全部路径上`vite.config.ts` 的 `server.headers` 与 `preview.headers`，以及 `vercel.json` 的 `"source": "/(.*)"`。值是 `Cross-Origin-Opener-Policy: same-originCross-Origin-Embedder-Policy: require-corp`。

拦截来自 **COEP `require-corp`**。跨域响应如果没有 `Cross-Origin-Resource-Policy: cross-origin`，并且 CORS 请求也没有匹配的 `Access-Control-Allow-Origin`，下面这些类型不会显示或不会执行：

- 图片`<img>`、SVG `<image>`、CSS `url()` 背景

- 字体`@font-face`

- 脚本`<script src>`、跨域 ESM、跨域 `Worker`

- 样式表`<link rel="stylesheet">`

- 媒体`<video><audio>`

- 框架`<iframe>`

- `fetch` / `XMLHttpRequest` 的 `no-cors` 请求`cors` 模式还要响应带 CORS 头

- 跨域 WebAssembly

同源打包文件`data:blob:`、本页 canvas 不受这条限制`COOP: same-origin` 不拦截图片和字体；它切断的是跨域 `window.opener` 和跨站弹窗。

MatuPix 页面不要 import `src/lib/pyodide.worker.ts`，否则会去拉 jsDelivr。

## A.4 主题隔离

色值只定义在 `src/styles/tokens.css` 的 `:roottailwind.config.cjs` 的 `brandinkcanvas` 等类写成 `rgb(var(--*-rgb) / <alpha-value>)`，所以子树上的 Tailwind 类会读最近的 `*-rgb` 变量。

`:root` 里的 `--bg--ink--brand` 等实色在根上就已经算成具体颜色，子节点只改 `--bg-rgb` 不会改变这些实色`src/index.css` 第 4–8 行把 `color: var(--ink)` 和 `background: var(--bg)` 设在 `:root` 上，整页底色仍是代码闯关的背景。MatuPix 根节点必须自己铺满视口并设置背景，例如在同一节点上覆盖 `--bg-rgb` 后再使用 `bg-canvas`。

在 MatuPix 根节点的 `style` 上覆盖这些变量，不要改 `tokens.css`：

- 三元组`--brand-rgb--brand-strong-rgb--brand-soft-rgb--brand-action-rgb--brand-action-strong-rgb--success-rgb--success-soft-rgb--danger-rgb--danger-soft-rgb--warning-rgb--warning-soft-rgb--bg-rgb--ink-rgb--ink-soft-rgb--line-rgb--code-bg-rgb`

- 同一节点上的实色`--brand--brand-strong--brand-action--brand-action-strong--brand-soft--success--success-soft--danger--danger-soft--warning--warning-soft--bg--ink--ink-soft--line--code-bg`

不要加 `.student-shell`，这样不会用到 `--student-font--art-blue--art-purple--art-yellow--art-white` 是海龟用色，像素页不引用即可。

## A.5 路由接入位置

`src/App.tsx` 第 68 行的 `<Suspense>` 已经包住全部 `<Routes>`。懒加载组件必须留在这个 `Suspense` 里面，不需要再包一层。

`/matupix` 与第 82–117 行的 `/student/org/parent/agent/admin` 同级，放在第 117 行的 `</Route>` 之后、第 119 行 `path="*"` 之前。不要放进第 70 行的 `<Route path="/" element={<MarketingLayout />}>`。

懒加载写在第 24 行那组 `lazy()` 旁边，导出方式与第 40 行的 `ParentHome` 相同`import(...).then((m) => ({ default: m.MatuPixLayout }))`。布局路由使用 `<Outlet />`，子路由 `index` 指向 `MatuPixHome`。

当前 `App.tsx` 没有这条路由`src/pages/matupix/` 也没有文件。需求文档早期版本写的「已接入」和仓库不一致，本合并版已改为「当前未接入」。

## A.6 本阶段禁止触碰的文件

- `src/styles/tokens.css`

- `src/pages/EntryPage.tsx`

- `src/pages/student/src/pages/parent/src/pages/org/src/pages/admin/src/pages/agent/`

- `src/pages/legal/PrivacyPage.tsxsrc/pages/legal/TermsPage.tsxsrc/config/site.ts`

- `src/types/index.ts`

- `src/lib/pyodide.worker.tssrc/lib/runner.ts`

- `src/lib/api.tssrc/lib/orgStore.tssrc/lib/storage.ts`

- `server/routes.tsserver/materialStorage.tsserver/session.ts`

- `supabase/migrations/supabase/functions/`

- `vite.config.tsvercel.json`（不要放宽 COEP/COOP）

- `package.jsonpackage-lock.json`

允许新增的只有 `src/pages/matupix/` 下的布局和占位页，以及 `src/App.tsx` 里上述位置的懒加载路由。需求文档第 4.5 节另外要求在 `README.md` 或 `DEPLOY.md` 记录入口；这两个文件不在禁止清单里。

## A.7 附录中曾提出的遗留问题（已在需求侧解决）

1. 第一阶段页面做到哪一步 → 阶段 0 只做纯占位，不做 canvas`localStorage`、下载、公开按钮；这些归阶段 1（见需求第 3 节）。

2. “返回代码闯关”链接指向哪 → `/enter`（见需求第 4.3 节）。

3. 第 9 节五项是否算验收 → 算，已纳入验收标准第 8 节（见需求第 8 节第 2 条与第 9 节）。

---

---