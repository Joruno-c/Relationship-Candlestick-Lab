# Python 分析核心

本包负责聊天解析、已有评分加载、指数递推、时间聚合、图表报告和本地 Web 服务。命令入口是 [cli.py](cli.py)，在仓库根目录查看帮助：

```bash
python -m relationship_candlestick --help
```

`prepare` 将聊天解析为消息 JSONL；`ingest` 将已评分 JSONL 转成 K 线与报告；`analyze` 执行解析和评分流程；`serve` 启动本地网页。安装后也可使用 `relationship-candlestick` 命令。

| 模块 | 职责 |
|---|---|
| [parser.py](parser.py)、[ai_scorer.py](ai_scorer.py) | 输入格式解析、评分结构兼容和逐消息指数计算 |
| [ohlc.py](ohlc.py)、[volume.py](volume.py)、[indicators.py](indicators.py) | 多周期开高低收、互动量与技术指标 |
| [charts.py](charts.py)、[report.py](report.py) | HTML 图表、Markdown 报告和 JSON 汇总 |
| [api_scorer.py](api_scorer.py)、[pipeline.py](pipeline.py) | CLI 的 Anthropic 评分调用，以及网页使用的轮次评分与展开流程 |
| [server.py](server.py)、[job_store.py](job_store.py) | 网页 API、任务状态和完成任务的持久化恢复 |

无需调用模型的完整示例见 [匿名群聊样本](../examples/group_chat/README.md)，配置见 [config/](../config/README.md)，验证入口见 [tests/](../tests/README.md)。
