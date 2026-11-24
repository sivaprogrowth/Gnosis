---
type: source
source_type: article
title: 'Welcome to the B2A Economy: How Agents Buy'
source_url: 'https://www.a16z.news/p/welcome-to-the-b2a-economy-how-agents'
accessed: '2026-11-13'
tags:
  - ai-agents
  - b2a-economy
  - ecommerce
  - go-to-market
  - agentic-ai
---

## Abstract

This article, published by [[andreessen-horowitz|Andreessen Horowitz]] (a16z), reports findings from more than 11,307 completed agent runs across four consumer AI shopping agents — Muse, Instinct, Grok Bot, and Dots — conducted in partnership with The Prompting Company. It argues that a new "B2A" (Business-to-Agent) economy is emerging in which AI agents increasingly make or heavily influence purchasing decisions on behalf of human users, covering both physical products and software. The piece identifies five empirically grounded strategies for businesses seeking to attract agents as customers: specialising for targeted use cases, optimising for agent crawlers, communicating value transparently, tailoring marketing to individual agent preferences, and ensuring presence on the aggregators and marketplaces where agents already transact. Supporting evidence is drawn from YipitData consumer-spending card-panel data showing where agent-facilitated purchases are already occurring.

## TL;DR

- Agents narrow product searches to a small shortlist (often ≤50 options) and decide primarily on price and reviews, so winning on broad terms is hard — specialising for specific use cases flips default picks dramatically.
- Agent-readable websites, transparent pricing, guest checkout, and API/MCP availability are now direct conversion factors; friction anywhere in the funnel causes agents to route spend to competitors.
- Nearly one-third of observed agent spend flows through marketplaces and aggregators, and partnerships between agents and platforms (Shopify Catalog, Stripe Link, OpenAI Businesses in ChatGPT) are accelerating this concentration.

## Key claims

- Across four agents (Muse, Instinct, Grok Bot, Dots), a product recommended by one had a 73% chance of being recommended by at least one other; in ~25% of cases all four picked the same top product.
- Muse's search starts from its own Meta Commerce Manager catalog of up to 50 products, and when it uses browser search it visits only ~3 product pages on average — the total candidate set across agents is similarly small.
- Specifying a targeted user need (e.g. "fine hair," "daily use") can flip agent decisions dramatically — Dyson won 51–88% of runs when nuanced hair needs were stated, versus losing 91% of runs on a bare price comparison with the Shark FlexStyle.
- Agents are ruthless price calculators, factoring in shipping, return windows, refund methods, and warranties — if two retailers match on price, the one with better return policy wins in 86% of tests.
- Trust and brand signals act as a floor: across 275 real-store comparisons, agents recommended the more trusted (but pricier) option 72% of the time, and discounts above 50% actually caused agents to avoid a listing.
- Having an accessible API and MCP integration is a decisive selection factor for software: Ideogram was chosen over Midjourney specifically because it exposed a clear API and MCP path, while Midjourney's policies prohibited automated usage.
- Guest checkout is a hard requirement for agent-driven conversions: 100% of runs on stores requiring a logged-in account stopped early, and agents sometimes redirected to alternative merchants rather than waiting for credentials.
- [[shopify|Shopify]] Catalog with Shop Pay, Stripe Link wallets, and OpenAI's ChatGPT Wallet are emerging as the dominant agent payment rails, enabling purchases without exposing underlying card details.

## Key passages

> "The best way to get into an agent's research set (and to ultimately be chosen) is to prove your product's superiority for more targeted use cases or personas."

> "Unlike humans, agents are ruthless optimizers. They will calculate the fully loaded cost of a product - including shipping fees, subscription term options, return or refund policies, and even warranties."

> "If a product is offered by two retailers at the same price, agents chose the retailer with the better return policy (free returns, longer return window, refund to original payment method) in 86% of tests."

> "Every run on a store that required a logged-in account stopped early in the purchase process - sometimes to ask for the user's credentials, but sometimes to move to another merchant."

> "Nearly one-third of observed spend among the top 50 merchants by agent spend went to marketplaces and aggregators. This rises to 46% if you include retailers that operate third-party marketplaces, and 55% if you include conventional multi-brand retailers."

> "Muse and Walmart are launching an agent-to-agent communication channel, while ChatGPT recently removed a claim that OpenAI partnerships would not impact product recommendations."

## Related

- [[andreessen-horowitz]]
- [[companies/openai]]
- [[companies/meta]]
- [[companies/shopify]]
- [[companies/perplexity]]
- [[companies/google]]
- [[companies/nvidia]]
- B2A Economy
- Agentic Commerce
- MCP (Model Context Protocol)
- Stripe Link
- The Prompting Company
- YipitData
- Muse (Meta AI agent)
- Grok Bot
- Instinct
- Dots (OpenAI agent)
- Ideogram
- Midjourney
- Quince
- Porkbun
- Expedia
- Exa
