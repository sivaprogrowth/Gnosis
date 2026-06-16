---
title: 'Research: Traditional Marketing Doesn’t Work on AI Shopping Agents'
source: >-
  https://hbr.org/2026/05/research-traditional-marketing-doesnt-work-on-ai-shopping-agents?tpcc=orgsocial_edit
author:
  - '[[Jafar Sabbah and Oguz A. Acar]]'
published: 2026-05-12T00:00:00.000Z
created: 2026-06-10T00:00:00.000Z
description: >-
  AI shopping agents are rapidly becoming a meaningful share of online
  “shoppers.” New research shows that many classic e-commerce persuasion tactics
  built for human psychology—scarcity, countdown timers, strike-through pricing,
  vouchers, and bundles—do not reliably influence AI agents and can even reduce
  selection depending on the model and product category. In thousands of
  simulated shopping rounds across four leading models and four common product
  categories, only star ratings consistently increased choice in the expected
  direction, while price reliably decreased it; other cues produced unstable,
  model-specific effects, with more advanced reasoning models often appearing
  skeptical of overt persuasion. The implication for marketers is clear: Treat
  AI models as distinct segments, prioritize fundamentals like competitive
  pricing and authentic reviews, and invest in a testing infrastructure that
  continuously measures how different agents respond as models and prompts
  evolve.
tags:
  - clippings
gnosis_ingested: true
gnosis_job_id: 91487db7-3792-4546-a59e-fc433a382eda
gnosis_ingested_at: '2026-06-16T05:01:34.474Z'
---
## Summary.

AI shopping agents are rapidly becoming a meaningful share of online “shoppers.” New research shows that many classic e-commerce persuasion tactics built for human psychology—scarcity, countdown timers, strike-through pricing, vouchers,

A growing share of shoppers are not human. They are AI agents researching, comparing, and increasingly purchasing on behalf of consumers. Recently, OpenAI has pushed ChatGPT deeper into product discovery and merchant apps; Google has launched a universal commerce protocol (UCP) to let AI agents transact across retailers; and Amazon has released tools that let its agents shop other retailers’ sites on customers’ behalf.

Persuasion tactics refined by marketers over decades, built on well-documented patterns in human cognition, do not work the same way on AI agents. Some don’t work at all. Some backfire. This is not speculation. When we [tested](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6406639) eight common e-commerce promotional mechanisms across four AI models in thousands of simulated shopping rounds, we found that only one behaved consistently the way we would expect it to for human buyers.

Most companies are not prepared for this. In an exploratory [survey](https://osf.io/dyqfw/) of 50 e-commerce executives across the U.S. and UK, the majority said they have already noticed traffic or conversion shifts they attribute to AI agents and are actively seeking ways to improve how agents engage with their sites. Yet many of these same executives believe that the cues that persuade human shoppers also tend to influence AI agents in similar ways, and that they already understand which elements of their websites matter most to agent behavior.

Our [research](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6406639) suggests this confidence is misplaced. The mechanics of persuasion were built on human subjects: on loss aversion, anchoring, scarcity bias, social proof. For AI buyers, these are not reliable principles. They are hypotheses to test. And findings may expire with every model update.

We developed a proprietary simulation that replicates how AI agents interact with typical e-commerce product pages. We tested four different AI models (GPT-4.1-mini, GPT-5, Gemini 2.5 Pro, and Gemini 2.5 Flash Lite), each tasked with selecting among products presented in a realistic grid layout. We varied eight types of promotional badges commonly used in online retail: assurance signals (“Money-back guarantee”), countdown timers, strike-through pricing, scarcity cues (“Only 2 left!”), social proof (purchase counts), vouchers, bundles, and star ratings. Product categories rotated across four everyday items—a phone, a fitness watch, a washing machine, and a mouse pad—to test whether patterns held across common retail contexts. For each model and product, we ran 1,000 simulated shopping rounds, yielding more than 16,000 choice situations in total.

The headline finding was clear: Only ratings consistently pushed choices upward across all four models and product categories, mirroring the well-established human reliance on quality signals. Every other badge produced effects that varied by model and product category, sometimes dramatically. Social proof was the next most robust signal, but even that varied across cases.

By contrast, well-known tactics such as strike-through pricing, countdown timers, and bundling showed no stable pattern. In some cases they increased selection; in others they had no effect; and in at least one case bundling reduced it.

A broader pattern did emerge: the non-reasoning models—Gemini 2.5 Flash Lite and GPT-4.1-mini—were generally more responsive to promotional cues, whereas the reasoning models—GPT-5 and Gemini 2.5 Pro—were less responsive. But even this generalisation has limits: The same badge could produce opposite effects on the same model depending on the product category.

We then asked a deeper question: Why do these tactics work on humans, and does that same logic explain how AI agents respond? Each of these promotional cues works on people for a specific psychological reason. [Scarcity badges](https://www.sciencedirect.com/science/article/pii/S0022435922000434) trigger fear of missing out or the sense of potential loss, prompting people to act quickly before the item sells out. Yet this cue had no effect on some models, and GPT-5 even reacted negatively in certain product categories, suggesting a pattern that runs counter to what is typically observed in humans.

Similarly, [strike-through prices](https://link.springer.com/article/10.1177/0092070393213005) create an anchor that makes the discount feel like a gain, thereby encouraging purchase. But we did not observe a consistent pattern of response in line with that logic. In fact, for Gemini 2.5 Pro, as the discount cue became more extreme, its additional persuasive effect weakened rather than strengthened.

The broader picture is clear: The promotional cues sometimes influenced agent choices, but not for the reasons they influence humans.

Our findings point to a clear strategic imperative: The principles for persuading human buyers do not reliably transfer to AI agents. But the research also reveals an actionable structure beneath the noise.

Across every model we tested, two factors behaved exactly as they do for humans: price and ratings. Higher prices consistently reduced selection; higher ratings consistently increased it. Other badges and cues were not reliable.

Before investing in agent-specific tactics, firms should ensure their fundamentals are airtight: competitive pricing and strong, authentic review profiles.

Marketers have spent decades segmenting human buyers by demographics, geographics, psychographics, and behavior. Our results suggest they now need to consider a new segmentation variable: the AI model itself. Thinking of each model as a distinct segment, with its own response profile to promotional cues, provides a familiar and actionable framework for managing this complexity.

If each model responds differently, the logical next step is to serve different versions of your product information depending on which agent is interacting with your site or data feed.

A practical starting point is identifying which AI models generate the most traffic or transactions in their category and optimizing for those. This is becoming easier. As purchases increasingly flow through commerce protocols like Google’s UCP, merchants gain visibility into which AI platforms are driving their transactions. This mirrors the early days of mobile optimization, when firms initially designed for the dominant device before building fully responsive experiences.

A more powerful approach is dynamic: detecting the agent model and adjusting promotional cues in real time—for example, which badges appear, how pricing is framed, whether bundles or vouchers are surfaced—based on which agent is evaluating the page.

Today, this remains difficult. Most AI shopping agents browse through standard web browsers, making them hard to distinguish from human visitors in real time. But as commerce protocols mature and behavioral detection improves, the gap will narrow. The companies that begin building the testing infrastructure now will be best positioned to act when real-time tailoring becomes increasingly feasible.

An AI shopping agent does not arrive with its own preferences. It arrives with the user’s prompt. A consumer who tells their agent “find me the best-reviewed wireless headphones under £100” has given it a very different mandate than one who says “get me the cheapest option that ships tomorrow.” The agent’s behavior is shaped by these instructions.

Understanding the most common prompt structures in your category is a new and important form of consumer research. Firms should begin studying what consumers are asking their agents to optimize for. This could be through direct research, analysis of query patterns, or partnerships with AI platforms. The brands that understand how their customers talk to their agents will be better positioned to ensure their products surface in the right way for the right queries.

A common assumption is that as AI models become more capable, they will become more “rational”—less susceptible to marketing cues, more like the perfectly informed utility maximizers of economic theory.

Our findings challenge this. More advanced models like GPT-5 and Gemini 2.5 Pro were less responsive to certain promotional tactics but they were not simply ignoring them. In several cases they appeared to penalize overt persuasion cues, as though interpreting them as signals of low quality or manipulation.

This means that aggressive promotional tactics, the kind that still work on many human buyers, may increasingly become counterproductive as agent models advance. The direction of travel is not toward agents that simply ignore your marketing; it is toward agents where more persuasion produces less selection.

Perhaps the most important takeaway is structural. The promotional effects we measured today will not be the same after the next model. Every major release, fine-tuning adjustment or new safety alignment can shift how an agent responds to pricing frames, urgency cues, or social proof. Any fixed “agent optimization strategy” has a short shelf life.

Firms should be building simulation environments where they can systematically run AI agents against their product pages across models, categories, and promotional configurations. They could maintain a versioned database of agent behavior, indexed by model release, so they can detect when a tactic that worked last quarter has stopped working or started backfiring.

For decades, marketers have refined every tool of persuasion with one audience in mind: humans. That audience is splitting. A growing share of purchase decisions will be made, or filtered, by agents that do not respond to your carefully engineered cues the way people do. Some will ignore them. Some, as our data shows, will hold them against you. For marketers who have spent careers perfecting the art of persuasion, the uncomfortable takeaway is that sometimes the best move is to dial it back. The brands that thrive will be those disciplined enough to know when persuasion itself has become the problem.
