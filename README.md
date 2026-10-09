# agent-test

智能体 / 大模型能力测试合集。用一组经典、直观的任务横向对比不同模型的实际输出效果，按「大类栏目 → 模型版本」归档，可在线查看。

🔗 在线地址：https://agentest.shimiao.work

## 栏目

### 🦩🚲 鹈鹕骑车 (`pelican-bicycle/`)
经典 LLM 创意基准：实现「一只骑自行车的鹈鹕」。

| 模型版本 | 文件 |
| --- | --- |
| Gemini 3.8 Flash | `pelican-bicycle/gemini-3.8-flash.html` |

## 目录结构

```
.
├── index.html              # 首页：大类栏目导航
├── pelican-bicycle/
│   ├── index.html          # 栏目页：各模型版本列表
│   └── gemini-3.8-flash.html
└── CNAME                   # 自定义域名
```

## 新增一个模型版本

1. 把 HTML 文件放进对应栏目目录，命名为 `<厂商>-<型号>.html`。
2. 在该栏目的 `index.html` 里加一张卡片。

## 新增一个大类栏目

1. 新建目录 + `index.html`。
2. 在根 `index.html` 加一张卡片。
