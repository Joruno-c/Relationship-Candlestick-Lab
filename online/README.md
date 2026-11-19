# 关系 K 线 · 在线实验室

可通过网址使用的聊天互动分析应用。公开演示使用 1,497 条匿名化课程群聊数值样本；新文件由访客从浏览器选择，使用访客自己的 API Key 调用所选模型服务。

## 使用方式

1. 打开网址，点击匿名群聊演示即可体验多周期 K 线、指标、消息搜索和报告。
2. 分析新记录时选择 CSV、JSON、JSONL 或 TXT，核对解析预览。
3. 选择群聊协作或双人互动模式、模型服务和模型名称，填写自己的 API Key，开始分析。
4. 可导出评分结果并在另一台电脑重新导入。应用没有共享聊天数据库，也不自动同步访客上传的数据。

公开样本的成员已匿名化，正文与理由为占位文本，保留时间和数值轨迹。它用于检验指数与图表计算，不能用来重评原句语义。

## 数据处理

- 文件解析与图表计算在浏览器执行；AI 评分请求经过本站后端，发往访客选定的 OpenAI、DeepSeek 或 Anthropic 固定端点。
- API Key 仅在请求期间使用，不写入应用数据库或浏览器持久存储。上传内容和评分默认保留在当前页面，刷新前请自行导出。
- AI 请求可能产生访客模型账户的费用。站点不提供共享的模型凭据，不会替访客使用站点所有者的 API 额度。
- API 仅允许固定服务商，验证输入规模和评分对应关系；模型返回不完整或错误时显示失败，不伪造缺失评分。
- 聊天内容属于待分析数据，不能作为改变评分规则或服务行为的指令。

## 开发与验证

Node.js 22.13+，依赖与构建使用 Sites 提供的 Vinext / Cloudflare Workers 工作流。

```bash
npm ci
npm run dev
node --experimental-strip-types --test tests/analysis.test.ts tests/ai.test.ts
npx tsc --noEmit
npm run build
```

源代码保留在本项目目录；`.openai/hosting.json` 保存站点身份。源码、构建产物与部署版本由 Sites 工具同步。构建产物、运行缓存和凭据不纳入 Git。

## 授权

应用代码见 [MIT LICENSE](LICENSE)。图表运行库采用 Apache 2.0，附 [LICENSE](public/vendor/LICENSE-lightweight-charts.txt) 与 [NOTICE](public/vendor/NOTICE-lightweight-charts.txt)。
