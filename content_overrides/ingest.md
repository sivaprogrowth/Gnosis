---
title: Ingest
description: Ingest a URL into the wiki via the LLM pipeline. Drafts a source page, surfaces entities, lets you confirm before committing to wiki-archive.
hide: ["toc", "graph", "explorer", "backlinks", "title", "tags", "breadcrumb", "footer", "byline"]
---

<link rel="stylesheet" href="/library.css" />
<link rel="stylesheet" href="/ingest.css" />

<div class="lib-shell">
<aside class="lib-sidebar">
<div class="lib-brand">Gnosis</div>
<nav class="lib-nav">
<a href="/" data-icon="home">Home</a>
<a href="/library" data-icon="book">Book Library</a>
<a href="/ingest" class="active" data-icon="plus">Ingest</a>
<a href="/chat" data-icon="chat">Chat</a>
</nav>
<div class="lib-foot">
<a href="/api/auth/logout" id="logout-link">Sign out</a>
</div>
</aside>
<main class="lib-main">
<header class="lib-header">
<div>
<h1>Ingest a URL or PDF</h1>
<p class="lib-sub">Paste a URL, or drop a PDF. The pipeline drafts a source page, surfaces entities, and commits to wiki-archive after you confirm.</p>
</div>
</header>
<section class="ing-form" id="ing-form" data-active="url">
<div class="ing-tabs" role="tablist">
<button type="button" class="ing-tab active" data-tab="url" role="tab" aria-selected="true">URL</button>
<button type="button" class="ing-tab" data-tab="pdf" role="tab" aria-selected="false">PDF upload</button>
</div>
<form id="ing-url-form" class="ing-tab-panel" data-panel="url">
<label for="ing-url">URL</label>
<input id="ing-url" type="url" placeholder="https://paulgraham.com/lies.html" autocomplete="off" />
<button type="submit" id="ing-submit" class="lib-btn">Start ingest</button>
</form>
<form id="ing-pdf-form" class="ing-tab-panel" data-panel="pdf" hidden>
<label>PDF file</label>
<div id="ing-drop" class="ing-drop">
<input id="ing-pdf-input" type="file" accept="application/pdf,.pdf" hidden />
<div class="ing-drop-inner">
<p class="ing-drop-prompt">Drop a PDF here or <button type="button" id="ing-pdf-pick" class="ing-link">choose file</button></p>
<p class="ing-hint">Max 50 MB. Files over ~3 MB upload via Vercel Blob (direct browser → storage; no extra setup). Scanned/image-only PDFs aren't supported (OCR comes later).</p>
<p id="ing-pdf-chosen" class="ing-pdf-chosen" hidden></p>
</div>
</div>
<button type="submit" id="ing-pdf-submit" class="lib-btn" disabled>Start ingest</button>
</form>
</section>
<section class="ing-progress" id="ing-progress" hidden>
<h2>Pipeline</h2>
<ol class="ing-stages" id="ing-stages"></ol>
<div class="ing-log" id="ing-log"></div>
</section>
<section class="ing-confirm" id="ing-confirm" hidden>
<h2>Ready to commit</h2>
<div class="ing-summary" id="ing-summary"></div>
<h3>Takeaways</h3>
<ul class="ing-takeaways" id="ing-takeaways"></ul>
<h3>Entity decisions</h3>
<div class="ing-entities" id="ing-entities"></div>
<div class="ing-actions">
<button type="button" id="ing-proceed" class="lib-btn">Proceed and commit</button>
<button type="button" id="ing-cancel" class="lib-btn lib-btn-ghost">Cancel</button>
</div>
</section>
<section class="ing-result" id="ing-result" hidden>
<h2>Committed</h2>
<div id="ing-result-body"></div>
<button type="button" id="ing-reset" class="lib-btn">Ingest another</button>
</section>
<div id="ing-error" class="lib-err" hidden></div>
</main>
</div>

<script src="/ingest.js"></script>
