# 输入示例与群聊回归样本

| 内容 | 用途 |
| --- | --- |
| [sample_chat.csv](sample_chat.csv)、[sample_chat.json](sample_chat.json)、[sample_chat.txt](sample_chat.txt) | 查看三种聊天输入格式，准备含时间、发送者和正文的文件。 |
| [group_chat/](group_chat/README.md) | 1,497 条匿名群聊的已有评分、逐条指数、11 周期 OHLC 和校验清单，用于 Python 演示及数值回归。 |

在仓库根目录运行 `python scripts/run_group_demo.py` 即可生成群聊演示，无需 API Key。

本目录群聊样本的正文与理由均为占位文本；[在线样本](../online/public/sample.json) 另外保留经过脱敏的分析理由。两者保留相同的时间与评分轨迹，具体区别见 [主说明](../README.md#体验我们的群聊测试)。
