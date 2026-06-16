---
type: source
source_type: article
title: "Three Reasons AI Is Now More Reliable Than Ever"
authors: []
published: "2026-04-18"
source_url: "https://www.wsj.com/tech/ai/ai-model-reliability-hallucinations-a3bc0497?mod=author_content_page_1_pos_4"
accessed: "2026-04-18"
tags: [ai-reliability, hallucinations, llm, ai-tools, chain-of-thought]
---

## Abstract

This *Wall Street Journal* article examines three engineering-level advances that have made contemporary AI systems substantially more reliable than early-generation chatbots. It argues that improvements in specialized training data, tool use (especially code execution and web search), and multi-model self-checking collectively explain why frontier models from [[companies/openai|OpenAI]], [[companies/anthropic|Anthropic]], and [[companies/google|Google]] are now viable for real-world work. The piece draws on the unintentional leak of [[entities/claude-code|Claude Code]]'s source code as a concrete illustration of these techniques, and incorporates commentary from independent researchers. The article explicitly cautions that these gains are engineering workarounds, not evidence of human-like reasoning or proximity to [[concepts/superintelligence|superintelligence]].

## TL;DR

- AI reliability has improved through three mechanisms: richer/fresher knowledge (human-curated data + web search), tool augmentation (outsourcing maths/code to traditional software), and multi-model cross-checking ("council of models").
- The leaked [[entities/claude-code|Claude Code]] source code revealed that modern AI agents are built on elaborate traditional software scaffolding, not purely neural reasoning.
- Gains are real but mundane — models are not reasoning like humans; they are compensating for their own limitations with external tools and checks.

## Key claims

- Human experts are now paid by the hour at scale to generate specialised training data for frontier models — a shift from scraping publicly available digital media.
- [[companies/openai|OpenAI]] reports its latest main model produces 26% fewer factual errors than GPT-4o did in internal tests two years prior.
- [[companies/google|Google]] (via [[companies/google-deepmind|Google DeepMind]]) systematically benchmarks its models for factuality using both intrinsic knowledge and search-engine augmentation (the FACTS benchmark suite).
- [[companies/anthropic|Anthropic]] is researching *calibration* — training models to recognise and admit the limits of their own knowledge rather than confidently confabulating.
- Modern LLMs route mathematical and computational tasks to traditional software tools or self-written code rather than attempting to guess numeric answers, dramatically reducing errors in those domains.
- The leaked [[entities/claude-code|Claude Code]] source code contains a dedicated memory-management module (to prevent context overload, which amplifies [[concepts/controlled-hallucination|hallucinations]]) and a script that detects user frustration via profanity scanning.
- A "council of models" pattern — having one provider's model (e.g., [[entities/claude|Claude]]) cross-check another's (e.g., [[entities/chatgpt|ChatGPT]]) — is being adopted in production AI systems to raise answer quality and lower error rates.
- Researcher Gary Marcus argues that LLMs themselves are no more reliable at a fundamental level, but the systems built around them are more effective because of tool integration.

## Key passages

> "Where Claude consistently stands out in independent evaluations is what researchers call 'calibration': knowing what it doesn't know, and saying so."

> "LLMs themselves are more or less just as unreliable as they were ever. But, especially in places like math and coding, you can pass off the output of LLMs to, or direct the LLMs with, other technologies that had lost favor but actually are very useful."

> "There's a chunk of code for a memory system to keep the context of conversations going without overloading the AI with too much information—a problem known to amplify hallucinations and reduce the effectiveness of guardrails."

> "The answer is only deemed acceptable if both AIs agree on it… Kirillov calls this approach a 'council of models,' and he says the results are better quality, with lower error rates."

> "This all-too-apparent improvement has caused some people to conclude—incorrectly—that these systems are reasoning the way humans do. The truth is more mundane: Their makers figured out their creations can't do it all alone, and require the knowledge and tools honed over millennia by us mere mortals."

## Related

- [[entities/claude-code]]
- [[entities/claude]]
- [[entities/chatgpt]]
- [[entities/gemini]]
- [[companies/openai]]
- [[companies/anthropic]]
- [[companies/google]]
- [[companies/google-deepmind]]
- [[concepts/superintelligence]]
- [[concepts/controlled-hallucination]]
- [[concepts/agentic-ai]]
- [[concepts/synthetic-training-data]]
- [[concepts/verifiable-rewards]]
- [[concepts/ai-evals]]
- [[concepts/multi-model-routing]]
- Council of Models
- Calibration (AI)
- Chain of Thought Reasoning
- Symbolic Reasoning
- Gary Marcus
