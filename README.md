# agent-test

智能体 / 大模型能力测试合集。用一组经典、直观的任务横向对比不同模型的实际输出效果,按「大类栏目 → 模型版本」归档,可在线查看。

🔗 在线地址:https://agentest.shimiao.work

> 导航页(首页 + 栏目页)采用 Vercel 浅色设计语言,正文字体为思源黑 / Noto Sans SC Extra Light,整体风格偏优雅、简洁。栏目页卡片缩略图为各版本的真实渲染截图(`pelican-bicycle/thumbs/`)。

## 栏目

### 🦩🚲 鹈鹕骑车 (`pelican-bicycle/`)
经典 LLM 创意基准:实现「一只骑自行车的鹈鹕」。现有 16 个模型版本。

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
| 13 | Claude Sonnet 5.5 | Tabbit | `sonnet-5.5-tabbit.html` |
| 14 | Claude Haiku 5.5 | Tabbit | `haiku-5.5-tabbit.html` |
| 15 | Muse Spark 1.3 | Muse | `muse-spark-1.3.html` |
| 16 | Space-Bunny | 匿名模型 | `space-bunny.html` |

## 目录结构

```
.
├── index.html              # 首页：大类栏目导航
├── pelican-bicycle/
│   ├── index.html          # 栏目页：各模型版本列表（卡片带真实截图）
│   ├── thumbs/             # 各版本缩略图（1280×860 渲染截图）
│   └── <model>.html        # 各模型版本页面
└── CNAME                   # 自定义域名
```

## 新增一个模型版本

1. 把 HTML 文件放进对应栏目目录,命名为 `<厂商>-<型号>.html`。
2. 用无头 Chrome 渲染一张缩略图到 `thumbs/<同名>.png`。
3. 在该栏目 `index.html` 的版本数据数组里加一行(slug / 标题 / 说明)。

## 新增一个大类栏目

1. 新建目录 + `index.html`。
2. 在根 `index.html` 加一张栏目卡片。
