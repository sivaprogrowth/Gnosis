---
type: source
source_type: article
title: "Large Language Models Get All the Hype, but Small Models Do the Real Work"
authors: []
published: "2025-11-01"
source_url: "https://www.wsj.com/tech/ai/large-language-models-get-all-the-hype-but-small-models-do-the-real-work-225d3145"
accessed: "2025-11-01"
tags: [small-language-models, agentic-ai, ai-infrastructure, llm, enterprise-ai]
---

## Abstract

This *Wall Street Journal* article argues that while frontier large language models (LLMs) attract outsized media and executive attention for their benchmark-breaking capabilities, the AI models actually driving enterprise productivity gains are small, fast, cheap, and specialized. Drawing on examples from companies such as [[companies/airbnb|Airbnb]], Gong, Hark Audio, and Meta, the piece shows how businesses are building "AI knowledge factories" — assembly-line-style pipelines in which data flows through many small language models (SLMs), each performing a narrow task, with expensive frontier models reserved for only the highest-complexity steps. Researchers from Nvidia and the Georgia Institute of Technology are cited in support of the claim that SLMs are "sufficiently powerful, inherently more suitable, and necessarily more economical" for repetitive, specialized [[concepts/agentic-ai|agentic AI]] work. The article concludes that the real engineering innovation behind AI-driven business transformation is not smarter models, but smarter orchestration of simpler ones.

## TL;DR

- For most real enterprise workloads, small language models (SLMs) outperform frontier LLMs on cost and speed while being "good enough" on quality.
- Companies are building AI knowledge factories — pipelines that daisy-chain many specialized SLMs, reserving large frontier models for only the most complex steps.
- The hidden driver of AI-powered productivity gains is human engineers getting better at orchestrating simpler AI components, not raw model intelligence.

## Key claims

- Frontier LLMs dominate headlines (passing legal/medical exams, winning math olympiads) but are not the models companies rely on for day-to-day operations.
- [[companies/airbnb|Airbnb]] uses open-source models from [[companies/alibaba|Alibaba]] (Qwen) to automatically resolve a significant share of customer-service issues faster than human reps.
- Meta does not use its largest AI models for ad delivery because "their size and complexity makes it too cost prohibitive"; instead it distils knowledge from big models into smaller, production-optimised ones.
- [[concepts/multi-model-routing|Multi-model routing]] — assigning tougher sub-tasks to more capable (and expensive) models and routine sub-tasks to cheaper SLMs — is the dominant architectural pattern across the companies surveyed.
- Cost differences between the largest and smallest models are dramatic: [[companies/openai|OpenAI]]'s GPT-5 Nano costs ~$0.10 per million tokens vs. ~$3.44 per million tokens for full GPT-5, and large reasoning models can consume thousands of times more tokens via internal chain-of-thought.
- Fine-tuning on proprietary human-curated data (as Hark Audio did with tens of thousands of podcast clips) enables SLMs to outperform general-purpose LLMs on specialised tasks.
- A Nvidia / Georgia Tech paper argues that the rise of [[concepts/agentic-ai|agentic AI]] is producing applications where "language models perform a small number of specialized tasks repetitively and with little variation," making SLMs the natural fit.
- The consistency of SLM-centric architectures across unrelated companies suggests a convergence on a small set of patterns for building reliably functioning AI agents.

## Key passages

> "The reality is, for many of the operations that we need computing for today, we don't need large language models." — Kyle Lo, Allen Institute for AI

> "You might use the cheapest LLM to find out if a conversation is relevant, a reasonably cheap LLM to find the right information inside it, and then maybe a more-expensive frontier model to come up with the action document." — Eilon Reshef, Gong co-founder

> "The giant LLM models are incredibly smart, but they don't offer us an efficient way to leverage our unique proprietary data, or a way to incorporate feedback from our editors." — Don MacKinnon, Hark Audio CEO

> Small language models are "sufficiently powerful, inherently more suitable, and necessarily more economical" for agentic work. — Nvidia / Georgia Tech researchers

> "In many cases, though, the truth about corporate productivity gains is that the impact AI is having—on competitiveness, jobs and the like—is the result of human engineers getting better at stitching together smaller, simpler AIs."

> "What all these companies have in common is that they have built internal knowledge factories that daisy chain together small, simple, fast AIs."

## Related

- [[concepts/agentic-ai]]
- [[concepts/multi-model-routing]]
- [[concepts/agent-model-segmentation]]
- [[concepts/agentic-inference]]
- [[concepts/chain-of-thought-reasoning]]
- [[concepts/build-vs-buy]]
- [[concepts/open-weight-models]]
- [[companies/openai]]
- [[companies/anthropic]]
- [[companies/google-deepmind]]
- [[companies/alibaba]]
- [[companies/airbnb]]
- [[companies/xai]]
- [[companies/facebook]]
- Small language models (SLMs)
- AI knowledge factory
- Model fine-tuning
- Knowledge distillation
- Eilon Reshef
- Kyle Lo
- Allen Institute for AI
- Gong
- Hark Audio
- Aurelian
