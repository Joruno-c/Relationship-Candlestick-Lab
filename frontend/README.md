# Python 服务的网页界面

本目录提供 Python 版本的首页、任务进度和互动图表，由 [FastAPI 后端](../relationship_candlestick/server.py) 提供页面与接口。请在仓库根目录启动：

```bash
python start.py
```

启动脚本会打开浏览器。网页通过同源的 `/api/` 请求导入已有评分、运行分析、加载匿名群聊示例，并获取各周期 K 线、消息事件和技术指标。

| 文件 | 用途 |
|---|---|
| [index.html](index.html) | 页面结构、表单和图表容器 |
| [app.js](app.js) | 页面导航、接口调用、任务历史与图表交互 |
| [style.css](style.css) | 页面布局、配色和响应式样式 |
| [vendor/](vendor/README.md) | 随仓库提供的 Lightweight Charts 图表库及许可说明 |

本界面直接使用 HTML、JavaScript 和 CSS，无需前端构建步骤。GitHub Pages 在线版的 React 源码另见 [online/](../online/README.md)；完整安装与输入格式见 [项目说明](../README.md)。
