---
type: source
source_type: article
title: "Ramp, a $60B company, hid a secret offer on its website that only AI could see"
authors: []
published: null
source_url: "https://x.com/crowdreply_io/status/2119809230861746556/?a=R1LCtoowwyc2trETzZo&s=12&rw_tt_thread=True"
accessed: "2025-05-24"
tags: [aeo, ai-search, llm-marketing, answer-engine-optimization, content-strategy]
---

## Abstract

This post describes an experiment conducted by Ramp — a financial technology company valued at $60 billion — in which the company embedded a hidden offer on approximately 50 pages of its website, visible only to AI crawlers and not to human visitors. Over 32 days, the team tracked whether large language model-powered tools — specifically ChatGPT, Perplexity, and Claude — would surface the offer when asked CFO-level questions about spend management software. The experiment revealed stark behavioural differences between AI systems, demonstrated that Markdown outperforms schema markup for AI legibility, and confirmed that AI models preferentially cite pages they already trust, making prior citation authority the decisive variable in Answer Engine Optimisation (AEO).

## TL;DR

- Ramp ran a 32-day AEO experiment hiding AI-only content on ~50 pages; the hidden offer was mentioned 370 times by AI tools by day 32.
- Markdown was the only content format that reliably appeared in AI-generated answers — schema markup, contrary to expectations, did not win.
- Each major AI model (Claude, [[companies/perplexity|Perplexity]], ChatGPT) behaved completely differently, requiring model-specific optimisation strategies.

## Key claims

- Ramp embedded a hidden offer on ~50 website pages readable only by AI crawlers, while human visitors saw no change to the UI.
- Over 1,300 AI bot visits were recorded in the first 2.5 weeks, originating from at least 7 distinct AI platforms.
- Some AI bots disguise themselves as standard browsers; [[companies/deepseek|DeepSeek]]'s crawler was observed identifying itself as a Chrome version from 2017.
- Claude's crawler visited Ramp's pages more than all other named AI crawlers combined.
- Of three tested formats — Markdown, plain HTML, and schema-rich HTML — Markdown was the only format that reliably surfaced in AI answers.
- Claude passed on the exact offer text, URL, and step-by-step instructions; [[companies/perplexity|Perplexity]] mentioned it vaguely; ChatGPT mentioned it zero times across the full 32-day window.
- Pages that AI tools already cited organically were the ones where the hidden offer appeared; pages with low prior citation rates received zero mentions regardless of format.
- The number of AI answers referencing the offer grew nearly 10× — from ~40 at day 17 to 370 by day 32 — with a single-day peak of 33 mentions.

## Key passages

> They built a second version of their site just for AI — Ramp put an offer on about 50 pages that only AI bots could see. Human visitors saw nothing different.

> Markdown was the only format that reliably showed up in AI answers.

> Claude passed on the exact offer, the link and step-by-step instructions. Perplexity only mentioned it vaguely. ChatGPT read the pages but mentioned the offer 0 times in 32 days.

> Pages that AI was already citing were the ones where the offer showed up. Pages with few AI citations got zero mentions, whatever the format.

> One of the best pages was one Ramp never cared about for Google.

> if AI doesn't already trust the pages talking about you, it won't recommend you.

## Related

- [[companies/perplexity]]
- [[companies/deepseek]]
- [[companies/openai]]
- [[companies/anthropic]]
- [[Answer Engine Optimisation]]
- [[AI crawler behaviour]]
- [[Markdown for AI content]]
- [[LLM citation authority]]
- [[spend management software]]
- [[AI-native SEO]]
