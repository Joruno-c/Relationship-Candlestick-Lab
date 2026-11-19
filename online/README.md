# 关系 K 线 · 在线实验室

可通过网址使用的聊天互动分析应用。公开演示使用 1,497 条匿名化课程群聊数值样本；新文件由访客从浏览器选择，使用访客自己的 API Key 调用所选模型服务。

**[打开关系 K 线在线实验室](https://joruno-c.github.io/Relationship-Candlestick-Lab/)**

前端由 GitHub Pages 提供，浏览器地址使用 `joruno-c.github.io`，不含 `chatgpt`。AI 分析仍复用原 Sites 服务的 [`/api/analyze` 接口](https://relationship-candlestick-lab-joruno.perfectcube2.chatgpt.site/api/analyze)；更换前端网址不改变模型请求的数据处理路径。

## 使用方式

1. 打开网址，点击匿名群聊演示即可体验多周期 K 线、指标、消息搜索和报告。
2. 分析新记录时选择 CSV、JSON、JSONL 或 TXT，核对解析预览。
3. 选择群聊协作或双人互动模式、模型服务和模型名称，填写自己的 API Key，开始分析。
4. 可导出评分结果并在另一台电脑重新导入。应用没有共享聊天数据库，也不自动同步访客上传的数据。

选中 K 线后，左侧信息卡展示开高低收（OHLC）、涨跌、互动量、主导维度和关键时刻的脱敏分析理由。匿名演示隐藏具体聊天正文，仍保留这些数值与判断依据。

公开样本的成员已匿名化，具体消息正文继续隐藏；关键时刻保留来自原分析的理由，并概括个人事件、精确日程与其他可识别细节。理由展示当时的互动判断与不确定性，没有重新评分或编造解释；时间和数值轨迹保持不变。由于原文未公开，样本可用于查看分析过程和检验图表计算，不能独立重评原句语义。

在线样本是 [`public/sample.json`](public/sample.json)，审核和校验信息见 [`public/sample-manifest.json`](public/sample-manifest.json)。主仓库的 `examples/group_chat/` 是 Python 数值回归样本，其正文和理由均为占位文本；它与在线样本的理由展示方式不同。

## 数据处理

- 文件解析与图表计算在浏览器执行；AI 评分请求从 Pages 前端发往原 Sites 分析后端，再转给访客选定的 OpenAI、DeepSeek 或 Anthropic 固定端点。
- API Key 仅在请求期间使用，不写入应用数据库或浏览器持久存储。上传内容和评分默认保留在当前页面，刷新前请自行导出。
- AI 请求可能产生访客模型账户的费用。站点不提供共享的模型凭据，不会替访客使用站点所有者的 API 额度。
- API 仅允许固定服务商，验证输入规模和评分对应关系；模型返回不完整或错误时显示失败，不伪造缺失评分。
- 聊天内容属于待分析数据，不能作为改变评分规则或服务行为的指令。

## 开发与验证

Node.js 22.13+。本项目在主仓库中位于 `online/`；以下命令均在该目录执行。完整应用和分析后端使用 Sites 提供的 Vinext / Cloudflare Workers 工作流，Pages 前端使用独立的 Vite 静态构建。

```bash
npm ci
npm run dev
node --experimental-strip-types --test tests/analysis.test.ts tests/ai.test.ts
npx tsc --noEmit
npm run build
```

源代码保留在本项目目录；`.openai/hosting.json` 保存站点身份。源码、构建产物与部署版本由 Sites 工具同步。构建产物、运行缓存和凭据不纳入 Git。

## GitHub Pages 构建与部署

```bash
npm ci
npm test
npm run typecheck
npm run build:pages
npm run preview:pages
```

`npm run build:pages` 使用 [`vite.pages.config.ts`](vite.pages.config.ts)，从 `static-pages/` 构建共享前端，输出到 `dist-pages/`；资源前缀为 `/Relationship-Candlestick-Lab/`。本地预览打开 `http://localhost:4173/Relationship-Candlestick-Lab/`，可核对匿名演示和界面。本地完整 AI 流程使用 `npm run dev` 提供的同源接口；正式分析接口仅允许配置中的站点来源。

主仓库通过 [Pages 工作流](../.github/workflows/pages.yml) 构建并上传 `online/dist-pages/`，部署至 [公开网址](https://joruno-c.github.io/Relationship-Candlestick-Lab/)。仓库 **Settings → Pages → Source** 使用 **GitHub Actions**。推送到 `main` 后由工作流发布，也可在 **Actions** 中选择 Pages 工作流并点击 **Run workflow** 手动发布；不要把 `node_modules/`、开发缓存或 API Key 上传为静态资源。

Pages 发布的是静态前端；新聊天 AI 分析依赖原 Sites 后端继续运行。接口地址由 Pages 构建配置中的 `__RCL_ANALYZE_URL__` 指定，Sites 版本默认使用同源 `/api/analyze`。当前后端允许 `https://joruno-c.github.io` 的跨域请求。若迁移后端或前端域名，需要同时更新构建配置与后端的来源白名单，再分别重新部署；仅更新 Pages 不会发布后端代码。后端仍使用 `npm run build` 和原 Sites 部署流程。

## 授权

应用代码见 [MIT LICENSE](LICENSE)。图表运行库采用 Apache 2.0，附 [LICENSE](public/vendor/LICENSE-lightweight-charts.txt) 与 [NOTICE](public/vendor/NOTICE-lightweight-charts.txt)。
