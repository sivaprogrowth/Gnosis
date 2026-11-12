---
type: source
source_type: article
title: "Large, creative AI models will transform lives and labour markets"
authors: []
published: 2023-04-22
source_url: https://www.economist.com/interactive/science-and-technology/2023/04/22/large-creative-ai-models-will-transform-how-we-live-and-work
accessed: 2025-01-01
tags: [generative-ai, large-language-models, deep-learning, ai-risk, ai-policy]
---

## Abstract

This *Economist* explainer traces the origins, mechanics, and limits of large language models (LLMs) — the generative AI systems powering tools like ChatGPT — from the deep-learning revolution of the early 2010s through to GPT-4. It walks through each technical stage of an LLM's operation (tokenisation, embedding, attention, and autoregression) in accessible terms, then examines the three pillars behind recent capability gains: data, algorithms, and compute. The article also interrogates where growth must eventually plateau — due to data exhaustion, skyrocketing training costs, and legal pressure from copyright lawsuits — while arguing that even a frozen LLM represents a transformative and potentially dangerous technology. Its central warning is that the capabilities of the biggest models have already outrun their creators' understanding and control.

## TL;DR

- LLMs work by tokenising text, embedding tokens in a meaning space, applying attention networks to learn associations, and autoregressively generating output — a giant statistical exercise, not true comprehension.
- Recent LLM capability gains rest on three converging factors: massive internet-scale training data (Common Crawl), attention-based neural architectures that parallelise across GPUs, and enormous compute budgets — GPT-4 cost an estimated ~$100 m to train.
- Growth limits are real: high-quality public text data may be exhausted before 2026, training costs scale super-linearly, Moore's Law is slowing, and copyright litigation threatens data pipelines.

## Key claims

- [[companies/openai|OpenAI]]'s ChatGPT, powered by GPT-4, passed the American Uniform Bar Examination at the 90th percentile; the slightly smaller GPT-3.5 failed the same test, illustrating the sharp threshold effects of model scale.
- LLMs operate via four sequential steps: tokenisation (text → numeric tokens), embedding (tokens → meaning space), attention (learning inter-token associations encoded as weights), and autoregressive completion (generating one token at a time, feeding output back as input).
- Jason Wei, a researcher at [[companies/openai|OpenAI]], has catalogued 137 distinct "emergent" abilities across various LLMs — capabilities absent at smaller scales that appear suddenly once a size threshold is crossed.
- GPT-3 was trained on 570 GB of filtered text drawn from Common Crawl snapshots of the internet (2016–2019), consuming 1.3 GWh of electricity at an estimated cost of $4.6 m; GPT-4 likely cost roughly $100 m.
- A 2022 paper projected that the stock of high-quality public language data will be exhausted, likely before 2026, placing a hard ceiling on data-driven scaling.
- Sam Altman, CEO of [[companies/openai|OpenAI]], stated in April 2023 that "we're at the end of the era" of simply training ever-larger models, signalling a strategic pivot toward other improvement pathways.
- Stability AI is being sued by Getty Images for reproducing copyrighted images (complete with Getty watermarks) via its Stable Diffusion model, raising parallel copyright risks for text-based LLMs like GPT-4.
- Open-source LLM implementations trained selectively are already approaching GPT-4 performance, democratising access while simultaneously making catastrophic-misuse scenarios more plausible.

## Key passages

> "ChatGPT embodies more knowledge than any human has ever known. It can converse cogently about mineral extraction in Papua New Guinea, or about TSMC, a Taiwanese semiconductor firm that finds itself in the geopolitical crosshairs."

> "Although it is possible to write down the rules for how they work, LLMs' outputs are not entirely predictable; it turns out that these extremely big abacuses can do things which smaller ones cannot, in ways which surprise even the people who make them."

> "A paper published in October 2022 concluded that 'the stock of high-quality language data will be exhausted soon; likely before 2026.'"

> "Without attention, the scaling would not be computationally tractable." — Yoshua Bengio, scientific director of Mila

> "The capabilities of the biggest models have outrun their creators' understanding and control. That creates risks, of all kinds."

> "I think we're at the end of the era where it's going to be these, like, giant, giant models. We'll make them better in other ways." — Sam Altman, April 2023

## Related

- [[companies/openai]]
- [[companies/google-deepmind]]
- [[companies/google]]
- [[companies/microsoft]]
- [[companies/meta]]
- [[companies/nvidia]]
- [[companies/amazon]]
- [[companies/anthropic]]
- [[large-language-models]]
- [[generative-ai]]
- [[deep-learning]]
- [[attention-mechanism]]
- [[emergent-abilities]]
- [[autoregression]]
- [[tokenisation]]
- [[common-crawl]]
- [[moore-s-law]]
- [[ai-copyright]]
- [[ai-safety]]
- [[yoshua-bengio]]
- [[sam-altman]]
- [[gpt-4]]
- [[chatgpt]]
- [[stable-diffusion]]
- [[alphago]]
