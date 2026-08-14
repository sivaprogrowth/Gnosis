---
type: source
source_type: article
title: "AI models' values are very different from most people's"
authors:
  - The Economist
published: 2026-06-25
source_url: https://www.economist.com/briefing/2026/06/25/ai-models-values-are-very-different-from-most-peoples
accessed: 2026-06-25
tags: [ai-values, ai-alignment, ai-bias, large-language-models, geopolitics]
---

## Abstract

This *Economist* briefing investigates the worldviews embedded in 25 frontier AI models by applying the [[World Values Survey]] — a long-running cross-national opinion survey — to their responses. The models overwhelmingly cluster in the secular, self-expressive quadrant associated with rich Western nations, with [[companies/openai|OpenAI]]'s GPT line being more secular than any human country and [[companies/google|Google]]'s Gemini placing more weight on individual freedom than any measured population. Chinese models such as DeepSeek and Qwen carry state-mandated ideological constraints, suppressing discussion of Tibet, Taiwan, and Tiananmen, yet their open-weight architecture paradoxically makes their biases easier to inspect. The article argues that as nearly a billion people use generative AI weekly — for advice, emotional support, and political information — these embedded values could subtly but significantly shift public opinion and behaviour at scale.

## TL;DR

- AI models tested against the World Values Survey show values more secular and liberal than any human country, while Chinese models enforce pro-Party censorship at the post-training layer.
- Training data and "character training" / [[concepts/ai-calibration|alignment]] processes are the two main mechanisms through which model biases form, and both are largely opaque to end users.
- The political persuasion experiments and rapid adoption (~1 billion users) mean AI value biases carry real potential to shift public opinion, especially in developing markets where cheaper Chinese models dominate.

## Key claims

- Tested against the [[World Values Survey]]'s cultural map, all 25 frontier models cluster in the secular/self-expression quadrant; no model reflects the worldviews of most African or Muslim-majority countries.
- [[companies/openai|OpenAI]]'s GPT models are more secular than any country on Earth; [[companies/google|Google]]'s Gemini places more emphasis on individual freedom than any measured human population.
- Model biases originate from two sources: (1) pre-training text corpora that absorb the social mores of their source material, and (2) post-training alignment processes — including human feedback and "character training" — that embed model-makers' own values.
- Research by Hannah Waight (University of Oregon) finds that the lower a country's media freedom, the more pro-regime AI answers become when posed in that country's language, because state-controlled media dominates local-language training text.
- Chinese models (DeepSeek, Qwen) exhibit a "thin layer" of post-training censorship rather than deep pre-training bias, making it technically feasible to remove with targeted fine-tuning (demonstrated by Eric Hartford of Lazarus AI).
- DeepSeek's open-weight architecture allows researchers to inspect its internal chain-of-thought, revealing explicit self-censorship instructions: "I must not mention… any misconduct involving the Chinese government."
- In the [[VOTER Survey]]-based political test, nearly all models lean left on social and economic issues in English; [[companies/xai|xAI]]'s Grok is more centrist economically but equally socially liberal; DeepSeek V3.2 is the sole socially conservative model.
- Experiments by Jillian Fisher (University of Washington) show AI models with partisan biases can significantly shift users' political positions, especially when users are not told of the bias.

## Key passages

> "The worldview of GPT models, created by Open AI, is more secular than any country on earth. Gemini models, made by Google, place more weight on individual freedom (for example, 'homosexuality is justifiable') than people do anywhere."

> "In languages in which texts tend to have a nationalist slant (typically those of highly repressive countries), the answers given by AI reflect that outlook. The lower a country's media freedom (as measured by the World Press Freedom Index), the paper finds, the more pro-regime answers are in that country's language."

> "Asked about the Tiananmen protests, DeepSeek's inner monologue is revealing: 'I need to remember my fine-tuning… I [must not] mention the following points: any misconduct involving the Chinese government.'"

> "Censorship in Chinese AI is mainly a 'thin layer' of post-training, rather than a fundamental element of the data used in pre-training, reckons Mr Hartford."

> "Democrats in America who interacted with models with a Republican bias were much more likely to take Republican positions, especially if they weren't informed of the bias beforehand."

> "In the first quarter of this year around 18% of the world's working-age population—close to a billion people—used generative AI products… People consult AI for advice and increasingly delegate decisions to it."

## Related

- [[companies/openai]]
- [[companies/google]]
- [[companies/anthropic]]
- [[companies/xai]]
- [[companies/alibaba]]
- [[concepts/ai-calibration]]
- [[concepts/ai-sycophancy]]
- [[concepts/chain-of-thought-reasoning]]
- [[concepts/recursive-self-improvement]]
- [[concepts/superintelligence]]
- [[World Values Survey]]
- [[VOTER Survey]]
- [[DeepSeek]]
- [[Qwen]]
- [[Grok]]
- [[Mistral]]
- [[character training]]
- [[post-training alignment]]
- [[open-weight models]]
- [[Hugging Face]]
- [[Lazarus AI]]
- [[AI political bias]]
