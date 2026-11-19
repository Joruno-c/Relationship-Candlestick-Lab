# 数值配置

[default_weights.yaml](default_weights.yaml) 是 Python 版本的默认配置，由 [load_config](../relationship_candlestick/utils.py) 读取，供 K 线聚合与互动量计算使用。

- `initial_index`：默认初始指数为 50。
- `neutral_threshold`：开收差的中性区间阈值，默认 2。
- `volume`：每条消息、每个字符及快速回复的互动量系数，默认分别为 1、0.05、1.5。

在仓库根目录运行以下命令，可用匿名群聊的已有评分生成全部周期结果：

```bash
python -m relationship_candlestick ingest --scored examples/group_chat/scored.jsonl --config config/default_weights.yaml --all-timeframes --output output/group_demo
```

自定义配置通过 `--config` 指定完整 YAML 文件。这里的数值参数服务于聚合，不负责判断聊天语义；已有逐条评分的加载与指数递推见 [ai_scorer.py](../relationship_candlestick/ai_scorer.py)。
