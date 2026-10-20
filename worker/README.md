# Zoo Test — Jev 评分 Worker

Cloudflare Worker 使用服务器端 Jev Secret 评分，用户也可提供自己的 Jev Key。共享密钥的**免费使用量**用 Durable Objects (SQLite 存储) 原子计数，按 Cloudflare 访客 IP 的 SHA-256 摘要 + UTC 日期限额，并有全站每日调用上限。

> 这是代码部署说明，不代表当前生产 Worker 已经更新。先在测试环境验证迁移和并发，再部署生产环境。修改 Worker 代码不会自动发布。

## 一、功能与安全边界

- **代码评分**：`USE_SCREENSHOT=0`，默认模式。Jev 只能看到生成的 HTML 源码片段，**不等于**对最终视觉质量的真实评分。
- **截图辅助评分**：`USE_SCREENSHOT=1`，需要 Cloudflare Browser Rendering + 视觉模型密钥。会在隔离浏览器中加载 HTML；通过请求拦截和 `connect-src 'none'` CSP 阻断任意连接，并只放行 `https://cdnjs.cloudflare.com`、`https://cdn.jsdelivr.net`、`https://unpkg.com`、Google Fonts 资源，其他 HTTP(S) 请求拦截。页面错误时降级到代码评分，并通过 `hadScreenshot` 标明实际模式。上线前必须完成恶意 HTML 与浏览器资源测试。
- **共享 Jev Key**：仅存于 Worker Secret，不能写入仓库或浏览器。无配额绑定或配额服务异常时**拒绝共享 Key 调用**，不会无限放行。
- **用户自己的 Jev Key**：由浏览器直接提交到此 Worker 再发往 TypeSafe，不消耗共享配额；这个 Key 仍会经过 Worker。为了避免用户绕过本站配额消耗我们的视觉模型费用，**BYOK 模式仅做代码评分，不使用本站截图／视觉服务**。模型调用 API Key 则只发往用户指定的模型提供方，**不要混淆两种密钥**。
- **CORS** 只限制浏览器跨域读取，不是身份鉴权。无 Origin 的请求及伪造客户端仍可到达 Worker；实际成本保护依赖配额和总预算，也应配置 Cloudflare Rate Limiting／WAF。

## 二、部署前准备

```bash
cd worker
npm ci
npx wrangler login

# 共享 Jev 密钥（此前泄露过的密钥应先轮换）
npx wrangler secret put TYPESAFE_API_KEY

# 如启用截图：
# npx wrangler secret put VISION_API_KEY
```

`wrangler.toml` 现在包含：

```toml
[vars]
FREE_LIMIT = "3"
GLOBAL_DAILY_LIMIT = "100"
USE_SCREENSHOT = "0"

[[durable_objects.bindings]]
name = "QUOTA_LIMITER"
class_name = "QuotaLimiter"

[[migrations]]
tag = "v1-quota-limiter"
new_sqlite_classes = ["QuotaLimiter"]
```

Durable Object 在 `wrangler deploy` 时通过 migrations 创建／绑定，**不再需要创建或配置 KV QUOTA 命名空间**。旧 KV 保留在 Cloudflare 中，但新代码不再读取它；确认稳定后才考虑手动清理，勿误删其他用途资源。若已有同名迁移标签，需要按当前 Cloudflare 部署记录改用新的唯一标签。

**先在 staging 环境确认：** Durable Object 可读写；同 IP 并发超过 3 次时不会多计费；全站每日总额度生效；缺少绑定时返回 503；请求成功及失败时预留额度的结算／退款正常。验证后再：

```bash
npx wrangler deploy
```

部署后核对 Worker 地址与仓库根目录 `build.mjs` 中 `JEV_ENDPOINT` 是否一致；变更构建文件需要重新运行 `node build.mjs` 并发布静态网站。

## 三、配置

| 名称 | 作用 |
| --- | --- |
| `TYPESAFE_API_KEY` secret | 本站共享 Jev Key |
| `QUOTA_LIMITER` Durable Object | 同 IP、同 UTC 日配额及全站总配额的原子计数器 |
| `FREE_LIMIT` | 同一网络每日共享 Key 免费评分次数，默认 3 |
| `GLOBAL_DAILY_LIMIT` | 全站每 UTC 日最多免费调用数量，默认 100；是次数上限而非货币预算 |
| `ALLOWED_ORIGINS` | 浏览器跨域允许来源；生产环境建议仅保留正式域名 |
| `USE_SCREENSHOT` | `0` 代码推断；`1` 截图描述 + 代码 |
| `BROWSER` binding | Cloudflare Browser Rendering |
| `VISION_API_KEY` secret | 视觉描述服务密钥 |
| `VISION_BASE_URL`、`VISION_MODEL` | 截图描述的模型服务 |

> 计数基于 IP，公共网络会共享免费额度；换 IP 可绕过单 IP 限制，但不能绕过全站每日上限。全站配额限制调用次数，不能完全消除上游按 Token 定价的费用波动。严格防滥用应叠加登录鉴权、服务端 Token/成本预算、WAF 和监控告警。

## 四、截图模式的限制

请求拦截可阻止多数第三方网络目标，但不保证模型 HTML 在所有网页 API、版本和浏览器中都无副作用。仅允许白名单 CDNs 意味着其他外部图片／脚本可能不可用，影响画面。启用截图前必须做外部 URL、内网目标、重定向、重资源、死循环及断网测试。

源代码目前只截取前 60,000 字符参与文本评分，超过 400,000 字符的 HTML 将被拒绝。评分 API 中 `hadScreenshot` 为最终采用截图的可靠指示。避免把代码评分与视觉评分作为完全相同依据的数据展示。

## 五、回归测试

1. 用浏览器从允许／禁止 Origin 发起 OPTIONS + POST；禁止 Origin 直接返回 403。
2. 同 IP 并发 10 个 POST，应最多保留 3 个共享配额；全站超过 `GLOBAL_DAILY_LIMIT` 后全部拒绝。
3. 上游 TypeSafe 返回错误或超时后，预留额度应退款；成功请求不得重复退款。
4. 移除 `QUOTA_LIMITER` 绑定模拟错误，响应应为 503 且不请求共享 Jev Key。
5. 启用截图后验证无穷循环、超大资源、外部访问限制与截图失败降级标识。
