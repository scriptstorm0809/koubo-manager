---
title: 他用950行Python复刻了Claude Code，还开源了
slug: corecoder-950-lines
date: 2026-04-21
status: draft
estimated_duration: 1m14s
word_count: 328
source_topic: 他用950行Python复刻了Claude Code，还开源了
---

GitHub 上有个项目叫 CoreCoder，就是把 Claude Code 逆向工程了一下，然后用大约 950 行 Python 重新实现了一遍。

Claude Code 原始代码是 51.2 万行 TypeScript。这个人花了两天，把它缩减到 950 行 Python，开源了。

这事情为什么值得聊？

它不是做了一个竞品，它做的是一个"最小化实现"——把 Claude Code 的核心逻辑抽离出来，让任何人都能看懂、fork、修改。

这个思路在技术圈有个类比，叫 NanoGPT。GPT-3 有1750亿参数，但 Andrej Karpathy 写了一个 NanoGPT，300行代码，把 GPT 的核心训练逻辑讲清楚了。

CoreCoder 干的是同样的事——把一个复杂的 AI 编程工具，拆到一个普通工程师能读懂的规模。

对于想学习 AI Agent 内部逻辑的人来说，这个价值比文档更大。与其读产品介绍，不如读一个能跑的精简实现。

而且 MIT 协议开源，谁都能用。这个量级的学习资料，在 AI 编程工具爆发的年代，比做一个新工具可能更有意义。