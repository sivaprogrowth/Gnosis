---
type: source
source_type: article
title: "How artificial intelligence got better at building itself"
authors:
  - The Economist
published: 2026-06-07
source_url: https://www.economist.com/science-and-technology/2026/06/07/how-artificial-intelligence-got-better-at-building-itself
accessed: 2026-06-07
tags: [ai, recursive-self-improvement, ai-safety, llm, automation]
---

## Abstract

This *Economist* article examines how leading AI labs—particularly [[companies/anthropic]]—have reached the point where their models write the majority of their own code, and analyses how close the industry is to "recursive self-improvement" (RSI): a closed loop in which one AI version autonomously builds the next. Drawing on benchmarks from METR, a CSET report, and the firsthand account of researcher [[Andrej Karpathy]]'s *Nanochat* experiment, the piece maps which parts of the AI R&D pipeline are already automatable and which remain bottlenecks. It also surfaces the catastrophic-risk arguments made by [[Max Tegmark]] and [[companies/anthropic]] itself, which called in June 2026 for the option to pause frontier AI development even as it leads the market.

## TL;DR

- More than 80% of [[companies/anthropic]]'s published code in May 2026 was written by [[entities/claude|Claude]]; before Claude Code launched in early 2025 the figure was in the low single digits.
- "Recursive self-improvement" (RSI)—where AI builds its own successor without human involvement—is estimated by Anthropic co-founder Jack Clark to have a 60% probability of occurring by end of 2028.
- Physical constraints (compute, data-centre capacity, training data) will impose speed limits on RSI, but a CSET report warns the accelerated R&D rate could mean bottlenecks are overcome faster than expected.

## Key claims

- [[entities/claude|Claude Code]], launched February 2025, has made AI-authored code the dominant share of [[companies/anthropic]]'s own software output within roughly fifteen months.
- METR benchmarks show Anthropic's models progressed from completing tasks that take a human under an hour (early 2025) to tasks that take more than a full working day (mid-2026).
- Jack Clark (Anthropic co-founder) places a 60% probability on a fully autonomous AI-built successor model existing by end of 2028.
- [[concepts/long-horizon-r-and-d|Long-horizon R&D]] tasks like algorithm design are no longer safe from automation: [[Google DeepMind]]'s AlphaEvolve proposed data-centre workload changes saving 0.7% of Google's worldwide compute and improved matrix multiplication, speeding up [[entities/gemini|Gemini]] training by 1%.
- Andrej Karpathy's *Nanochat* experiment showed an AI agent (Autoresearch) independently cut training time by 18% over five days, with no human intervention—improvements a highly skilled human had missed.
- CSET projects that as the fraction of AI R&D performed by AI increases, productivity gains over human-only R&D could compound to 10×, then 100×, then 1,000× faster.
- Consumer demand on data-centre capacity competes directly with the compute needed for AI-driven R&D, acting as a near-term brake on RSI.
- "Verifiable rewards" domains (code execution, mathematical proofs) allow safe use of synthetic training data, but creative and judgment-heavy domains resist this, limiting the scope of self-improvement.

## Key passages

> "More than four-fifths of the code it published in May was written by Claude, the company says. Before Claude Code, the percentage was 'low single-digits'."

> "Jack Clark, an Anthropic co-founder, thinks there is a 60% chance that, by the end of 2028, an AI system will be capable of creating its own successor with no human involvement at all."

> "As the fraction of AI R&D performed by AI systems increases, the productivity boost over human-only R&D could increase ten-fold, then a hundred-fold, then a thousand-fold." — CSET report, January 2026

> "In two days the training time dropped to one hour and 48 minutes, and five days after that it fell to one hour and 39 minutes. 'I didn't touch anything,' Dr Karpathy says."

> "The end result could be models trained by models, to achieve goals set by models, whose safety is verified only by models."

> "Max Tegmark…likens it to a driver flooring the accelerator on the motorway with their eyes closed. The result would be certain doom…as long as the driver refuses to open their eyes."

## Related

- [[entities/claude]]
- [[companies/anthropic]]
- [[concepts/agentic-ai]]
- [[concepts/long-horizon-r-and-d]]
- [[concepts/ai-evals]]
- [[entities/gemini]]
- [[companies/openai]]
- [[companies/google]]
- [[concepts/agentic-inference]]
- [[Recursive Self-Improvement]]
- [[AlphaEvolve]]
- [[Andrej Karpathy]]
- [[Nanochat]]
- [[Max Tegmark]]
- [[Jack Clark]]
- [[METR]]
- [[CSET]]
- [[Reflection AI]]
- [[Helen Toner]]
- [[Verifiable Rewards]]
- [[Superintelligence]]
- [[Synthetic Training Data]]
- [[Hyperparameters]]
