# agent-test

智能体 / 大模型能力测试合集。用一组经典、直观的任务横向对比不同模型的实际输出效果,按「大类栏目 → 模型版本」归档,可在线查看。

🔗 在线地址:https://agentest.shimiao.work

> 导航页(首页 + 栏目页)采用 Vercel 浅色设计语言,正文字体为思源黑 / Noto Sans SC Extra Light,整体风格偏优雅、简洁。所有页面共用一张样式表 `assets/site.css`,由 `build.mjs` 统一生成。栏目页卡片缩略图为各版本的真实渲染截图(如 `pelican-bicycle/thumbs/`)。

## 栏目

| 栏目 | 目录 | 考点 | 状态 |
| --- | --- | --- | --- |
| 鹈鹕骑车 | `pelican-bicycle/` | 空间想象 + 前端功力 | 18 个版本 |
| 水母漂浮 | `jellyfish-float/` | 半透明材质、柔体律动、水下光线 | 版本征集中 |
| 企鹅滑雪跳台 | `penguin-ski-jump/` | 斜坡腾空落地的 3D 相机与阴影 | 版本征集中 |
| 鲸鱼在城市上空游泳 | `whale-over-city/` | 超现实尺度 + 云层前后遮挡 | 版本征集中 |
| 大象走钢丝 | `elephant-tightrope/` | 身躯 + 平衡杆 + 钢丝下垂张力 | 版本征集中 |
| 章鱼打架子鼓 | `octopus-drummer/` | 八腕到各鼓件的分配与协调 | 版本征集中 |
| 犀牛绕地球 | `rhino-orbit/` | 轨道运动与天体尺度关系 | 版本征集中 |
| 狮子跳火圈 | `lion-fire-hoop/` | 抛物线 + 火圈粒子 + 落地时机 | 版本征集中 |

### 🦩🚲 鹈鹕骑车 (`pelican-bicycle/`)
经典 LLM 创意基准:实现「一只骑自行车的鹈鹕」。现有 18 个模型版本。

| # | 版本 | 来源 / 说明 | 文件 |
| --- | --- | --- | --- |
| 01 | Gemini 3.8 Flash | 海岸飞车 | `gemini-3.8-flash.html` |
| 02 | GLM 5.3 Flash | 落日骑行 | `glm-5.3-flash.html` |
| 03 | GLM 5.3 | Three.js 3D | `glm-5.3-3d.html` |
| 04 | Tierflow-Pro 自动路由 | glm/qwen/ds | `tierflow-pro-router.html` |
| 05 | Tierflow-Pro 自动路由 | glm/qwen/ds · 3D | `tierflow-pro-router-3d.html` |
| 06 | MiMo 2.6 Pro | 小米 MiMo | `mimo-2.6-pro.html` |
| 07 | Qwen 3.8 Max | Tabbit · SVG | `qwen-3.8-max-tabbit.html` |
| 08 | Qwen 3.8 Max | Qoder WorkCN | `qwen-3.8-max-qoder.html` |
| 09 | DeepSeek 4.1 Flash | SVG 动画 | `deepseek-4.1-flash.html` |
| 10 | K2.8 Preview | 预览版 | `k2.8-preview.html` |
| 11 | K3 | 小浣熊 Raccoon | `k3-raccoon.html` |
| 12 | K3 | Crush | `k3-crush.html` |
| 13 | K3 | SVG 动画 · 鹈鹕兜风 | `k3-svg.html` |
| 14 | K3 | Three.js 3D 场景 | `k3-3d.html` |
| 15 | Claude Sonnet 5.5 | Tabbit | `sonnet-5.5-tabbit.html` |
| 16 | Claude Haiku 5.5 | Tabbit | `haiku-5.5-tabbit.html` |
| 17 | Muse Spark 1.3 | Muse | `muse-spark-1.3.html` |
| 18 | Space-Bunny | 匿名模型 | `space-bunny.html` |

## 目录结构

```
.
├── index.html              # 首页：大类栏目导航（由 build.mjs 生成）
├── build.mjs               # 站点生成器：栏目/版本数据 → 首页 + 各栏目 index.html
├── assets/
│   └── site.css            # 共享样式表（Vercel 浅色设计语言）
├── pelican-bicycle/
│   ├── index.html          # 栏目页：各模型版本列表（卡片带真实截图）
│   ├── thumbs/             # 各版本缩略图（渲染截图）
│   └── <model>.html        # 各模型版本页面
├── <其他栏目>/
│   └── index.html          # 空栏目：版本征集中占位页
└── CNAME                   # 自定义域名
```

## 新增一个模型版本

1. 把 HTML 文件放进对应栏目目录,命名为 `<厂商>-<型号>.html`。
2. 用无头 Chrome 渲染一张缩略图到该栏目的 `thumbs/<同名>.png`。
3. 在 `build.mjs` 里把该版本加进对应栏目的 `versions` 数组(`[slug, 名称, 说明]`)。
4. 运行 `node build.mjs` 重新生成页面。

## 新增一个大类栏目

1. 在 `build.mjs` 的 `categories` 数组里加一个栏目对象(slug / title / emoji / blurb / exam)。
2. 运行 `node build.mjs`,会自动生成栏目目录与「版本征集中」占位页,并刷新首页卡片。
