---
type: source
source_type: article
title: "Who Owns the Generative AI Platform?"
authors: []
published: null
source_url: https://a16z.com/2023/01/19/who-owns-the-generative-ai-platform/
accessed: 2025-01-19
tags: [generative-ai, ai-infrastructure, market-structure, llm, platform-economics]
---

## Abstract

Published by [[andreessen-horowitz|Andreessen Horowitz (a16z)]], this article analyzes the emerging technology stack for generative AI and asks where durable value will accrue across its three layers: applications, models, and infrastructure. Drawing on conversations with dozens of founders and operators, the authors find that infrastructure vendors — especially cloud providers and [[nvidia]] — are capturing the largest share of dollars flowing through the stack today, while application companies struggle with retention, differentiation, and gross margins, and model providers have yet to reach large commercial scale. The central thesis is that, as of early 2023, no layer of the generative AI stack has established clearly durable, structural moats, which the authors interpret as a sign of a healthy, competitive market with enormous potential.

## TL;DR

- Infrastructure vendors (cloud providers and [[nvidia]]) are the biggest financial winners in generative AI so far, capturing an estimated 10–20% of total stack revenue.
- Application companies are growing fast but face thin gross margins (50–60%), unclear retention, and weak product differentiation.
- No layer of the generative AI stack — apps, models, or infrastructure — has yet established a durable, structural moat.

## Key claims

- At least three generative AI product categories (image generation, copywriting, code writing) had already exceeded $100 million in annualized revenue at time of writing.
- App companies typically spend 20–40% of revenue on inference and fine-tuning, with model providers in turn spending roughly half their revenue on cloud infrastructure, meaning cloud providers absorb an estimated 10–20% of all generative AI revenue.
- [[nvidia]] reported $3.8 billion in data center GPU revenue in a single quarter (Q3 FY2023), with Nvidia GPUs cited in research papers 90× more than all top AI chip startups combined.
- Model providers such as [[openai]], Stability AI, [[anthropic]], Cohere, and Character.ai face commoditization risk as models converge in architecture and training data.
- Open-source models (e.g., Stable Diffusion) create a credible threat to proprietary APIs: if open-source reaches sufficient performance and community support, proprietary alternatives may struggle to compete.
- Commercialization for model providers is likely tied to hosting — demand for proprietary APIs and hosting services for open-source models (e.g., [[hugging-face]]) is growing rapidly.
- Challenger clouds (e.g., [[coreweave]], Lambda Labs) and alternative chips (Google TPUs, [[amd]] Instinct, [[companies/amazon|AWS]] Inferentia/Trainium) exist but have yet to take significant market share from the Big 3 (AWS, GCP, Azure).
- The article identifies six non-durable "standard moats" across the stack — scale, supply-chain, ecosystem, algorithmic, distribution, and data pipeline — but concludes that none appears durable long-term.

## Key passages

> "Infrastructure vendors are likely the biggest winners in this market so far, capturing the majority of dollars flowing through the stack. Application companies are growing topline revenues very quickly but often struggle with retention, product differentiation, and gross margins. And most model providers, though responsible for the very existence of this market, haven't yet achieved large commercial scale."

> "There don't appear, today, to be any systemic moats in generative AI. As a first-order approximation, applications lack strong product differentiation because they use similar models; models face unclear long-term differentiation because they are trained on similar datasets with similar architectures; cloud providers lack deep technical differentiation because they run the same GPUs; and even the hardware companies manufacture their chips at the same fabs."

> "We estimate that, on average, app companies spend around 20-40% of revenue on inference and per-customer fine-tuning. This is typically either paid directly to cloud providers for compute instances or to third-party model providers — who, in turn, spend about half their revenue on cloud infrastructure. So, it's reasonable to guess that 10-20% of total revenue in generative AI today goes to cloud providers."

> "Models released as open source can be hosted by anyone, including outside companies that don't bear the costs associated with large-scale model training (up to tens or hundreds of millions of dollars). And it's not clear if any closed-source models can maintain their edge indefinitely."

> "The potential size of this market is hard to grasp — somewhere between all software and all human endeavors — so we expect many, many players and healthy competition at all levels of the stack."

## Related

- [[andreessen-horowitz]]
- [[nvidia]]
- [[openai]]
- [[anthropic]]
- [[hugging-face]]
- [[microsoft]]
- [[google]]
- [[meta]]
- [[amazon]]
- [[coreweave]]
- [[amd]]
- [[tsmc]]
- [[generative-ai-stack]]
- [[large-language-models]]
- [[ai-moats]]
- [[platform-economics]]
- [[inference-costs]]
- [[open-source-ai]]
- [[vertical-integration]]
