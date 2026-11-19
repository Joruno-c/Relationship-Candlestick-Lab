# 上游文档同步说明

本仓库基于 [ZhenyuanPAN822/relationship-candlestick-lab](https://github.com/ZhenyuanPAN822/relationship-candlestick-lab)。同步基线为提交 [`100f508ef504420506e853c8b72f16509d30ea3c`](https://github.com/ZhenyuanPAN822/relationship-candlestick-lab/commit/100f508ef504420506e853c8b72f16509d30ea3c)，整理日期为 2026-11-20。

## 原文保留

- [README.md](README.md)：保留该版本的完整正文，未改写其介绍、评分规则或隐私声明；已按统一换行核对，与基线版本一致。
- [ARCHITECTURE.md](ARCHITECTURE.md)：保留原架构文档作为历史参考。
- `docs/`：保留 README 引用的四张原版插图，保证归档中的相对图片链接有效。
- [skill/SKILL.md](skill/SKILL.md)：保留原 README 引用的评分规则。
- [LICENSE](LICENSE)：保留 MIT 授权与原有版权声明。

以上文件供对照上游版本使用。原文中的模型推荐、测试数量、双人场景设定和安装要求属于上游版本说明；运行本仓库请优先参考主 README。

## 本版更新

本版的 [主 README](../../README.md) 和 [架构说明](../../ARCHITECTURE.md) 面向当前代码，补充了：

1. 本仓库的克隆、Python 3.10+ 安装和启动方式。
2. 创业课程群聊的匿名化回归样本及无需模型 API 的演示入口。
3. 完成任务的磁盘持久化与服务重启恢复。
4. 本地图表依赖、目录职责和自动化测试说明。
5. 云端模型的数据处理边界，以及 72 小时时间常数的正确解释。

原 README 中“Skill 模式下聊天数据全程不出本机”的表述不能作为所有运行配置的保证。若 IDE 或评分工具使用云端模型，提交给模型的聊天内容仍可能发往服务商。已评分文件的本地计算与群聊演示无需再次调用模型。本版浏览器历史可能保存本机文件路径，不能沿用原文关于文件路径不写入 localStorage 的承诺。

代码继续使用 [MIT License](../../LICENSE)，并保留上游来源和贡献者署名。图表库的独立授权随 `frontend/vendor/` 保存。
