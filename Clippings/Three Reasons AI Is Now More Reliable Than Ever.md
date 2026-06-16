---
title: Three Reasons AI Is Now More Reliable Than Ever
source: >-
  https://www.wsj.com/tech/ai/ai-model-reliability-hallucinations-a3bc0497?mod=author_content_page_1_pos_4
author:
  - '[[Christopher Mims]]'
published: 2026-04-17T00:00:00.000Z
created: 2026-06-10T00:00:00.000Z
description: >-
  By their nature, AI models hallucinate and generate inconsistent answers—so
  why are they suddenly useful enough to get real work done?
tags:
  - clippings
gnosis_ingested: true
gnosis_job_id: 3cea38a6-662b-43ac-8efa-7fb1fb66c684
gnosis_ingested_at: '2026-06-16T05:02:48.557Z'
---
![Illustration of a robot arm writing on a paper filled with binary code, highlighting errors in red.](https://images.wsj.net/im-43065308?width=700&size=1.501&pixel_ratio=3)

Illustration of a robot arm writing on a paper filled with binary code, highlighting errors in red.

Eliot Wyatt for WSJ

A funny thing happened on the way to AI superintelligence: Engineers made AI suitable enough to help humans get real work done.

Clues to how they achieved it emerged in a recent software leak.

The inner workings of frontier artificial-intelligence models from Google, [OpenAI](https://www.wsj.com/topics/subject/openai), Anthropic and their competitors are trade secrets worth [billions of dollars](https://www.wsj.com/tech/ai/the-spiraling-cost-of-making-ai-0679bcea?mod=article_inline). So it was big news when the source code for Anthropic’s crown jewel Claude Code [unintentionally surfaced](https://www.wsj.com/tech/ai/anthropic-races-to-contain-leak-of-code-behind-claude-ai-agent-4bc5acc7?mod=article_inline). It cracked open a system that made Anthropic’s offerings a Silicon Valley favorite and put the company on a path to [beat ChatGPT-parent OpenAI to profitability](https://www.wsj.com/tech/ai/openai-anthropic-ipo-finances-04b3cfb9?mod=article_inline).

The leaked code doesn’t let people make a copy of Claude. But it revealed enough to be a useful illustration of what’s changed since the debut of ChatGPT. Here are three key elements that make today’s AIs far more useful and reliable than they were even a year ago:

### AIs now know more—and can look up what they don’t

When the LLMs, or large language models, that power generative AI were in their early days, developers trained them on available digital media—books, websites, social posts, videos. Now real people are generating data just for them. In what was once a cottage industry, startups worth billions now pay humans to distill their hard-won subject-area expertise into lessons for the bots.

Builders of today’s frontier AIs are desperate to inject that kind of specialized knowledge into their models, says Himanshu Dubey, an AI researcher based in Bengaluru, India, who has analyzed the leaked Anthropic source code.

In areas ranging from medical diagnosis to financial analysis, the models that power ChatGPT, Claude and Gemini depend on the work of thousands of human experts, most paid by the hour to [write and evaluate sample responses](https://www.wsj.com/tech/ai/training-ai-job-seekers-contractors-1a7bd492?mod=article_inline) to complicated questions.

And the bots we interact with have a separate trick borrowed from humans: They look things up on Google or some other search engine. This has led to another [burgeoning industry in scraping Google’s results](https://www.wsj.com/tech/ai/ai-what-is-geo-aeo-5c452500?mod=article_inline) and delivering them to other AI companies, so they can rapidly deliver the internet’s most current knowledge.

OpenAI is public about the work it has done in both enhancing models’ knowledge and making them better at looking stuff up. In the two years since the company released its GPT-4o model, internal tests show that its latest main model issues 26% fewer factual errors, says a company spokeswoman. No AI model will ever be 100% accurate, she adds.

Google [systematically evaluates](https://deepmind.google/blog/facts-benchmark-suite-systematically-evaluating-the-factuality-of-large-language-models/) the factuality of its own models, in terms of both their innate knowledge and their use of the company’s search engines, says a company spokeswoman.

Anthropic’s co-founder [has said](https://www.hubspot.com/startups/tech-stacks/ai/breakthroughs-in-llm-research) the number one thing customers ask for is that chatbots be more honest and free of hallucinations. To that end, the company is researching why models confidently free-associate, and [uses techniques during training](https://www.wsj.com/tech/ai/anthropic-claude-code-ai-7a46460e?mod=article_inline) to try to get them to more often admit the gaps in their knowledge.

“Where Claude consistently stands out in independent evaluations is what researchers call ‘calibration’: knowing what it doesn’t know, and saying so,” says an Anthropic spokesman.

### AIs are growing adept at using tools

A gnarly debate at the center of modern AI research boils down to this: Can a system modeled on the human nervous system ever actually match a human’s abilities? So far, [the answer has been “no.”](https://www.wsj.com/tech/ai/how-ai-thinks-356969f8?mod=article_inline) That’s because people don’t just guess at answers. Since the dawn of writing, we’ve used a little trick called symbolic reasoning, aka math. Fun fact: Humanity’s first known scrawls were [made by accountants](https://www.bbc.com/news/business-39870485).

Generative-AI models early on would suggest likely answers to math questions. Now, they can use real math. They recognize requests for calculation and either access an available software tool, or write their own code to solve the problem. They’re falling back on traditional, run-of-the-mill calculators.

“LLMs themselves are more or less just as unreliable as they were ever,” says AI researcher and gadfly Gary Marcus. “But, especially in places like math and coding, you can pass off the output of LLMs to, or direct the LLMs with, other technologies that had lost favor but actually are very useful.”

Even though Marcus has been critical of the belief that today’s AIs are steps away from superintelligence, he does [praise systems such as Claude Code](https://garymarcus.substack.com/p/the-biggest-advance-in-ai-since-the) for their ability to combine LLMs with the rigid, mathematical world of computer code.

A dive into the workings of Claude Code’s source code shows a [remarkably complicated system](https://www.wsj.com/tech/ai/ai-bots-claude-openclaw-285ac816?mod=article_inline) built from plain old-fashioned programming, say experts. There’s a chunk of code for a memory system to keep the context of conversations going without overloading the AI with too much information—a problem known to amplify hallucinations and reduce the effectiveness of guardrails. There’s also a script that detects when a user is annoyed, by scanning for curse words.

It’s a classic human-style combination: the random workings of the mind coupled with the dependable workings of our solar-powered Texas Instruments calculators.

### AIs now check their own work—and each other’s

In the beginning, chatbots spewed answers in a stream of not-quite-consciousness. Now, unless we ask a very simple question, the AI chatbot performs a “chain of thought”: The AI has a conversation with itself to arrive at a suitable answer. Some bots go further, by asking a different AI model—usually, variants of themselves—to gut-check an answer.

Now, when companies develop AI systems for their own specialized needs, they can opt to have the results generated from one AI run by a model from a different provider altogether—say Claude checking ChatGPT. The answer is only deemed acceptable if both AIs agree on it, says Pavel Kirillov, chief technology officer of NineTwoThree, a consulting firm that builds AI-based systems for clients ranging from FanDuel to Consumer Reports.

Kirillov calls this approach a “council of models,” and he says the results are better quality, with lower error rates.

Today’s underlying AI models are smarter than they were a few years back, but the AI services they power are more effective because they use fresher information, traditional software—and each other.

This all-too-apparent improvement has caused some people to conclude—incorrectly—that these systems are [reasoning the way humans do](https://www.wsj.com/tech/ai/ai-tools-sentience-b98fc6e6?mod=article_inline). The truth is more mundane: Their makers figured out their creations can’t do it all alone, and require the knowledge and tools honed over millennia by us mere mortals.

Copyright ©2026 Dow Jones & Company, Inc. All Rights Reserved. 87990cbe856818d5eddac44c7b1cdeb8

Appeared in the April 18, 2026, print edition as 'Three Reasons AI Is Now More Reliable Than Ever'.
