# 数据转换、评分与演示脚本

以下脚本从仓库根目录运行；批处理参数见 [流水线说明](README_pipeline.md)。

| 脚本 | 用途 |
| --- | --- |
| [run_group_demo.py](run_group_demo.py) | 直接重放匿名群聊已有评分，输出多周期图表和可恢复任务，不调用模型。 |
| [wechat_to_standard.py](wechat_to_standard.py) | 将兼容的微信 CSV 转为标准字段；当前发送者映射为双人 `me/them`，不用于合并群成员。 |
| [preprocess_turns.py](preprocess_turns.py)、[expand_turns.py](expand_turns.py) | 将消息整理为回合，再将回合评分展开到消息。 |
| [score_turns_api.py](score_turns_api.py)、[score_turns_deepseek.py](score_turns_deepseek.py) | 分别通过 Anthropic、DeepSeek 接口进行回合评分。 |
| [score_turns_dispatch.py](score_turns_dispatch.py)、[pipeline_turns.py](pipeline_turns.py) | 准备批次文件并组织评分、汇总和展开流程。 |

快速体验：`python scripts/run_group_demo.py`。结果默认写入 `output/group_demo/`；样本说明见 [group_chat](../examples/group_chat/README.md)，当前在线分析流程见 [online](../online/README.md)。
