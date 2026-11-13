# 部署

`supabase/config.toml` 里的 `verify_jwt` 由函数网关读取，不会随前端构建生效。

改过 `config.toml` 之后，必须重新部署函数：

```
supabase functions deploy
```

只改文件、不重新 deploy，线上网关仍按上一次部署的校验规则拦截请求。本地要重启 `supabase start`（或重新 `supabase functions serve`）后，同一份配置才会作用到本机网关。
