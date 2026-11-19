# 关系烛台实验室 · Relationship Candlestick Lab

把聊天中的互动变化整理成可回查的 K 线。本版本基于 [ZhenyuanPAN822/relationship-candlestick-lab](https://github.com/ZhenyuanPAN822/relationship-candlestick-lab)，保留原项目的分析能力，并加入创业课程项目群的匿名化测试、群聊演示入口和完成任务的重启恢复。

群聊示例展示的是**可观察的协作氛围**。指数不是成绩、百分比、个人贡献排名或真实关系测量；趋势需要结合上下文解释。

## 快速开始

需要 **Python 3.10+**。请使用源码目录运行：

```bash
git clone https://github.com/Joruno-c/Relationship-Candlestick-Lab.git
cd Relationship-Candlestick-Lab
python -m venv .venv
```

激活虚拟环境：

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

安装依赖并启动：

```bash
python -m pip install -e ".[test]"
python start.py
```

浏览器打开 [http://127.0.0.1:7000](http://127.0.0.1:7000)。也可手动启动服务：

```bash
python -m relationship_candlestick.cli serve --host 127.0.0.1 --port 7000
```

首次安装 Python 依赖需要联网。安装完成后，群聊样本导入、指数计算和图表渲染均可在本机完成；图表库已随仓库提供。当前发布方式是克隆源码加可编辑安装，`frontend/`、`config/` 和 `scripts/` 须与 Python 包一起保留。

## 体验我们的群聊测试

在首页点击 **“体验我们的群聊测试”**，即可导入仓库附带的已评分样本。无需 API Key，也不会重新调用模型。

样本来自创业课程项目群截至 **2026 年 11 月 18 日 00:01:04（UTC+08:00）**的 1,497 条记录。公开版本保留时间顺序、多成员结构和既有评分；成员使用匿名编号，消息正文与评分理由使用替代文本。它用于复现计算结果，**不能用于复核原始对话语义或重新评估模型评分质量**。文字长度已改变，因此互动量代理指标也不等于原版。详见 [群聊样本说明](examples/group_chat/README.md)。

也可以用命令生成本地演示结果：

```bash
python scripts/run_group_demo.py
```

脚本在 `output/group_demo/` 生成 `relationship_chart.html`、11 种周期的 CSV 和报告，同时保存可由网页打开的任务，并打印对应链接。生成结果保存在 `output/`，不纳入版本控制。

## 使用自己的聊天记录

输入应包含 `timestamp`（时间）、`sender`（发送者）、`message`（正文）三个字段。支持 CSV、带时间戳的 JSON / JSONL 和 TXT；缺少时间戳的数据无法聚合为时间 K 线。

- **导入已评分文件**：在首页选择本地文件导入，填写 `scored.jsonl` 的本机路径；导入后的计算不调用模型。
- **在线分析**：选择模型服务，提供聊天文件路径及 API Key；聊天内容会发送给所选服务商。
- **通过 IDE / Skill 评分**：参见 [评分规则](skill/SKILL.md) 与 [流水线说明](scripts/README_pipeline.md)。是否发送到云端取决于使用的模型与工具配置，不能将 Skill 模式等同于数据全程离线。

默认评分规则沿用原项目的双人关系场景。群聊示例使用既有协作标注；它不代表默认提示词已对所有群聊场景完成适配。为新群聊重新评分时，需要先确定适用的协作维度和评分规则。

本服务面向单人本机使用，默认监听 `127.0.0.1`。完成的任务写入 `output/_jobs/`，重启服务后恢复；该目录可能包含导入的聊天内容，应留在自己的电脑上。API Key 不写入浏览器持久存储；历史记录可能保留本机文件路径。

## 图表与计算

- 11 种周期：5 分钟、15 分钟、30 分钟、1 / 2 / 4 小时、日、周、月、季、年。
- OHLC：每个周期第一条指数、最高值、最低值和最后一条指数。
- MA、EMA、BOLL、MACD、RSI、KDJ，以及关键消息和维度归因。
- 保留已有解析器、评分兼容性、成交量和任务持久化测试，并增加真实群聊结构的回归验证。

v3 指数计算将两个相对变化量各取一半；消息间隔使指数向基线 50 回归：

```text
retention = exp(-gap_hours / 72)
index_t = previous_index × retention + 50 × (1 - retention)
          + 0.5 × delta_vs_prior + 0.5 × delta_vs_atmosphere
```

72 小时是**时间常数**，不是半衰期。v3 指数不限制在 0–100；长时间未聊天造成的回落，也不等于关系恶化。实现细节见 [架构说明](ARCHITECTURE.md)。

## 文件组织

```text
Relationship-Candlestick-Lab/
├── config/                       # 默认数值参数
├── docs/                         # 插图、发布说明与上游文档归档
│   └── upstream/                 # 原版 README、架构、关联插图和授权
├── examples/
│   ├── group_chat/               # 我们的群聊匿名化回归样本
│   └── sample_chat.*             # 原项目的合成格式示例
├── frontend/                     # 网页界面与本地图表库
├── relationship_candlestick/     # 解析、评分加载、聚合、API 与任务存储
├── scripts/                      # 数据流水线与群聊演示命令
├── skill/                        # 原项目评分 Skill
├── tests/                        # 自动化回归测试
├── ARCHITECTURE.md
├── LICENSE
├── pyproject.toml
├── requirements.txt
└── start.py
```

`.venv/`、缓存、密钥、原始聊天导出、私人演示材料与 `output/` 不属于运行源码，不随仓库发布。公开测试数据集中放在 `examples/group_chat/`。

## 运行测试

```bash
python -m pytest -q
```

测试及群聊演示使用保存的评分，不需要模型账号或 API Key。回归测试检验解析、计算和数据恢复，不证明语义评分客观正确。

## 上游与授权

原版 [README 全文](docs/upstream/README.md) 已同步保留；来源版本、链接处理和本版差异见 [同步说明](docs/upstream/README_SYNC.md)。上游文档中的模型推荐、测试数量和运行说明反映其原始版本；本仓库的安装、群聊示例和隐私说明以本页为准。

保留原作者与贡献者署名，代码采用 [MIT License](LICENSE)。lightweight-charts 采用 Apache 2.0，随库保留对应授权文件。
