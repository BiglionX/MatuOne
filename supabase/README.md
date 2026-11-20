# supabase 目录说明

目录名容易让人误以为后端跑在 Supabase 上，实际不是。当前架构：

- **数据库在 Neon**。`migrations/` 里的迁移文件执行目标是 Neon（连接串在 `DATABASE_URL`），
  不是 Supabase 托管的 Postgres。用 `node scripts/apply-migration.mjs <文件>` 执行，
  **不要**用 `supabase db push`：Neon 上没有迁移历史表，CLI 会把全部迁移重放一遍，
  其中 `create or replace function` 会把线上已改过的函数体覆盖回旧版。

- **`functions/` 是遗留实现**。这些 Edge Functions 走 Supabase PostgREST，属于早期架构。
  现在前端统一请求 Vercel 的 `/api/<name>`（见 `src/lib/backend.ts`），对应实现是仓库根目录的
  `server/routes.ts`。代码库里没有任何地方调用 `functions/` 下的函数，部署它们不会生效。
  要改机构端、家长端、学生端的接口逻辑，改 `server/routes.ts` 那一份。
  两边都有 `org-finance`、`org-login` 等同名函数，改错地方不会有任何提示。

- **`config.toml` 只对 `functions/` 生效**，函数网关读里面的 `verify_jwt`，对当前链路无影响。

- **仍在使用 Supabase 的部分**是素材文件存储：`server/materialStorage.ts` 读
  `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`。

## 迁移文件怎么写

Neon 的 HTTP SQL 一条请求只能带一条语句，脚本按文件切分后逐条发送，跨语句没有事务。
所以每条迁移都要写成幂等的，重跑不会产生副作用：

- 加列用 `add column if not exists`
- 函数用 `create or replace function`
- 插数据用 `insert ... select ... where not exists`
- 删约束用 `drop constraint if exists`

先 `--dry-run` 看切分结果，确认条数和内容都对再执行。
