---
title: 'Large Language Models Get All the Hype, but Small Models Do the Real Work'
source: >-
  https://www.wsj.com/tech/ai/large-language-models-get-all-the-hype-but-small-models-do-the-real-work-225d3145?mod=Searchresults&pos=10&page=1
author:
  - '[[Christopher Mims]]'
published: 2025-10-31T00:00:00.000Z
created: 2026-08-09T00:00:00.000Z
description: >-
  For many tasks in corporate America, it’s not the biggest and smartest AI
  models, but the smaller, more simplistic ones that are winning the day
tags:
  - clippings
gnosis_ingested: true
gnosis_job_id: 320ba379-1aac-4841-b99d-1c7fcfa19401
gnosis_ingested_at: '2026-08-10T08:12:02.150Z'
---
![Animated illustration of a robot head moving down a conveyor belt, then a lightbulb moving down the conveyor belt.](https://images.wsj.net/im-17071498?width=700&size=1.501&pixel_ratio=3)

Animated illustration of a robot head moving down a conveyor belt, then a lightbulb moving down the conveyor belt.

Jarred Briggs

There’s a paradox at the heart of modern AI: The kinds of sophisticated models that companies are using to get real work done and [reduce head count](https://www.wsj.com/economy/jobs/white-collar-jobs-ai-324b749c?mod=article_inline) aren’t the ones [getting all the attention](https://www.wsj.com/tech/ai/openai-microsoft-rift-hinges-on-how-smart-ai-can-get-82566509?mod=article_inline).

Ever-more-powerful frontier and reasoning models continue to nab headlines for smashing cognitive records. They’re passing legal and medical licensing exams, and [winning math olympiads](https://deepmind.google/discover/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/). Leaders of major artificial-intelligence labs—from [OpenAI](https://www.wsj.com/topics/subject/openai) ’s Sam Altman and Anthropic’s Dario Amodei to Demis Hassabis of Google-owned DeepMind and Elon Musk at xAI—talk about a future of “AGI,” artificial general intelligence, in which AIs are as smart as humans.

Supposedly, these AI megabrains are the ones [coming for all our jobs](https://www.wsj.com/economy/jobs/ai-entry-level-job-impact-5c687c84?mod=article_inline).

But when you talk to chief executives at companies that currently rely on AI day in and day out, you hear a different story. For the overwhelming majority of tasks, it’s not the biggest and smartest AI models, but the most simplistic that are winning the day. These unsung heroes of AI, the ones actually transforming business processes and workforces, also happen to be the smallest, fastest and cheapest.

“The reality is, for many of the operations that we need computing for today, we don’t need large language models,” says Kyle Lo, a research scientist who builds open-source large language models at the nonprofit Allen Institute for AI.

AI-powered companies have found success by building their software and services more like an assembly line of AI: Information goes in one end, and data, actions or products come out the other. In between, many smaller, simpler, more specialized, faster and cheaper-to-operate AIs are doing all the work.

Companies that need to get real work done with so-called AI agents, on a large scale, are finding that “small language models” are more than good enough to power them. What’s more, companies are realizing that they have no choice but to use these small language models, because they are more affordable, and in some cases better suited to the tasks at hand.

This is how the future of agentic AI is being built, one workflow at a time.

### Building the AI factory

It might look like AI-powered systems are becoming more capable because the underlying AI models are becoming smarter. The biggest AI models certainly are advancing.

In many cases, though, the truth about corporate productivity gains is that the impact AI is having—on competitiveness, jobs and the like—is the result of human engineers getting better at stitching together smaller, simpler AIs.

Aurelian is a Seattle-based startup that uses generative AI to automate responses to nonemergency calls to 911 centers. New York City-based Hark Audio uses AI to identify, clip and collect memorable moments from the world’s half a million or so active podcasts. In San Francisco, Gong uses AI to scan and digest every call its customers’ sales reps have ever recorded, to help them sell more. And [Airbnb](https://www.wsj.com/market-data/quotes/ABNB) [ABNB 17.43%increase; up pointing triangle](https://www.wsj.com/market-data/quotes/ABNB) uses AI—including open-source models from China’s Alibaba—to automatically resolve a significant portion of customer-service issues faster than its human representatives can.

![Diagram showing the flow for user queries using Alibaba Cloud's Qwen AI large language model.](https://images.wsj.net/im-61013965?width=700&size=1.501&pixel_ratio=3)

Diagram showing the flow for user queries using Alibaba Cloud's Qwen AI large language model.

A diagram of how user queries use a large language model AI developed by Alibaba Group’s cloud unit. Samsul Said/Bloomberg News

Even [Meta](https://www.wsj.com/market-data/quotes/META) [META 0.37%increase; up pointing triangle](https://www.wsj.com/market-data/quotes/META) uses small AI models in this way. In its most recent earnings call, finance chief Susan Li said that when it comes to delivering ads, the company doesn’t use its biggest AI models, “because their size and complexity makes it too cost prohibitive.” Instead, Meta uses its big models to transfer the requisite knowledge about targeting ads to smaller, more lightweight, specialized models that are used in production.

What all these companies have in common is that they have built internal knowledge factories that daisy chain together small, simple, fast AIs.

In a factory, widgets travel down a conveyor belt, and workers tweak those widgets along the way. In what you might call an AI knowledge factory, chunks of data flow through pipelines of conventional software and are handed from one simple-minded AI to the next, with each one altering, sorting or transforming it.

In this analogy, the conveyor belt is made of conventional software—those tried-and-true existing pathways for data, which many companies have built up over years, or even decades. And the workers along the conveyor belt are AI tools powered by small language models.

As a group of researchers from [Nvidia](https://www.wsj.com/market-data/quotes/NVDA) and the Georgia Institute of Technology wrote in a [recent paper](https://arxiv.org/pdf/2506.02153), the rise of AI agents (like our assembly line workers) is “ushering in a mass of applications in which language models perform a small number of specialized tasks repetitively and with little variation.”

Small language models, they wrote, are “sufficiently powerful, inherently more suitable, and necessarily more economical” for such work.

### AI in action

Gong, which helps its clients sell more stuff, is an illustrative example. Company co-founder Eilon Reshef says its customers—which include Google and Cisco—might ask its conversational AI questions like, “Why am I losing deals?”

To answer, Gong uses a mix of costlier, more advanced AI tools and smaller, less expensive ones. Its systems assign tougher tasks to more advanced models. Think of it like a manager delegating tasks to workers with different degrees of expertise.

Gong’s software typically starts by sending the user’s question—in this case, “Why are my sales declining?”—to one of the “smart” AI models from the likes of Anthropic or OpenAI.

The initial prompt includes a request for the AI to come up with a broad plan to answer the question. Because those smart models are expensive—and take longer to “think” about questions—Gong uses them as little as possible.

Once a frontier reasoning model, the largest of the large language models, spits out a high-level plan, Gong’s software pipeline springs to life. First, it combs through what can be tens of thousands of recorded sales calls with customers. Then Gong uses smaller language models to summarize the conversations surfaced by that search. Next, yet another language model can scan those summaries.

At the end of this process, all of this data is handed back to one of the smart, slow, expensive frontier AIs, which transforms it into a report. This report outlines, in a way that would normally require hundreds of hours of work by a smart human, what’s working and what isn’t, across all the sales calls a company is having.

“You might use the cheapest LLM to find out if a conversation is relevant, a reasonably cheap LLM to find the right information inside it, and then maybe a more-expensive frontier model to come up with the action document,” says Reshef.

### Faster, cheaper AI

The difference in cost between the biggest and most sophisticated models and the smallest and cheapest is huge. Using an industry-standard weighted average, OpenAI’s smallest, fastest model, GPT-5 Nano, costs around 10 cents per million tokens, while the full-fledged, more sophisticated GPT-5 [costs around $3.44 per million tokens](https://www.wsj.com/tech/ai/ai-costs-expensive-startups-4c214f59?mod=article_inline). Tokens are the basic units of text that AI processes.

What’s more, big models can sometimes use *thousands* of times as many tokens to complete a task, as they burn through them in an internal monologue they use to reason through an answer.

![Chris Cox on stage presenting Llama 4 Scout, Maverick, and Behemoth at LlamaCon 2025.](https://images.wsj.net/im-23499417?width=700&size=1.501&pixel_ratio=3)

Chris Cox on stage presenting Llama 4 Scout, Maverick, and Behemoth at LlamaCon 2025.

Meta Chief Product Officer Chris Cox speaking at an AI developer conference in April. Meta employs small AI models in its ad delivery. Jeff Chiu/AP

It’s important to note that when it comes to AI models, “smallest and least smart” doesn’t mean least capable. Indeed, small models can be tuned—either as part of their training process or, increasingly, through elaborate prompts—to behave in a way that is specialized for the task at hand.

“The giant LLM models are incredibly smart, but they don’t offer us an efficient way to leverage our unique proprietary data, or a way to incorporate feedback from our editors,” says Don MacKinnon, chief executive of Hark Audio. The team at Hark has spent years creating a library of tens of thousands of clips of podcasts selected and edited by humans, which the company’s engineers used to fine-tune a customized AI that can now automate that entire process.

Across all the companies I’ve spoken with about their use of small models, there is a remarkable consistency in how they structure their systems. This suggests that there are only so many ways to build AI agents that actually, consistently work—and that nearly all of them include small language models.

Copyright ©2026 Dow Jones & Company, Inc. All Rights Reserved. 87990cbe856818d5eddac44c7b1cdeb8

Appeared in the November 1, 2025, print edition as 'Large Language Models Get the Hype. Small Models Do the Real Work.'.
