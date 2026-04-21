---
title: 一个Python包支持100多种大模型，让AI编程工具不再被单一供应商绑定
slug: anycoder-100-llm
date: 2026-04-21
status: draft
estimated_duration: 1m14s
word_count: 325
source_topic: 一个Python包支持100多种大模型，让AI编程工具不再被单一供应商绑定
---

GitHub 上有个项目叫 AnyCoder，解决的是一个很具体的问题——

Claude Code 体验很好，但它只能接 Claude。开发者如果想用 DeepSeek（便宜快）、Qwen（中文生态好）、或者本地模型通过 Ollama 跑，就用不了 AnyCoder 换了一个方式，直接把主流大模型全给接入了。

目前支持 100 多种大模型，通过 litellm 兼容任意 OpenAI 风格的 API。

核心功能：文件编辑、Shell 命令、代码库搜索、上下文管理，这些 Claude Code 有的，它都有。只不过底层可以换任何模型。

这对独立开发者有什么意义？

Claude Code 绑定了 Anthropic，Copilot 绑定了微软。当你被单一供应商绑定的时候，你的议价能力和选择空间就很小。任何一家涨价或者政策变化，你就很被动。

AnyCoder 这个模式，让开发者可以在不同模型之间切换，根据价格和场景选最合适的那个。

这不是一个产品机会，是一个生态位的机会——把"不被单一供应商绑定"这个需求满足好，就能占住一批用户。