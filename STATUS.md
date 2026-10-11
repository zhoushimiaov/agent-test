# Agent Test — 项目状态与路线图

> 最后更新:2026-10-11 · 站点 https://agentest.shimiao.work · 仓库 https://github.com/zhoushimiaov/agent-test

## 一、这是什么

一个对比不同大模型 / Agent「同题同框」真实输出的站点,纯静态托管在 GitHub Pages。
所有页面由 `build.mjs`(Node)从数据模型生成,共用 `assets/site.css`(Vercel 浅色风 + 思源黑 Extra Light)。
**不要手改生成出来的 `index.html`**,改 `build.mjs` 的数据后跑 `node build.mjs`。

## 二、现状(as of 2026-10-11)

### 平台定位
站点正在从「单一动物评测站」演进为「多项目平台」。**当前只有一个项目 —— Zoo Test(动物创意基准),落地页就是 Zoo Test 本身**。多项目的物理拆分暂不做(内容仍在仓库根),只在 `build.mjs` 里做了逻辑分组(`const ZOO = {...}`),为后续演进留好接口。

### 已有内容(Zoo Test 的 8 个栏目)
- **已收录 + Jev 评分排行榜**:鹈鹕骑车(25 版)、水母漂浮(10 版)、大象走钢丝(8 版)、犀牛绕地球(10 版)。
- **版本征集中(占位)**:企鹅滑雪跳台、鲸鱼在城市上空游泳、章鱼打架子鼓、狮子跳火圈。
- 每个版本页是模型产出的自包含 HTML,带注入式「← 返回首页」浮钮;缩略图为真实 headless Chrome 渲染。
- 评分来自 TypeSafe System One(`jev-latest`,纯文本判定,喂真实渲染的中性描述),各栏目独立维度 + 权重。

### 新功能:测试你的大模型(`/playground/`)—— 本次新增
让任何人用**自己的** API 端点在浏览器里跑同一道题:
- 填 Base URL + API Key + 模型名,选预设题(8 道动物题,提示词从各栏目 `PROMPT.md` 抽取)或自己写。
- 浏览器**直连**用户填写的接口(OpenAI 兼容 `/chat/completions`,支持 SSE 流式,自动兼容非流式返回)。
- 从回复里抽出完整 HTML,渲染进**沙箱 iframe**(`sandbox="allow-scripts"`,**不带** `allow-same-origin`)→ 产出代码无法读取父页面、偷不到密钥。
- 支持「下载 HTML」「新标签打开」(blob 隔离来源)。
- 逻辑在手写的 `playground/playground.js`;生成页只负责骨架 + 内嵌预设提示词 JSON(无需额外 fetch,可离线)。

### 新功能:playground 的 Jev 评分(代码已就绪,待部署)
用户跑完可对结果做 TypeSafe Jev 评分,按本站同一套 per-栏目评审规则打分(满分 100)。
- 纯静态站**做不到**「用我们的 key、每人限 3 次」(内嵌 key 必泄露、localStorage 计数可绕),且 TypeSafe 对浏览器有 451/CORS 封锁 → 用一个 **Cloudflare Worker**(`worker/`):Jev key 作 secret,**KV 按来访 IP+日期**计免费配额(默认 3),代转发绕开封锁。用户也可填**自己的** Jev key(不计配额)。
- Jev 是纯文本评审 → Worker 用 **Cloudflare Browser Rendering 截图**(方案 b)+ **视觉模型生成中立描述**,连同**源代码**(方案 c)一起喂给 Jev。`USE_SCREENSHOT=0` 时退化为只用代码(免费版可跑);`=1` 启用截图(需 Workers 付费版 + 视觉模型 key)。
- 前端:`build.mjs` 顶部 `JEV_ENDPOINT`(置空则隐藏整个评分 UI)注入页面;`playground.js` 的 `scoreWithJev()` POST 到 Worker 并复用排行榜的分数/维度条样式渲染。
- 评审规则是单一事实源 `worker/src/rubrics.js`(移植 4 个现有栏目的 task/维度/criteria + 其余栏目与自定义题的通用 4 维兜底)。
- **部署与密钥见 `worker/README.md`。本助手无 CF 凭据、未部署;需用户 `wrangler deploy` + 设 secret + 填回 `JEV_ENDPOINT`。先轮换暴露过的 TypeSafe key 再配。**

### 安全模型(硬约束,勿破坏)
- API Key 只存浏览器 `localStorage`(用户勾选「记住」才存),只发往用户自己填的接口,**绝不经过本站 / 任何服务器 / CF**。提供「忘记密钥」。
- 模型产出 HTML 一律进沙箱 iframe,不授予 same-origin。
- 本站唯一第三方资源是 Google Fonts(仅 CSS);不收集任何用户数据。

## 三、架构:当前 vs 目标

| | 当前 | 目标 |
|---|---|---|
| 落地页 | Zoo Test hub(根 `/`) | Google Labs 式「项目网格」,点进各项目 |
| 项目拆分 | 逻辑分组,内容在根 | 各项目独立 base path(如 `/zoo/`) |
| playground | 根 `/playground/`,用 Zoo 题库 | 项目级能力,各带题库的项目各开一个 |
| 数据模型 | `categories` 数组(= Zoo 的栏目) | 外层 `projects[]`,Zoo 为其一 |

迁移成本小:版本页返回钮用相对 `../`,随层级一起加深即可;资源深度由 `build.mjs` 自动算。

## 四、路线图(分步骤)

- [x] **Step 0** 平台骨架 + 测试你的大模型 MVP(本次)。
- [~] **Step 0.5** playground 的 Jev 评分:Worker + KV 配额 + 截图/视觉描述(方案 b+c)**代码已就绪**,待用户部署 Cloudflare Worker 并填回 `JEV_ENDPOINT`。
- [ ] **Step 1** playground 增强:`/models` 拉取模型下拉;temperature / max_tokens 等参数;把用户产出与该栏目已归档缩略图并排对比;一次跑多题。
- [ ] **Step 2** 自定义卡通 icon:当前首屏用放大 emoji(鹈鹕=火烈鸟)。待有生图额度(OpenAI 或其他服务商 key)后生成 1:1 定制插画替换,并给各栏目设 `cover:`。
- [ ] **Step 3** 补齐 4 个占位栏目(企鹅 / 鲸鱼 / 章鱼 / 狮子)的模型版本与评分。
- [ ] **Step 4** 第二个项目落地 → 根切换为 Labs 式项目网格,Zoo 内容下沉到 `/zoo/`;给旧路径加 `meta refresh` 跳转兜底(用户要求「内容完整了再加」)。
- [ ] **Step 5**(可选)把各栏目 `PROMPT.md` 的题面以「查看题目」形式呈现到站上。

## 五、已知限制

- **CORS**:纯静态站只能连开放跨域的接口(OpenRouter、OpenAI、多数兼容服务 OK;封 CORS 的连不上)。不做代理以守住「密钥不过服务器」的底线。
- **混合内容**:HTTPS 站可连 `http://localhost`(本地模型例外放行),但连不了其他明文 `http://` 公网端点;本地服务需自开 CORS(Ollama 设 `OLLAMA_ORIGINS=*`)。

## 六、密钥与运维

- `TYPESAFE_API_KEY` 只在环境变量 / 命令行内联,**绝不入库**;评分脚本须带 `NODE_USE_ENV_PROXY=1`(Node fetch 默认忽略代理,TypeSafe 会 451)。
- 曾在对话里明文出现过的 TypeSafe、Cloudflare、OpenAI 三个 key 建议轮换 / 吊销。
- 构建:`node build.mjs`(生成 hub + playground + 8 栏目页 + 刷新 53 个版本页返回钮)。渲染缩略图见仓库记忆笔记里的 headless Chrome 心得。
