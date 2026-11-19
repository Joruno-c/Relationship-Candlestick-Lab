# 自动测试与网站发布

此目录保存 GitHub Actions 工作流。

| 工作流 | 触发方式与用途 |
| --- | --- |
| [tests.yml](tests.yml) | 推送或拉取请求时运行 Python 测试（Ubuntu / Windows，Python 3.10 / 3.12），并检查在线版测试、类型与构建。 |
| [pages.yml](pages.yml) | `main` 上的 `online/` 或此发布配置变更时构建网站，也支持手动触发；发布产物为 `online/dist-pages/`。 |

部署配置与本地验证命令见 [在线版说明](../../online/README.md)。运行记录可在 [Actions](https://github.com/Joruno-c/Relationship-Candlestick-Lab/actions) 查看，发布结果为 [关系 K 线在线实验室](https://joruno-c.github.io/Relationship-Candlestick-Lab/)。
