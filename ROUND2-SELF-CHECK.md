# Agent Test — 第二轮修复与自检记录

> 日期：2026-10-20  
> 工作分支：`fix/security-round1-20261020`  
> 范围：`REVIEW.md` 的 STATE-01、STREAM-01、SCORE-01、EVAL-01（评分依据披露部分）及部署工作流。  
> 状态：静态检查与自动化单元测试通过；Cloudflare 生产部署待合并后验证。

## 修改内容

### STATE-01（Playground 状态隔离）
- 每次运行生成独立 `runToken` 和不可变的结果对象：`id`、`html`、`slug`、`prompt`、`model`、`createdAt`。
- 新运行前取消旧评分、清空旧预览与下载按钮；错误、停止或没有 HTML 结果时，不再沿用上轮作品。
- 评分时只使用作品生成时保存的题目和 Prompt；旧请求完成后检查 token 和结果对象引用，避免覆盖新运行结果。
- 取消执行的 fetch 不再更新界面。

### STREAM-01（流式输出）
- 新增 `playground/stream.mjs`，分离 SSE 解析、Chat Delta 提取与流读取。
- 支持 LF/CRLF、跨 chunk 分片、多行 data、注释、最后事件 flush、Unicode 分片、[DONE]。
- `requestAnimationFrame` 批处理 DOM 更新，最终完整刷新；[DONE] 后主动取消上游 reader。

### SCORE-01（数据验证及前端渲染）
- 新增 `worker/src/score.js`：验证分数与置信度的有限数字、允许区间、评分标准权重和维度完整性。
- 新增 `playground/score.mjs`：验证 Worker 响应结构、总分、维度、置信度、剩余额度与模式标志。
- 评分结果改为 DOM textContent/replaceChildren 渲染，不向 innerHTML 插入服务端字符串。

### EVAL-01（评分依据披露）
- Worker 响应增加 `sourceTruncated`；若只使用 HTML 前 60,000 个字符，将在前端标明。
- 页面明确区分“仅代码推断”与“单帧截图描述 + 代码”；自带 Jev Key 时仅代码评分。
- 不把单帧截图当作完整动画质量验证。多帧视觉评测与评分方法版本化属于后续增强。

### 发布配置
- 新增 `.github/workflows/deploy-worker.yml`：仅允许 main 发布；自动运行 Worker 单元测试、Wrangler deploy，并检查 CORS OPTIONS 返回 204。
- 需 GitHub Secrets：`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。缺少时部署任务会明确失败，不会声称已发布。
- `USE_SCREENSHOT=0` 保持不变，避免未经生产安全验证启用云端浏览器。

## 自检记录

| 检查 | 结果 |
| --- | --- |
| Node JS 语法检查 | 通过（CI） |
| SSE CRLF/任意分片/多行 data/Unicode/[DONE] | 通过（Node 单测） |
| 前端评分响应非法值、缺项、错误模式 | 通过（Node 单测） |
| Worker 分数非法值、权重不为 100、缺项 | 通过（Node 单测） |
| 配额并发上限、全站额度、幂等退款、过期 | 通过（Node 单测） |
| `node build.mjs` 后输出页面与提交文件一致性 | 通过（CI） |
| 浏览器端到端（真实模型生成/预览/停止/评分） | 本次未运行 |
| Cloudflare Durable Object 实际部署与生产调用 | 本次未运行，待部署流程反馈 |

通过的 CI 记录：
- https://github.com/zhoushimiaov/agent-test/actions/runs/39372293777
- https://github.com/zhoushimiaov/agent-test/actions/runs/39372289916

## 合并与部署规则

1. 只有最新提交的 CI 通过、PR 可合并后，才合并 main。
2. 合并应触发 `Deploy Cloudflare Worker` 的 main/push 事件；查看 Actions 中的真实结果判断是否部署成功。
3. Worker 的生产部署需要 Cloudflare GitHub Secrets 以及有效的 Durable Object migration 权限。
4. 未完成真实浏览器 E2E、截图恶意内容测试、多帧视觉评分前，不标记这些项目为已验收。

**本报告不代表生产部署成功。**
