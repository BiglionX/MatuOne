# 部署

## 先认清架构

- **数据库**：Neon，运行时用 `pg` 直连 pooler（连接串 `DATABASE_URL_POOLER`），连接池在 `server/db.ts`。
- **接口**：Vercel 的 `api/[name].js`（内部是 `server/routes.ts`）。前端所有后端调用都走 `/api/<name>`，见 `src/lib/backend.ts` 的 `callFunction`。
- **会话**：自签 JWT（`server/session.ts` 的 `issueSession` / `requireRole`），不依赖 Supabase Auth。
- **素材文件**：Supabase Storage，仍需要 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`。

`supabase/functions/` 是早期基于 Supabase Edge Functions 的实现，**不在运行链路上**，详见 `supabase/README.md`。

## 日常发布

改代码 → 自检 → 提交推送，Vercel 会自动部署：

```
npm run typecheck
npm run audit:ldraw && npm run audit:origins && npm run audit:magic && npm run audit:files && npm run audit:engine
npm run e2e
git commit && git push
```

MatuPix 积木页（`/matupix/brick`）改零件或魔法模型后，务必跑完上面五项 brick audit；日常冒烟含在 `e2e/matupix-brick.spec.ts`。

不需要部署任何后端产物，也不需要 Supabase 的 access token。

## 保活：别让数据库冷启动

`pg` 直连 Neon pooler 时，最贵的一次不是查询，是 TLS 握手（实测 2 秒多）。连接被掐掉后再来请求，就要重新付一次这个成本。

两个动作把这条长尾压掉：

1. `server/db.ts` 在建池时预热一条连接（`pool.connect()` 后立刻 `release`），首个请求不用等握手。
2. `api/keep-alive.ts` 每 4 分钟打一次 `select 1`。Vercel 预览环境由 `vercel.json` 的 cron 触发；生产在自己服务器上，用 crontab 或 systemd timer 打自己的 `/api/keep-alive`。

Vercel 那边注意两点：cron 只在 Production 环境生效；Hobby 计划不允许每 4 分钟触发（只能每天一次），账号是 Hobby 就把 `vercel.json` 里的 `*/4 * * * *` 改成 `0 * * * *` 或 `0 3 * * *`。

自建服务器上的定时任务（crontab，每 4 分钟）：

```
*/4 * * * * curl -fsS -H "authorization: Bearer $CRON_SECRET" http://127.0.0.1:5173/api/keep-alive >/dev/null
```

配了 `CRON_SECRET` 才需要带 token，没配就直接 `curl http://127.0.0.1:5173/api/keep-alive`。

还有一个要注意的平衡：连接池的 `idleTimeoutMillis` 现在是 30 秒，比保活周期短。保活能保证 Neon compute 不挂，但保证不了本机连接不关——想让连接真正常驻，把它调到不小于保活周期（`server/db.ts` 里 `idleTimeoutMillis: 30_000` → `240_000`）。

## 数据库迁移

迁移文件放在 `supabase/migrations/`，执行目标是 Neon。迁移脚本走 Neon 的 HTTP SQL 通道，一条请求只能带一条语句，所以脚本先把文件切成单条再逐条发（运行时接口已经改用 `pg` 连接池，不受这个限制）：

```
node scripts/apply-migration.mjs --dry-run supabase/migrations/20261115120000_org_finance_role.sql
node scripts/apply-migration.mjs supabase/migrations/20261115120000_org_finance_role.sql
```

`--dry-run` 只打印切分结果，不连库。执行前先确认切出来的语句条数和内容都对。

迁移文件必须写成**幂等**的（`add column if not exists`、`create or replace function`、`insert ... where not exists`）：跨语句没有事务，某条失败时前面的已经生效，重跑一次即可。

也可以在 Neon 控制台的 SQL Editor 里手动执行同一份文件。

## 不要做这两件事

- **`supabase db push`**：Neon 上没有 `supabase_migrations.schema_migrations` 历史表，CLI 会把 `supabase/migrations/` 下全部迁移当成未应用并重放。里面的 `create or replace function` 会把线上已经改过的函数体覆盖回旧版。
- **`supabase functions deploy`**：`supabase/functions/` 不在运行链路上，部署了也不会被调用。

## 部署后验证

```
npm run e2e
E2E_BASE_URL=https://你的域名 npm run e2e
```

本地跑时 Playwright 会自己起 `npm run dev`；远程跑需要在 `.env.test` 里填好线上 `DATABASE_URL`。用例覆盖平台端、机构端、家长端、学生端的登录与关键业务链路。

冒烟检查可以直接打接口，例如机构财务：

```
curl -X POST http://127.0.0.1:5173/api/org-login -H 'content-type: application/json' -d '{"account":"adminorg0001@daima-chuangguan.local","password":"TrialDemo1234"}'
```

拿到 token 后带 `authorization: Bearer <token>` 和 `x-action: read` 请求 `/api/org-finance`。机构老师账号 `teacherorg0001@daima-chuangguan.local` 读同一个接口应返回 403。

## 环境变量

| 变量 | 用途 | 是否必需 |
| --- | --- | --- |
| `DATABASE_URL_POOLER` | `pg` 连接池用的 Neon pooler 连接串。主机名要带 `-pooler`，不能带 `channel_binding` | 强烈建议 |
| `DATABASE_URL` | 旧连接串。没配 `DATABASE_URL_POOLER` 时会拿它兜底并打警告 | 必需 |
| `CRON_SECRET` | 保活端点的可选校验令牌。配了就要带 `authorization: Bearer <token>` | 可选 |
| `SUPABASE_URL` | 素材存储的桶地址 | 必需 |
| `SUPABASE_SERVICE_ROLE_KEY` | 素材存储读写密钥 | 必需 |

`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 在 `src/vite-env.d.ts` 里有类型声明，但前端代码没有引用，不必配置。
