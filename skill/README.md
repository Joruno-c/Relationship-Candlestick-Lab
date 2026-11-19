# IDE 评分规则

[SKILL.md](SKILL.md) 保存 `rcl-score` 的入口说明、回合评分规则与 JSONL 输出约定，供 IDE 或批处理工具在执行评分任务时使用。当前定义主要面向双人对话，使用 v3.1 相对变化评分。

回合准备、批次分发与展开脚本位于 [scripts/](../scripts/README.md)；完整流程见 [流水线说明](../scripts/README_pipeline.md)。已有的 [匿名群聊样本](../examples/group_chat/README.md) 可直接导入查看，不需要执行本规则或再次调用模型。

新群聊可使用 [在线版](../online/README.md) 的群聊协作模式。数据是否发送给模型服务商取决于实际运行配置，使用说明与处理边界见 [主 README](../README.md#隐私)。
