# Agent Test — 代码审查报告（REVIEW）

> 审查日期：2026-10-20  
> 仓库：[zhoushimiaov/agent-test](https://github.com/zhoushimiaov/agent-test)  
> 审查基线：[e51e6025d873d83ec10025bc894d0e223e4b92cc](https://github.com/zhoushimiaov/agent-test/commit/e51e6025d873d83ec10025bc894d0e223e4b92cc)（main）  
> 范围：构建脚本、静态页面、Playground、Cloudflare Worker、评分脚本、资源清单、文档与样式。  
> 方法：只读静态审查及数据／链接一致性核对；**未执行浏览器端到端测试、Worker 线上调用、依赖漏洞扫描或渗透测试**。以下风险除明确说明外均为代码分析结果，需通过测试确认利用条件。

## 摘要与审查结论

**结论：保留当前静态架构，先处理安全边界和评分正确性，再做性能及结构优化。** 项目已经能将不同模型输出组织为 8 个栏目、102 个已发布作品入口及 8 个 Jev 排行榜；逐栏目核对后，页面引用的作品 HTML、WebP 缩略图和评分结果条目均有匹配文件，未发现缺失引用。关键风险集中在不可信模型 HTML 与网站同源运行、Worker 免费额度控制及评分过程与界面承诺不一致。

### 优先级与风险说明

- **P0 / Blocker**：应在公开推广“记住 API Key”等功能前解决，可能导致用户密钥泄露。
- **P1 / High**：影响费用控制、安全边界、评分公平性或核心操作正确性。
- **P2 / Medium**：影响边界场景、性能、异常恢复、可维护性或无障碍。

| ID | 优先级 | 问题 | 主要文件 |
| --- | --- | --- | --- |
| SEC-01 | P0 | 同源 Blob 新标签页、模型作品页与持久化 Key 之间存在隔离缺口 | playground/playground.js、build.mjs |
| SEC-02 | P1 | KV 配额非原子、缺失 KV 时放行；CORS 不等于鉴权 | worker/src/index.js |
| SEC-03 | P1（启用截图前） | 将不可信 HTML 放入服务端浏览器执行，缺少资源／出站网络策略 | worker/src/index.js |
| EVAL-01 | P1 | 当前 Worker 代码评分，不是默认“截图 + 代码”评分 | worker/wrangler.toml、worker/src/index.js、build.mjs |
| STATE-01 | P1 | 上次 HTML 可被误用；变更题目后按新题目评旧结果 | playground/playground.js |
| STREAM-01 | P2 | SSE 解析边界与全量 DOM 重绘问题 | playground/playground.js |
| SCORE-01 | P2 | 外部评分数据缺少有限数、区间与结构校验 | worker/src/index.js、playground/playground.js |
| BUILD-01 | P2 | 重复评分实现、构建缺少输入数据校验与自动化测试 | jev-score-*.mjs、build.mjs |
| UX-01 | P2 | 交互与无障碍细节、文档过期 | assets/site.css、README.md、STATUS.md |

## 详细发现

### SEC-01 · P0：模型代码和 API Key 未形成完整来源隔离

**证据位置：**
- [playground/playground.js（配置与 Key 存储，约 L20–40）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/playground/playground.js#L20-L40)
- [playground/playground.js（Blob 新标签页，约 L87–99）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/playground/playground.js#L87-L99)
- [playground/index.html（沙箱预览，约 L50–58）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/playground/index.html#L50-L58)
- [build.mjs（直接链接同域作品，约 L360–384）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/build.mjs#L360-L384)

**问题：** 站内嵌预览的 iframe 已使用 sandbox=allow-scripts 且没有 allow-same-origin，这是正确的防护。但“新标签打开”直接将不可信模型 HTML 包装成当前页面创建的 Blob URL，再以顶层文档打开。Blob URL 通常继承创建者来源；脚本执行条件满足时，新页面可能访问当前来源的 localStorage，其中可存在用户选择保存的 API Key。独立的模型版本 HTML 也由本站同一域名直接提供，其中部分页面自带 JavaScript、外部脚本；只要这些作品与 Playground 同源，便不应被当作安全隔离的执行环境。

**建议：**
1. 禁止以当前源的顶层 Blob 文档执行模型返回的任意脚本；“新标签预览”改为经过验证的独立隔离来源，或保持 sandbox iframe，必要时暂时移除新标签运行入口。
2. 将模型作品页部署到与输入密钥的 Playground **不同 origin**，并确认这两个 origin 不共享 localStorage、Cookie 及其他可读凭据。
3. 默认只在运行期内存保留密钥；如果保留“记住密钥”，给出清晰风险提示，并确保输入 Key 的页面不承载不可信脚本。
4. 为页面配置适当的 CSP、Referrer-Policy 与资源权限策略；CSP 不能替代来源隔离。

**验收：** 用测试 HTML 尝试读取 localStorage、访问父窗口或在新标签页读 Key，均不能读到 Playground 凭据；所有正常预览仍可运行。

### SEC-02 · P1：免费额度控制非原子，且存在 fail-open 行为

**证据位置：** [worker/src/index.js（约 L79–118）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/worker/src/index.js#L79-L118)。

**问题：** 免费额度的 KV get → 判断 → put 是读改写流程；并发请求可能读到相同旧值，超过声明的每日 3 次。若 QUOTA 未绑定，checkQuota 直接返回放行，形成 fail-open。出错后 refundQuota 再次读取并递减计数，也可能与其他请求竞争。只验证 Origin/CORS 不能阻止 curl、服务端脚本等非浏览器客户端直接调用；按 IP 配额只能作为轻量防滥用策略。

**建议：**
1. 使用 Durable Objects 或支持原子递增的计数／配额服务；将预扣和失败回滚设计为关联到单次请求的幂等操作。
2. 免费共享 Key 模式下若 QUOTA 未绑定，应拒绝或明确进入不提供免费额度状态，而不是无限放行。
3. 叠加 Cloudflare Rate Limiting、每日总成本预算、请求体大小限制和异常流量监控；需要严格按用户计费时引入账号鉴权。
4. 配置合理的连接、读写和上游重试超时；对不同来源返回合适状态码。

**验收：** 对同一身份并发发起 10 次免费评分，实际可计费调用不超过额度；缺少 KV、上游异常和并发回滚均有可预测结果。

### SEC-03 · P1：服务端截图执行环境需要沙箱与网络限制

**证据位置：** [worker/src/index.js（约 L121–134）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/worker/src/index.js#L121-L134)、[worker/wrangler.toml（约 L16–35）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/worker/wrangler.toml#L16-L35)。

**问题：** 截图路径使用 page.setContent 载入并执行用户提交的 HTML，当前未看到出站请求拦截、目标地址限制、子资源策略或完整的资源限额。生成代码可包含脚本、外部资源和持续运行逻辑。具体网络可达范围取决于 Cloudflare 的浏览器隔离机制，需要验证，不能直接假定一定存在内网访问能力。配置中 USE_SCREENSHOT=0，因此这主要是**未来启用截图前必须完成的安全工作**。

**建议：** 限制请求目的地与危险协议、拦截无关第三方资源，设定浏览器／页面整体超时和并发上限，限定截图大小、CPU／内存消耗；确保失败时释放浏览器。对基于代码的降级评分显式标识，不要悄悄标为视觉评分。

**验收：** 恶意外链、死循环、超大资源、页面跳转与长时间动画测试均不能突破资源预算；Browser 实例无泄漏。

### EVAL-01 · P1：评分依据与当前页面文字存在偏差

**证据位置：**
- [worker/wrangler.toml（USE_SCREENSHOT=0）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/worker/wrangler.toml#L16-L23)
- [worker/src/index.js（截取源码，约 L169–183）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/worker/src/index.js#L169-L183)
- [build.mjs（评分文案，约 L525–543）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/build.mjs#L525-L543)

**问题：** 默认 Worker 未启用截图，评分主要依赖源代码（最多前 60,000 字符）；可接受的 code 上限是 400,000 字符。页面说明却写成“把渲染截图的中立描述 + 源代码一起交给 Jev”。代码评价不能稳定代表最终视觉效果，尤其不能充分判断动态动作、材质、遮挡和流畅度；固定单帧截图也不足以判断完整动画。

**建议：**
1. 当前模式在 UI 里明确写为“仅代码推断评分”，并说明不等价于真实渲染评价。
2. 若启用视觉模式，采用可重复的截图宽高、时刻与多帧采样；保留生成截图、事实描述、评分标准版本及源文件 SHA。
3. 大文件采取安全的内容摘要／结构提取或明确拒绝，避免无提示地只评价文件前段；评审方式不同的结果应在排行榜中加以区分。
4. 将公开榜单和 Playground 的评审依据、版本、时间和可复现信息统一记录。

**验收：** 用户能从每条分数识别“代码／单帧／多帧”依据；同版本重复评分可解释差异，错误或缺少截图时不会误报为视觉评分。

### STATE-01 · P1：结果状态和题目状态绑定不足

**证据位置：** [playground/playground.js（约 L71–145、L210–225）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/playground/playground.js#L71-L145)。

**问题：** 新运行时虽然清空 iframe 和下载按钮，却没有同步清空 lastHtml，也没有重置当前评分按钮／评分结果。新运行失败后，旧 HTML 仍可能进入评分。评分时重新读取当前选题和文本，用户只要在输出后改选题或编辑 Prompt，就可能用新任务标准评价旧作品。

**建议：** 对每次运行建立不可变的 run 对象：runId、model、baseURL（不包含 Key）、prompt、slug、html、时间及评分信息；新运行时统一重置按钮和评分 UI；请求结束只允许当前 runId 更新页面；评分始终使用该运行当时的 prompt 和 slug。

**验收：** 失败后不能给上一轮结果误评分；A 题生成后切到 B 题仍按 A 题评分，或要求明确重新运行；Stop 后旧响应不再覆盖新结果。

### STREAM-01 · P2：SSE 解析及长输出渲染开销

**证据位置：** [playground/playground.js（约 L102–172）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/playground/playground.js#L102-L172)。

**问题：** 目前按换行拆分 data 行，未完整处理多行 SSE 事件、末尾残留缓存以及更复杂的兼容响应；每段 token 都以持续增长的完整字符串重设 raw.textContent，长代码会发生重复 DOM 更新和明显主线程开销。

**建议：** 使用可测试的增量 SSE parser，按事件分隔符处理 CRLF、多行 data、[DONE] 和末尾数据；UI 使用 requestAnimationFrame 或固定节流频率批量渲染文本；提供输出长度上限或折叠策略。

**验收：** 逐字节分片、跨 chunk JSON、多行 data、无结尾换行等模拟输入正确；长 HTML 输出时操作界面不卡顿。

### SCORE-01 · P2：上游评分数据校验不足

**证据位置：**
- [worker/src/index.js（约 L183–200）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/worker/src/index.js#L183-L200)
- [playground/playground.js（约 L193–209）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/playground/playground.js#L193-L209)

**问题：** Worker 直接使用返回的分数参与计算，未检查 Number.isFinite、上下界、权重和维度完整性；异常值可能生成无效总分或 JSON null。前端还把部分评分字段组装到 innerHTML，理应避免信任未校验的服务响应。

**建议：** 在 Worker 层检查所有 score、confidence 与计算结果为有限数字、在期望范围内；校验评分响应结构并明确报错。在前端用 textContent／DOM 节点填充文本、对数值做 clamp，不直接插入未验证字符串。

**验收：** 遇到缺项、字符串、NaN、负分、超范围分数及恶意文本时显示错误状态，不产生错误进度条或 DOM 注入。

### BUILD-01 · P2：构建与评分流程需要单一事实源

**证据位置：**
- [build.mjs（版本／栏目数据，约 L24–210）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/build.mjs#L24-L210)
- [build.mjs（评分映射与生成，约 L10–16、L360–414、L561–585）](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/build.mjs#L10-L16)
- [jev-score.mjs](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/jev-score.mjs)、[jev-score-rhino.mjs](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/jev-score-rhino.mjs)、[worker/src/rubrics.js](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/worker/src/rubrics.js)

**问题：** 8 个评分脚本在请求、计算、排序、输出上有明显重复；Worker 又维护评审规则，存在未来规则漂移风险。构建时直接假定 scores.json 数据完整、每个分数维度均存在，异常数据可能让整个构建失败或生成不一致的页面。仓库根部未发现自动化测试或 CI 工作流。

**建议：**
1. 将栏目元信息／版本清单拆成配置文件，统一校验 slug、HTML、缩略图、评分条目和权重和。
2. 提取共享 score-client、score-math、rubrics、serialization 模块；尽量让公开榜单与 Playground 引用同一版本化规则。
3. 添加 GitHub Actions：Node 语法／构建检查、链接资源检查、JSON schema 测试、配额并发单测和 Playground 浏览器冒烟测试。
4. 避免构建时无必要地修改所有原始模型页面，尽可能将返回导航以包装页面或统一工具层实现，减少生成文件噪音。

**验收：** 新增模型只需修改数据文件并添加作品／截图；错误的 scores.json 在 CI 明确报错；无差异构建不会重复产生大批改动。

### UX-01 · P2：细节与文档一致性

**证据位置：** [assets/site.css](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/assets/site.css)、[README.md](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/README.md)、[STATUS.md](https://github.com/zhoushimiaov/agent-test/blob/e51e6025d873d83ec10025bc894d0e223e4b92cc/STATUS.md)。

**问题：** CSS 中 .ver .shot 定义重复；未看到针对 prefers-reduced-motion 的动画降级或统一的 :focus-visible 视觉反馈；部分灰字、轻字重、小号评分标签值得进行对比度与可读性检查。README 仍描述鹈鹕为 25 版本、大象与水母未评分，STATUS 仍保留 2026-10-11 时的早期版本数量和 Worker 待部署描述，与审查快照中的生成站点不一致。

**建议：** 清理重复声明，完善键盘焦点、移动端换行、减少动态效果偏好和图片加载失败兜底；由清单自动生成统计段落；更新部署状态时以真实 Worker 运行及配置验证结果为准，不仅凭源码中存在 endpoint。

**验收：** 键盘可完整操作 Playground；减少动态效果设置生效；文档描述与生成页面一致。

## 推荐分轮修复

### 第一轮：安全与可靠性（优先）

- [ ] SEC-01：为 Playground 的 Key 输入界面和所有不可信 HTML 建立严格来源隔离。
- [ ] SEC-01：修正／临时禁用新标签运行 Blob HTML，评估 Key 持久化策略。
- [ ] SEC-02：替换非原子 KV 计数，补全限流、预算和 fail-closed 行为。
- [ ] SEC-03：将截图功能的安全隔离与限额作为启用前置条件。

### 第二轮：评审正确性与性能

- [ ] STATE-01：引入 per-run 状态，锁定对应 Prompt、slug 和输出。
- [ ] EVAL-01：公开评分依据与视觉模式；必要时增加多帧测试。
- [ ] SCORE-01：验证评分数据；安全渲染分数字段。
- [ ] STREAM-01：完善 SSE 解析、节流更新和停止请求测试。

### 第三轮：工程质量与体验

- [ ] BUILD-01：评分规则／数学逻辑共享，栏目元数据配置化。
- [ ] BUILD-01：补全 CI、单元测试、资源完整性检查和浏览器冒烟测试。
- [ ] UX-01：完成可访问性、样式与文档维护优化。

## 核心回归测试清单

| 场景 | 预期 |
| --- | --- |
| 模型 HTML 在 iframe 和新标签运行恶意脚本 | 不能读取 Playground 所在来源保存的 Key |
| 已发布模型作品带第三方脚本 | 不能访问 Playground Key 或父页 |
| 同一访客并发 10 次免费评分，额度=3 | 计费调用次数不超过 3 |
| Worker KV 丢失／未绑定 | 不会无限放行本站共享 Key |
| 生成 A 题后改选 B 题直接评分 | 评分仍绑定 A 题或要求重新生成 |
| 生成成功后再次生成失败 | 不出现旧输出被误评分 |
| 超长 SSE 及异常断流 | UI 可恢复、Stop 生效，输出不丢失或误拼接 |
| Jev 返回缺少维度或非法分数 | 明确失败，不出现 NaN／超 100 分 |
| 截图服务不可用 | 标为代码评分或评分失败，不伪称视觉评分 |
| 构建站点 | 每个模型链接、缩略图和 scores.json 能一一对应 |

## 审查边界与说明

- 本轮核对了 8 个栏目、102 个页面入口、对应缩略图与评分数据之间的一致性；这些结果只证明资源路径存在，不代表 HTML 必然能在所有浏览器正确渲染。
- 并未完整逐行审计全部模型生成 HTML，也没有对部署状态、运行成本、真实截图及 CORS 进行实测；不应把本报告当作已完成渗透测试的证明。
- 基线为 2026-10-20 的提交 e51e6025。后续修改应以新提交为基线复查，并在对应问题下标记修复提交、测试记录与完成日期。
- **本文件仅是审查报告，本次未更改业务代码、评分数据或部署配置。**
