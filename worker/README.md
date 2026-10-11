# Zoo Test — Jev 评分 Worker

小后端,给 playground（`/playground/`）里用户跑出来的结果做 **TypeSafe Jev（System One）评分**。纯静态页做不到「用我们的 key、每人限 3 次」且 TypeSafe 对浏览器有地区/CORS 封锁，所以用这个 Cloudflare Worker：Jev key 作为 secret 存在服务端、用 KV 做每人配额、顺带代转发（绕开 451/CORS）。

## 两种评分依据

Jev 是**纯文本**评审，看不到渲染画面。本 Worker 支持：

- **方案 c（代码）** — 默认开启，免费。把用户生成的 HTML 源码喂给 Jev。
- **方案 b（截图→描述）** — 可选。用 Cloudflare Browser Rendering 把 HTML 渲染截图，再用一个视觉模型生成中立描述，连同源码一起给 Jev。需要 **Workers 付费版**（Browser Rendering）+ 一个视觉模型 key。

`USE_SCREENSHOT=1` 时启用方案 b+c；否则只用方案 c。

## 部署

```bash
cd worker
npm install

# 1) 建 KV 命名空间，把输出的 id 填进 wrangler.toml 的 QUOTA.id
npx wrangler kv namespace create QUOTA

# 2) 设置密钥（不要写进文件）
npx wrangler secret put TYPESAFE_API_KEY     # 我们的 Jev key —— 先轮换旧的那个！

# 3)（可选，方案 b）开启截图评分
#    - wrangler.toml 里把 USE_SCREENSHOT 改成 "1"，解开 [browser] 注释
#    - 设置视觉模型 key，并按需改 VISION_BASE_URL / VISION_MODEL
npx wrangler secret put VISION_API_KEY

# 4) 发布
npx wrangler deploy
```

部署后拿到的地址（形如 `https://zoo-jev.<子域>.workers.dev`）填进仓库根的 `build.mjs` 顶部的 `JEV_ENDPOINT`，再 `node build.mjs` 重新生成页面。

## 配置项（wrangler.toml）

| 项 | 作用 |
|---|---|
| `TYPESAFE_API_KEY`（secret）| 我们的 Jev key；用户填自己 key 时不走它 |
| `KV QUOTA` | 每访客每天的免费次数计数（按来访 IP+日期哈希） |
| `FREE_LIMIT` | 免费次数，默认 3 |
| `ALLOWED_ORIGINS` | 允许调用的浏览器来源（逗号分隔，上线后改成正式域名） |
| `USE_SCREENSHOT` | `1`=方案 b+c（需 BROWSER+VISION），`0`=只方案 c |
| `BROWSER`（binding）| Cloudflare Browser Rendering，仅方案 b |
| `VISION_*` | 视觉描述模型，仅方案 b |

## 配额说明（best-effort）

配额按 **来访 IP + UTC 日期** 的哈希计数（IP 由 Cloudflare 提供，前端改不了，比 localStorage 计数更难绕）。但共享 IP / 换 IP / VPN 仍可绕过——这是「免费试用额度」级别的限制，不是硬鉴权。想更严就接登录。用户填自己的 Jev key 时完全不计数。

## 安全

- `TYPESAFE_API_KEY`、`VISION_API_KEY` 只用 `wrangler secret put`，**绝不**写进 wrangler.toml 或提交到 git。
- 上线后把 `ALLOWED_ORIGINS` 收敛到 `https://agentest.shimiao.work`（本地调试再临时加 localhost）。
- 之前在终端里暴露过的 TypeSafe key 建议**先轮换再配置**。
