---
title: GitHub上1424颗星的IDE，让多Agent并行跑在同一屏幕上
slug: orca-multi-agent-ide
date: 2026-04-21
status: draft
estimated_duration: 1m16s
word_count: 336
source_topic: GitHub上1424颗星的IDE，让多Agent并行跑在同一屏幕上
---

GitHub 上有个叫 Orca 的项目，拿到了 1424 颗星。它的 slogan 是——AI 编程的下一个阶段，是让多个 Agent 并行跑。

传统的 AI 编程工具，都是单 Agent 模式。你给一个 Agent 下指令，它干活，你等它干完，再下下一个指令。Orca 做的事，就是把这个模式打破了——让你同时跑多个 Agent，每个 Agent 干不同的任务，在同一个屏幕上看到它们的进度。

支持 Claude Code、Codex、Gemini CLI 等主流 Agent，哪个都支持。

对于独立开发者来说，这意味着什么？

以前你要串行的做几件事，比如先做登录模块、再做支付模块、再做用户体系，你需要等一个完成再开始下一个。现在你可以三个 Agent 同时跑，每人负责一个模块，最后合并代码。

但这里有个实际问题——多 Agent 并行，Token 消耗是成倍增加的。如果你的预算有限，不一定划算。

另外，多个 Agent 同时修改同一个文件的时候，怎么合并也是一个真实的问题。现在 Orca 提供了 Git 工作树隔离来缓解这个问题，但还不是完美的解决方案。

即便如此，这个方向是对的。当工具链足够好的时候，个体开发者的并发能力会远超以前。