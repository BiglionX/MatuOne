# 部署

`supabase/config.toml` 里的 `verify_jwt` 由函数网关读取，不会随前端构建生效。

改过 `config.toml` 之后，必须重新部署函数：

```
supabase functions deploy
```

只改文件、不重新 deploy，线上网关仍按上一次部署的校验规则拦截请求。本地要重启 `supabase start`（或重新 `supabase functions serve`）后，同一份配置才会作用到本机网关。

## 部署后验证

本地没有 Docker。对着 staging（或任何非生产项目）跑：

```
STAGING_URL=... STAGING_ANON_KEY=... STAGING_SERVICE_ROLE_KEY=... npm run verify:remote
```

三个变量要在当前 shell 里导出。脚本不读 `.env`。

顺序固定为 V1 到 V6，每条打印 PASS 或 FAIL，以及响应摘要的前 300 字：

1. V1：`org-login` 不带 Authorization，只带 apikey，账号 `TrialDemo1234`。期望 2xx 业务 JSON，证明 `verify_jwt=false` 已生效。
2. V2：`org-students` 不带 Authorization。期望 401。
3. V3：用 `chenxiaoman` / `123456` 登录拿 JWT，再请求第 4 关。期望 `trial_locked`，响应里没有课文。
4. V4：用 service role 把该学生所在机构的 `status` 临时改成 `disabled`，用同一个 JWT 请求第 2 关。期望 `org_disabled`，响应里没有课文。
5. V5：用伪造的 `x-parent-token` 调 `parent-portal` home，不带登录会话。期望 401。
6. V6：用 anon key 的 supabase-js 客户端直接 `from('student').select()`。期望空结果或报错，不能读到任何行。

V4 会改机构状态。断言成功或失败都会在 finally 里改回原状态。脚本如果在恢复前被杀掉，机构会停在 `disabled`，需要人工把 `org.status` 改回去，再确认学生能进前 3 关。
