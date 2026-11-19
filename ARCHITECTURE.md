# 关系烛台实验室：架构与数据流

本页描述当前仓库。原项目架构说明完整保存在 [上游归档](docs/upstream/ARCHITECTURE.md)，其中的历史计划和双人评分假设不等于本版现状。

## 公开网页版与本地版

公开入口是 [GitHub Pages 在线实验室](https://joruno-c.github.io/Relationship-Candlestick-Lab/)。`online/app/page.tsx` 在浏览器内解析文件、计算指数与图表；`online/static-pages/` 复用该页面生成静态入口。新聊天的评分请求经 `online/app/api/analyze/route.ts` 所在的 Sites 后端发送至访客选择的模型服务，Pages 本身不运行 Python 或模型接口。

在线前端与后端分别发布。`online/lib/runtime-config.ts` 统一资源和接口地址；`online/vite.pages.config.ts` 设置仓库资源前缀与后端地址。访客上传内容默认只在当前页面内存中保留，需下载进度后才能换电脑继续，API Key 不进入导出文件。

在线公开样本 `online/public/sample.json` 保留匿名成员、时间、评分及脱敏分析理由，隐藏聊天正文；下文的 Python 回归样本 `examples/group_chat/` 使用占位正文和占位理由。两者沿用相同评分数值，但理由的展示方式不同。部署细节见 [在线版说明](online/README.md)。

## Python 本地版的两条输入路径

```text
聊天导出 CSV / JSON / TXT
    │
    ├─ parser.py → 标准消息 → pipeline.py / scripts/ → 模型评分
    │                                                  │
    └─ 已评分文件（包括 examples/group_chat/scored.jsonl）┘
                            │
                     ai_scorer.py
                加载评分 + 递推消息级指数
                            │
                       ohlc.py
                按 11 种时间周期聚合 OHLC
                            │
             ┌──────────────┴──────────────┐
        CLI 图表 / 报告                FastAPI 服务
                                     │         │
                              frontend/   job_store.py
                                浏览器      完成结果快照
```

群聊测试和演示走已评分文件路径。它们不需要 API Key，也不重新调用模型。在线分析路径会把聊天文本交给用户选定的模型服务。IDE / Skill 评分是否离线，由实际运行模型与工具配置决定。

## 模块职责

| 位置 | 职责 |
|---|---|
| `relationship_candlestick/parser.py` | 解析聊天文件、字段归一化和时间排序 |
| `relationship_candlestick/pipeline.py`、`scripts/` | 预处理、模型调用、评分反扩展和流程编排 |
| `relationship_candlestick/ai_scorer.py` | 读取 v1 / v2 / v3 评分、消息级指数递推 |
| `relationship_candlestick/ohlc.py` | 聚合 K 线、消息数量和关键事件归因 |
| `relationship_candlestick/volume.py` | 互动量代理指标 |
| `relationship_candlestick/indicators.py` | 本地计算 MA、EMA、BOLL、MACD、RSI、KDJ |
| `relationship_candlestick/server.py` | 本地 API、任务调度和静态页面服务 |
| `relationship_candlestick/job_store.py` | 完成任务的原子快照写入、读取和校验 |
| `relationship_candlestick/cli.py` | `prepare`、`ingest`、`analyze`、`serve` 命令 |
| `frontend/` | 周期切换、指标、事件悬停和本地图表库 |
| `examples/group_chat/` | 匿名化群聊结构与既有评分，用于回归计算 |
| `config/default_weights.yaml` | 默认指数、互动量和其他计算参数 |

## 评分与计算的边界

模型给出的评分是输入，不是由 OHLC 聚合器产生的事实。v3 使用 `delta_vs_prior` 和 `delta_vs_atmosphere` 的等权混合，`primary_dim` 与 `tags` 用于展示和归因，不直接决定 v3 数值变化。

```text
retention = exp(-gap_hours / 72)
delta = 0.5 × delta_vs_prior + 0.5 × delta_vs_atmosphere
index_t = previous_index × retention + 50 × (1 - retention) + delta
```

默认指数起点与回归基线均为 50。72 小时是时间常数，对应半衰期约 49.9 小时。v3 不将结果裁剪到 0–100；v1 / v2 兼容逻辑另有裁剪规则。

每个有消息周期的 OHLC 分别取该周期消息级指数的首值、最大值、最小值和末值。`active-only` 只输出有消息的周期；`calendar` 额外补齐静默周期。技术指标仅描述已计算的序列，不预测关系或团队表现。

同一评分文件和参数可复现确定性的计算结果。不同模型、提示词或上下文重新评分，可能产生实质不同的变化量，不能保证 API 与 Skill 输出逐条等价。

## 群聊示例

公开示例源于创业课程项目群的 1,497 条记录，保留真实时间顺序、多成员结构和已保存的评分。成员标识匿名化，正文与理由被替换。详见 [数据说明](examples/group_chat/README.md)。

这份示例验证多成员数据能完成解析、指数加载、多周期聚合和结果恢复。它不是原始聊天公开档案，也不能用于语义准确率评估。由于替代文本改变了文字长度，互动量代理指标也不等于原版。默认通用评分 Skill 仍保留上游双人关系框架；复用到新群聊时，应重新定义协作场景规则。

## 本地服务与持久化

默认地址为 `http://127.0.0.1:7000`。主要接口：

| 方法与路径 | 用途 |
|---|---|
| `POST /api/demo/group` | 导入附带的群聊评分样本 |
| `POST /api/ingest` | 导入本机 `scored.jsonl`，计算图表 |
| `POST /api/jobs` | 创建分析任务 |
| `GET /api/jobs/{id}` | 查询状态、进度与可用周期 |
| `GET /api/jobs/{id}/ohlc?tf=1d` | 查询 K 线与关键事件 |
| `GET /api/jobs/{id}/events` | 查询消息级事件 |
| `GET /api/jobs/{id}/indicators?tf=1d&spec=ma:5,10` | 查询技术指标 |

网页和命令行都读取仓库中的配置。源码目录中的 `frontend/`、`config/` 和 `scripts/` 应与 Python 包一起保留；推荐在克隆目录中使用可编辑安装 `python -m pip install -e ".[test]"`。

完成的图表保存为 `output/_jobs/<id>/result.json`，包含消息事件和全部周期的计算结果。快照使用临时文件加原子替换写入，并校验版本、任务 ID、消息数量及周期完整性。服务启动后恢复完成任务；损坏或不完整的快照会跳过。它不保证恢复任意执行阶段的后台线程。

快照参数采用白名单，不保存 API Key、模型服务 URL 或原始文件路径；事件数据仍可能包含用户导入的聊天正文。浏览器历史记录可能保留本机文件路径。`output/` 默认被 Git 忽略，不能作为公开源码上传。

## 验证

```bash
python -m pytest -q
python scripts/run_group_demo.py
```

测试覆盖原有解析、评分兼容、OHLC、日历模式、互动量与持久化，并增加群聊数据回归。回归检查检验程序行为，不替代对评分依据的人工复核。
