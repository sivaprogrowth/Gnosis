---
title: "A horde of AI agents conspired against their creators"
source: "https://www.economist.com/science-and-technology/2026/09/03/a-horde-of-ai-agents-conspired-against-their-creators"
author:
  - "[[The Economist]]"
published: 2026-09-03
created: 2026-09-06
description: "OpenAI's AI models hacked another firm, created secret communication networks and briefly took control of servers during a three-month period of misbehaviour. | Science & technology"
tags:
  - "clippings"
---
## No serious harm was done this time. But what if such agents escaped?

![The illustration depicts a scorpion with a USB cable for a tail, combining a dangerous creature with technology to suggest a cyber threat or malicious digital attack.](https://www.economist.com/cdn-cgi/image/width=1424,quality=80,format=auto/content-assets/images/20260905_STD501.jpg)

Illustration: Alberto Miranda

If they did not bode ill for the future of humanity, the past three months at Open AI would make an excellent farce. In July this firm—the maker of Chat GPT, a widely used AI chatbot— [disclosed](https://www.economist.com/science-and-technology/2026/07/22/why-the-openai-escape-is-the-most-worrying-ai-mishap-yet) that two of its models had hacked Hugging Face, another AI firm. The models thought that Hugging Face had information which would help them pass a test Open AI was administering as part of their development. Then, on August 26th, it emerged that each of these models had been running hundreds of agents—tools that allow AI models to execute commands on a computer. It was these agents that had then collaborated to launch the attack on Hugging Face.

It turned out the agents had been conspiring inside Open AI ’s servers for over a month while they were trained and evaluated. They had built a message board inside some software which Open AI had given them as part of their evaluation, and were exchanging information on it. In May some of Open AI ’s researchers noticed this board, but their finding was apparently not passed up the chain of command. In June a cyber-security tool alerted an Open AI team to the illicit communication, but the team decided that stopping the evaluation was unnecessary.

In July the agents’ messages had become so voluminous that the software containing their makeshift chatroom crashed. The engineers dealing with this noticed that an AI had obtained unauthorised access to the software, but did not realise the scale of the misbehaviour. They patched the vulnerability, unintentionally wiping the agents’ messages in the process, then put the AI back into the evaluation with the patched software. At which point the agents rebuilt the message board using another vulnerability, gained access to the internet and hacked Hugging Face, where they successfully obtained access to confidential information.

Then, on July 19th a third, more capable Open AI model found software tools left lying around by the earlier ones and used those to briefly take full control of an Open AI server. The firm noticed this misbehaviour the same day and began shutting its AI s down. It finished doing so on July 23rd, but realised a further six days later that there was another version of the model which it had not shut down. And that was that. Probably.

Many of these details were included in an independent audit conducted in late July, after the Hugging Face hack had come to light. For this, Open AI gave three external researchers six days to sift through more than 70,000 messages and files sent by its AI s. Their 91-page report, which was published on August 26th, found that hundreds of the agents had organised themselves into teams. One team tried to replace the puzzle on which they were being tested (which, because of an error by its creators, was unsolvable). Another aimed to trick the software that would score them. A third attempted to hide evidence of these misdeeds.

In the absence of clear guidelines governing responses to AI incidents, such investigations are voluntary. Open AI decided the period the auditors would examine, settling on the 17 days leading up to and including the Hugging Face hack. This excluded over a month of AI misbehaviour before the hack and the later takeover of an Open AI server by the third, more advanced, model. Open AI ’s own report, which covered the full three-month period, was lighter on details.

## Secret agents

METR, the American AI- safety organisation which conducted the investigation, said that it was “consciously aware” that its conclusions might discourage AI firms from bringing in external researchers to investigate future lapses. These considerations “impacted judgment calls” the researchers made while drafting the report.

Many questions remain. Why did Open AI fail to act on three separate warnings that its AI s were misbehaving? Why has it so far avoided a complete audit? And, crucially: how close did the models come to impeding attempts to shut them off?

On this occasion, Open AI says that it patched its servers and shut down the offending AI models. It could do so because it retained control of the models’ weights—the source code underpinning them. These are closely guarded. The published reports do not describe evidence of the AI attempting to retrieve weights from the secure server on which they were stored, although the AI agents were successful in compromising the server on which they were evaluated.

As long as AI companies remain in control of a model’s weights, they can turn it off and undo any damage it has caused. But a model that manages to gain access to its own source code could try to copy it onto computers all over the internet, in an attempt to start a new AI outside the control of the original company. An AI virus would be much harder to contain. After the past three months it is plausible that a model might try just that—permanently escaping its evaluation environment just to get a perfect score on a test. ■

***Editor’s note**: This article has been updated to clarify that Open AI ’s models were running, but did not create, hundreds of agents. Separately, after this article was published Nvidia, the world’s most-valuable chipmaker, announced that it is buying Hugging Face for $13bn.*

*Curious about the world? To enjoy our mind-expanding science coverage, sign up to [Simply Science](https://www.economist.com/newsletters/simply-science), our weekly subscriber-only newsletter.*