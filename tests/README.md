# Python 回归测试

在仓库根目录安装测试依赖并运行：

```bash
python -m pip install -e ".[test]"
python -m pytest tests -q
```

| 测试 | 验证内容 |
|---|---|
| [test_parser.py](test_parser.py) | CSV、JSON、TXT、字段别名和 GBK 编码解析 |
| [test_scoring_v2.py](test_scoring_v2.py)、[test_scoring_v3.py](test_scoring_v3.py) | 评分结构兼容、指数递推、时间衰减和取值边界 |
| [test_ohlc.py](test_ohlc.py)、[test_calendar_mode.py](test_calendar_mode.py)、[test_volume.py](test_volume.py) | 多周期 OHLC、空白周期处理和互动量公式 |
| [test_group_chat.py](test_group_chat.py) | 1,497 条匿名群聊的指数、11 周期 K 线、同秒消息顺序与公开样本约束 |
| [test_group_demo_api.py](test_group_demo_api.py)、[test_job_persistence.py](test_job_persistence.py) | 演示接口、服务重启恢复、损坏快照处理及凭据不进入任务快照 |

群聊基准来自 [examples/group_chat/](../examples/group_chat/README.md) 的既有评分与预期结果。测试使用这些数据或模拟调用，无需真实 API Key；它们验证计算与流程，不评估模型对原始聊天的语义判断。在线版的 TypeScript 测试见 [online/tests/](../online/tests/)。
